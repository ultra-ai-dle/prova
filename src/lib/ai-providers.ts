/**
 * Shared AI provider infrastructure.
 *
 * Chain structure: MAIN → FALLBACK
 *   - Main  : set via AI_PROVIDER + AI_MODEL env vars (or auto-selected from available keys)
 *   - Fallback: remaining providers with API keys, in priority order
 *
 * On token overflow (context_length_exceeded / RESOURCE_EXHAUSTED / HTTP 413)
 * the caller should move to the next entry in the chain (cross-provider).
 */

export type Provider = "gemini" | "openai" | "groq" | "anthropic" | "openrouter";

export const PROVIDER_PRIORITY: Provider[] = [
  "gemini", "groq", "openai", "anthropic", "openrouter"
];

export type ChainEntry = { provider: Provider; model: string };

// ── Key resolution ────────────────────────────────────────────────────────────

export function providerKey(p: Provider): string | undefined {
  switch (p) {
    case "gemini":     return process.env.GEMINI_API_KEY     || undefined;
    case "openai":     return process.env.OPENAI_API_KEY     || undefined;
    case "groq":       return process.env.GROQ_API_KEY       || undefined;
    case "anthropic":  return process.env.ANTHROPIC_API_KEY  || undefined;
    case "openrouter": return process.env.OPENROUTER_API_KEY || undefined;
  }
}

// ── Chain construction ────────────────────────────────────────────────────────
//
// chain[0] = AI_PROVIDER + AI_MODEL          (main)
// chain[1] = FALLBACK_PROVIDER + FALLBACK_MODEL  (explicit fallback, can cross providers)

export function buildChain(): ChainEntry[] {
  const mainProvider  = (process.env.AI_PROVIDER       ?? "").trim().toLowerCase() as Provider;
  const mainModel     = (process.env.AI_MODEL           ?? "").trim();
  const fbProvider    = (process.env.FALLBACK_PROVIDER  ?? "").trim().toLowerCase() as Provider;
  const fbModel       = (process.env.FALLBACK_MODEL     ?? "").trim();

  const chain: ChainEntry[] = [];

  if (mainProvider && PROVIDER_PRIORITY.includes(mainProvider) && providerKey(mainProvider) && mainModel) {
    chain.push({ provider: mainProvider, model: mainModel });
  }

  if (fbProvider && PROVIDER_PRIORITY.includes(fbProvider) && providerKey(fbProvider) && fbModel) {
    const alreadyAdded = chain.some((e) => e.provider === fbProvider && e.model === fbModel);
    if (!alreadyAdded) chain.push({ provider: fbProvider, model: fbModel });
  }

  return chain;
}

// ── Error classification ──────────────────────────────────────────────────────

export function isTokenOverflow(message: string): boolean {
  if (
    /context_length_exceeded|maximum.{0,20}context|token.{0,20}limit|too.{0,20}long|RESOURCE_EXHAUSTED|context.{0,5}window|input.{0,20}large|max_tokens|string too long/i
      .test(message)
  ) {
    return true;
  }
  const m = message.match(/_HTTP_(\d{3})/);
  return m ? Number(m[1]) === 413 : false;
}

export function isTransient(message: string): boolean {
  if (/AI_TIMEOUT|EMPTY_RESPONSE|PARSE_FAILED/i.test(message)) return true;
  const m = message.match(/_HTTP_(\d{3})/);
  const status = m ? Number(m[1]) : null;
  return status !== null && new Set([429, 500, 502, 503, 504]).has(status);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs = 20_000,
  attempts = 3
): Promise<Response> {
  let lastRes: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      clearTimeout(tid);
      if ((err as Error).name === "AbortError") {
        if (i === attempts - 1) throw new Error("AI_TIMEOUT");
        await sleep(300 * 2 ** i);
        continue;
      }
      if (i === attempts - 1) throw err;
      await sleep(300 * 2 ** i);
      continue;
    } finally {
      clearTimeout(tid);
    }
    if (res.ok) return res;
    lastRes = res;
    if (!RETRYABLE.has(res.status) || i === attempts - 1) return res;
    const ra = Number(res.headers.get("retry-after") ?? "0");
    await sleep(ra > 0 ? ra * 1000 : (res.status === 503 ? 1200 : 300) * 2 ** i);
  }
  return lastRes!;
}

// ── Provider call functions ───────────────────────────────────────────────────

export type GeminiOptions = {
  /** JSON schema for structured output (Gemini-native, reduces parse failures). */
  responseSchema?: object;
  maxOutputTokens?: number;
  temperature?: number;
};

export async function callGemini(
  prompt: string,
  model: string,
  opts: GeminiOptions = {}
): Promise<string> {
  const key = providerKey("gemini");
  if (!key) throw new Error("GEMINI_API_KEY is missing");

  const { responseSchema, maxOutputTokens = 1024, temperature = 0.1 } = opts;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          ...(responseSchema ? { responseMimeType: "application/json", responseSchema } : {}),
          temperature,
          maxOutputTokens,
        },
      }),
    },
    20_000,
    1  // Gemini has its own internal retry; one attempt here avoids duplicate charges
  );

  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`GEMINI_HTTP_${res.status}${detail ? `:${detail.slice(0, 300)}` : ""}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("GEMINI_EMPTY_RESPONSE");
  return String(text);
}

export type OpenAICompatOptions = {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  extraHeaders?: Record<string, string>;
};

export async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  providerPrefix: string,
  opts: OpenAICompatOptions = {}
): Promise<string> {
  const { temperature = 0.1, maxTokens, jsonMode = true, extraHeaders } = opts;

  const body: Record<string, unknown> = {
    model,
    temperature,
    messages: [
      { role: "system", content: "Return ONLY strict JSON." },
      { role: "user",   content: prompt },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  if (maxTokens)  body.max_tokens = maxTokens;

  const res = await fetchWithRetry(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    },
    20_000,
    1
  );

  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`${providerPrefix}_HTTP_${res.status}${detail ? `:${detail.slice(0, 300)}` : ""}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${providerPrefix}_EMPTY_RESPONSE`);
  return String(text);
}

export type AnthropicOptions = {
  temperature?: number;
  maxTokens?: number;
};

export async function callAnthropic(
  prompt: string,
  model: string,
  opts: AnthropicOptions = {}
): Promise<string> {
  const key = providerKey("anthropic");
  if (!key) throw new Error("ANTHROPIC_API_KEY is missing");

  const { temperature = 0.1, maxTokens = 1024 } = opts;

  const res = await fetchWithRetry(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: "Return ONLY strict JSON.",
        messages: [{ role: "user", content: prompt }],
      }),
    },
    20_000,
    1
  );

  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`ANTHROPIC_HTTP_${res.status}${detail ? `:${detail.slice(0, 300)}` : ""}`);
  }
  const json = await res.json();
  const text = json?.content?.[0]?.text;
  if (!text) throw new Error("ANTHROPIC_EMPTY_RESPONSE");
  return String(text);
}

/** Dispatch to the right provider based on a ChainEntry. */
export async function callProvider(
  entry: ChainEntry,
  prompt: string,
  geminiOpts?: GeminiOptions,
  openaiOpts?: OpenAICompatOptions
): Promise<string> {
  const { provider, model } = entry;
  switch (provider) {
    case "gemini":
      return callGemini(prompt, model, geminiOpts);
    case "openai": {
      const key = providerKey("openai")!;
      return callOpenAICompat("https://api.openai.com/v1", key, model, prompt, "OPENAI", openaiOpts);
    }
    case "groq": {
      const key = providerKey("groq")!;
      return callOpenAICompat("https://api.groq.com/openai/v1", key, model, prompt, "GROQ", openaiOpts);
    }
    case "anthropic":
      return callAnthropic(prompt, model, openaiOpts);
    case "openrouter": {
      const key = providerKey("openrouter")!;
      return callOpenAICompat(
        "https://openrouter.ai/api/v1",
        key,
        model,
        prompt,
        "OPENROUTER",
        { ...openaiOpts, extraHeaders: { "HTTP-Referer": "https://prova.app", "X-Title": "Prova" } }
      );
    }
  }
}

/**
 * Call AI with automatic cross-provider fallback.
 *
 * Moves to the next entry in the chain on:
 *   - Token overflow (context_length_exceeded, RESOURCE_EXHAUSTED, HTTP 413)
 *   - Transient errors (timeout, empty response, HTTP 429/5xx) — already
 *     retried once in fetchWithRetry; if still failing, try next provider.
 *
 * Stops immediately on fatal errors (401 auth, 400 non-token).
 */
export async function callWithFallback(
  prompt: string,
  chain: ChainEntry[],
  geminiOpts?: GeminiOptions,
  openaiOpts?: OpenAICompatOptions
): Promise<string> {
  if (chain.length === 0) throw new Error("NO_AI_PROVIDER_KEY");

  let lastError: Error | null = null;
  for (const entry of chain) {
    try {
      return await callProvider(entry, prompt, geminiOpts, openaiOpts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(message);
      // Retry-worthy → try next provider in chain
      if (isTokenOverflow(message) || isTransient(message)) continue;
      // Fatal (auth failure, bad request, etc.) → stop
      break;
    }
  }
  throw lastError ?? new Error("AI_UNKNOWN_FAILURE");
}
