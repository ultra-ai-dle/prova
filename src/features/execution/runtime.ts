"use client";

import { provaRuntimeConfig } from "@/config/provaRuntime";
import { WorkerDonePayload } from "@/types/prova";

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

  constructor(private callbacks: RuntimeCallbacks, private language: string = "python") {}

  init() {
    this.createWorker();
  }

  run(code: string, stdin: string) {
    if (code.trim().length === 0) {
      this.callbacks.onInvalidInput("코드를 입력한 후 디버깅을 시작하세요.");
      return;
    }
    if (this.language === "python" && stdin.trim().length === 0) {
      this.callbacks.onInvalidInput("예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.");
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
    this.worker?.terminate();
    this.worker = null;
  }

  private workerUrl(): string {
    const version = encodeURIComponent(provaRuntimeConfig.workerScriptVersion);
    if (this.language === "javascript") return `/worker/js.worker.js?v=${version}`;
    return `/worker/pyodide.worker.js?v=${version}`;
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
