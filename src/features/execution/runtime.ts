"use client";

import { provaRuntimeConfig } from "@/config/provaRuntime";
import { WorkerDonePayload } from "@/types/prova";
import { lang } from "@/lib/language";

type RuntimeCallbacks = {
  onReady: () => void;
  onDone: (payload: WorkerDonePayload & { scenario?: string }) => void;
  onError: (error: Error) => void;
  onTimeout: () => void;
  onInvalidInput: (message: string) => void;
};

export class ProvaRuntime {
  private worker: Worker | null = null;

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  private abortController: AbortController | null = null;

  constructor(private callbacks: RuntimeCallbacks, private language: string = "python") {}

  init() {
    if (lang(this.language).java) {
      this.callbacks.onReady();
      return;
    }
    this.createWorker();
  }

  run(code: string, stdin: string) {
    if (code.trim().length === 0) {
      this.callbacks.onInvalidInput("코드를 입력한 후 디버깅을 시작하세요.");
      return;
    }
    if (lang(this.language).py && stdin.trim().length === 0) {
      this.callbacks.onInvalidInput("예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.");
      return;
    }
    if (lang(this.language).java) {
      this.runRemote(code, stdin);
      return;
    }
    if (!this.worker) {
      this.createWorker();
    }
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      this.worker?.terminate();
      this.callbacks.onTimeout();
      this.createWorker();
    }, provaRuntimeConfig.executionTimeoutMs);
    this.worker?.postMessage({
      code,
      stdin,
      limits: {
        maxTraceSteps: provaRuntimeConfig.maxTraceSteps,
        safeSerializeListLimitRoot: provaRuntimeConfig.safeSerializeListLimitRoot,
        safeSerializeListLimitNested: provaRuntimeConfig.safeSerializeListLimitNested
      }
    });
  }

  destroy() {
    this.clearTimeout();
    this.abortController?.abort();
    this.abortController = null;
    this.worker?.terminate();
    this.worker = null;
  }

  private workerUrl(): string {
    const version = encodeURIComponent(provaRuntimeConfig.workerScriptVersion);
    switch (this.language) {
      case "javascript": return `/worker/js.worker.js?v=${version}`;
      default:           return `/worker/pyodide.worker.js?v=${version}`;
    }
  }

  private async runRemote(code: string, stdin: string) {
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.timeoutId = setTimeout(() => {
      this.abortController?.abort();
      this.callbacks.onTimeout();
    }, provaRuntimeConfig.executionTimeoutMs);

    try {
      const res = await fetch("/api/java/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          stdin,
          limits: {
            maxTraceSteps: provaRuntimeConfig.maxTraceSteps,
            safeSerializeListLimitRoot: provaRuntimeConfig.safeSerializeListLimitRoot,
            safeSerializeListLimitNested: provaRuntimeConfig.safeSerializeListLimitNested,
          },
        }),
        signal: this.abortController.signal,
      });

      this.clearTimeout();

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        this.callbacks.onError(new Error(body?.error ?? `Java 실행 실패 (${res.status})`));
        return;
      }

      const payload = await res.json();
      if (payload.type === "invalid_input") {
        this.callbacks.onInvalidInput(String(payload.message ?? "입력 코드가 비어 있습니다."));
        return;
      }
      this.callbacks.onDone(payload);
    } catch (err) {
      this.clearTimeout();
      if ((err as { name?: string }).name === "AbortError") return;
      this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private createWorker() {
    this.worker?.terminate();
    this.worker = new Worker(this.workerUrl());
    this.worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === "ready") {
        this.callbacks.onReady();
        return;
      }
      if (data.type === "done") {
        this.clearTimeout();
        this.callbacks.onDone(data);
        return;
      }
      if (data.type === "invalid_input") {
        this.clearTimeout();
        this.callbacks.onInvalidInput(String(data.message ?? "입력 코드가 비어 있습니다."));
      }
    };
    this.worker.onerror = (event) => {
      this.clearTimeout();
      this.callbacks.onError(new Error(event.message));
    };
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
