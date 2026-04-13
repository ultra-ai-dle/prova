import { NextRequest, NextResponse } from "next/server";
import { instrumentJavaCode } from "@/lib/javaInstrument";
import { parseJavaTrace, parseJavaCompileErrorPayload } from "@/lib/javaTraceParser";

const MAX_CODE_LENGTH = 50_000;

function logJavaExecute(
  phase: string,
  detail: Record<string, string | number | undefined>,
) {
  console.error("[/api/java/execute]", phase, detail);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, stdin, limits } = body;

  if (typeof code !== "string" || code.trim().length === 0) {
    logJavaExecute("reject:empty_code", {});
    return NextResponse.json(
      { type: "invalid_input", message: "코드를 입력한 후 디버깅을 시작하세요." },
      { status: 400 },
    );
  }
  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({ error: "코드가 너무 깁니다." }, { status: 413 });
  }

  const serviceUrl   = process.env.JAVA_EXECUTION_SERVICE_URL;
  const serviceToken = process.env.JAVA_EXECUTION_SERVICE_TOKEN;

  if (!serviceUrl) {
    return NextResponse.json(
      { error: "Java 실행 서비스가 설정되어 있지 않습니다." },
      { status: 503 },
    );
  }

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (serviceToken) headers["Authorization"] = `Bearer ${serviceToken}`;

  const { instrumented, resultLineMap } = instrumentJavaCode(code);
  const runUrl = serviceUrl.replace(/\/+$/, "") + "/run";

  let upstream: Response;
  try {
    upstream = await fetch(runUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: instrumented, stdin: stdin ?? "" }),
      signal: req.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logJavaExecute("fetch_failed", { message: msg.slice(0, 500) });
    return NextResponse.json({ error: `Java 실행 서비스 연결 실패: ${msg}` }, { status: 502 });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    logJavaExecute("upstream_http_error", {
      status: String(upstream.status),
      runUrl,
      bodyPreview: text.slice(0, 800),
    });
    return NextResponse.json(
      { error: text || "Java 실행 서비스 오류" },
      { status: upstream.status },
    );
  }

  const { stdout, stderr, exitCode } = await upstream.json() as {
    stdout: string;
    stderr: string;
    exitCode: number;
  };

  // 컴파일 에러: trace step 없이 비정상 종료
  // → 에러 라인을 runtimeError로 담아 200으로 반환, 에디터가 라인 하이라이트 처리
  if (exitCode !== 0 && !stderr.includes('"step":')) {
    logJavaExecute("compile_error", {
      exitCode: String(exitCode),
      stderrPreview: stderr.slice(0, 1200),
    });
    return NextResponse.json(parseJavaCompileErrorPayload(stderr, resultLineMap));
  }

  const payload = parseJavaTrace(stderr, stdout, {
    maxTraceSteps: limits?.maxTraceSteps,
  }, resultLineMap);
  return NextResponse.json(payload);
}
