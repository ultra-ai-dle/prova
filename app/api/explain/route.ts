import { NextRequest } from "next/server";
import { RawTraceStep, AnnotatedStep } from "@/types/prova";
import { buildChain, callWithFallback } from "@/lib/ai-providers";

// ── Constants ─────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 8;

// ── Delta compression ─────────────────────────────────────────────────────────

type SlimStep = {
  idx: number;
  line: number;
  delta: Record<string, unknown>;
  err?: { type: string; message: string } | null;
};

function buildDelta(
  curr: Record<string, unknown>,
  prev: Record<string, unknown>
): Record<string, unknown> {
  const delta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(curr)) {
    if (JSON.stringify(v) !== JSON.stringify(prev[k])) delta[k] = v;
  }
  return delta;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(
  slim: SlimStep[],
  ctx: { algorithm: string; strategy: string }
): string {
  return [
    `Python 알고리즘 디버거 스텝 설명기.`,
    `algorithm: ${ctx.algorithm}, strategy: ${ctx.strategy}`,
    ``,
    `아래 스텝 배열과 같은 길이의 JSON 배열을 반환.`,
    `각 항목: {"explanation":"1~2문장 한국어 설명","visual_actions":["..."],"aiError":null}`,
    `visual_actions 허용값(복수 선택): highlight, updateLinear, focusGrid, updateGraph, push, pop, visit, compare, swap, markError, pause`,
    `runtimeError(err 필드)가 있는 스텝은 aiError: {"root_cause":"...","fix_hint":"..."}로 채울 것.`,
    ``,
    `스텝:`,
    JSON.stringify(slim)
  ].join("\n");
}

// ── Response parsing ──────────────────────────────────────────────────────────

function stripFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
}

function extractJsonArray(text: string): unknown[] | null {
  const cleaned = stripFence(text);
  // Direct array
  const start = cleaned.indexOf("[");
  if (start >= 0) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inStr) { esc = !esc && ch === "\\"; if (!esc && ch === '"') inStr = false; continue; }
      if (ch === '"') { inStr = true; continue; }
      if (ch === "[") depth++;
      if (ch === "]") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(cleaned.slice(start, i + 1)) as unknown[]; } catch { return null; }
        }
      }
    }
  }
  // Wrapped in object {"steps":[...]} etc.
  const objStart = cleaned.indexOf("{");
  if (objStart >= 0) {
    try {
      const obj = JSON.parse(cleaned.slice(objStart)) as Record<string, unknown>;
      for (const v of Object.values(obj)) {
        if (Array.isArray(v)) return v;
      }
    } catch { /* fall through */ }
  }
  return null;
}

function parseAnnotatedSteps(raw: string, count: number): AnnotatedStep[] | null {
  const arr = extractJsonArray(raw);
  if (!arr || arr.length !== count) return null;
  return arr.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      explanation: typeof o.explanation === "string" ? o.explanation : "—",
      visual_actions: Array.isArray(o.visual_actions)
        ? (o.visual_actions as unknown[]).filter((x): x is string => typeof x === "string")
        : ["highlight"],
      aiError:
        o.aiError && typeof o.aiError === "object"
          ? {
              root_cause: String((o.aiError as Record<string, unknown>).root_cause ?? ""),
              fix_hint:   String((o.aiError as Record<string, unknown>).fix_hint   ?? "")
            }
          : null
    } satisfies AnnotatedStep;
  });
}

// ── Template fallback (when all AI providers fail) ────────────────────────────

function templateStep(step: RawTraceStep): AnnotatedStep {
  if (step.runtimeError) {
    return {
      explanation: `L.${step.line} — 런타임 오류: ${step.runtimeError.type}`,
      visual_actions: ["markError", "pause"],
      aiError: {
        root_cause: step.runtimeError.message || step.runtimeError.type,
        fix_hint: "오류 메시지를 확인하고 코드를 수정하세요."
      }
    };
  }
  return { explanation: `L.${step.line} 실행`, visual_actions: ["highlight"], aiError: null };
}

// ── Annotate one batch ────────────────────────────────────────────────────────

async function annotateBatch(
  batch: RawTraceStep[],
  prevVars: Record<string, unknown>,
  ctx: { algorithm: string; strategy: string }
): Promise<AnnotatedStep[]> {
  const chain = buildChain();
  if (chain.length === 0) return batch.map(templateStep);

  // Delta-compress vars to reduce prompt size
  const slim: SlimStep[] = [];
  let prev = prevVars;
  for (const step of batch) {
    slim.push({
      idx:   step.step,
      line:  step.line,
      delta: buildDelta(step.vars, prev),
      err:   step.runtimeError
        ? { type: step.runtimeError.type, message: step.runtimeError.message }
        : null
    });
    prev = step.vars;
  }

  const prompt = buildPrompt(slim, ctx);

  try {
    const raw = await callWithFallback(prompt, chain);
    const parsed = parseAnnotatedSteps(raw, batch.length);
    if (parsed) return parsed;
  } catch {
    // All providers failed
  }

  return batch.map(templateStep);
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

const enc = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let rawTrace: RawTraceStep[] = [];
  let algorithm = "Unknown";
  let strategy  = "LINEAR";

  try {
    const body = await req.json();
    rawTrace  = (body?.rawTrace  ?? []) as RawTraceStep[];
    algorithm = String(body?.algorithm ?? "Unknown");
    strategy  = String(body?.strategy  ?? "LINEAR");
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Strip parent_frames — not needed by AI, saves tokens
  const steps: RawTraceStep[] = rawTrace.map(({ parent_frames: _pf, ...rest }) => rest as RawTraceStep);

  const ctx = { algorithm, strategy };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let batchStart = 0;
        let prevVars: Record<string, unknown> = {};

        while (batchStart < steps.length) {
          const batch = steps.slice(batchStart, batchStart + CHUNK_SIZE);
          const chunk = await annotateBatch(batch, prevVars, ctx);

          controller.enqueue(sseEvent("chunk", { index: batchStart, chunk }));

          prevVars    = batch[batch.length - 1]?.vars ?? prevVars;
          batchStart += CHUNK_SIZE;
        }

        controller.enqueue(sseEvent("done", {}));
      } catch {
        controller.enqueue(sseEvent("error", { message: "설명 생성 실패" }));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache",
      "Connection":      "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
