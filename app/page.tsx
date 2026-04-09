"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GridLinearPanel } from "@/features/visualization/GridLinearPanel";
import { TimelineControls } from "@/features/playback/TimelineControls";
import { ProvaRuntime } from "@/features/execution/runtime";
import { streamExplain } from "@/features/fallback/useExplainStream";
import { AnnotatedStep, AnalyzeMetadata } from "@/types/prova";
import { useProvaStore } from "@/store/useProvaStore";

const SAMPLE_CODE = [
  "from collections import deque",
  "",
  "def bfs(grid, sr, sc):",
  "    q = deque([(sr, sc)])",
  "    visited = [[False]*5 for _ in range(5)]",
  "    while q:",
  "        r, c = q.popleft()",
  "        if visited[r][c]:",
  "            continue",
  "        visited[r][c] = True",
  "        for nr, nc in [(r+1,c),(r,c+1)]:",
  "            if nr < 5 and nc < 5:",
  "                q.append((nr, nc))",
  "    return visited",
  "",
  "print('done')"
].join("\n");

/* ── SVG Icons ─────────────────────────────────────────── */
const IconFiles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconGit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconHelp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const IconExpand = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconBug = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.88 1.88" />
    <path d="M14.12 3.88L16 2" />
    <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" />
    <path d="M12 20v-9" />
    <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
    <path d="M6 13H2" />
    <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
    <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
    <path d="M22 13h-4" />
    <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────── */
function runButtonLabel(status: string, hasTrace: boolean) {
  if (status === "loading") return "Python 준비 중...";
  if (status === "running") return "실행 중...";
  if (status === "reinitializing") return "초기화 중...";
  if (status === "error") return "실행 불가";
  return hasTrace ? "▶ RE-EXECUTE" : "▶ EXECUTE";
}

type NavTab = "Editor" | "Visualizer" | "Debugger" | "Docs";

export default function Page() {
  const [code] = useState(SAMPLE_CODE);
  const [activeTab, setActiveTab] = useState<NavTab>("Editor");
  const [activeSideIcon, setActiveSideIcon] = useState<"files" | "search" | "git" | "settings">("files");
  const [toasts, setToasts] = useState<Array<{ id: number; kind: "warn" | "ok"; message: string }>>([]);
  const runtimeRef = useRef<ProvaRuntime | null>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    pyodideStatus,
    uiMode,
    rawTrace,
    mergedTrace,
    metadata,
    branchLines,
    playback,
    stdin,
    setStdin,
    setPyodideStatus,
    setWorkerResult,
    setMetadata,
    setAnnotated,
    setUiMode,
    setGlobalError,
    setCurrentStep,
    setPlaying,
    setSpeed,
    resetForRun
  } = useProvaStore();

  const currentStep = mergedTrace[playback.currentStep] ?? null;
  const previousStep = mergedTrace[playback.currentStep - 1] ?? null;
  const isRunning = pyodideStatus === "running";
  const isFallback = uiMode === "dataExploration";
  const isError = uiMode === "errorStep";
  const isVisualizing = uiMode === "visualizing" || isError || isFallback;

  // Auto-switch tab based on ui mode
  useEffect(() => {
    if (isError) setActiveTab("Debugger");
    else if (uiMode === "visualizing") setActiveTab("Visualizer");
    else if (uiMode === "ready") setActiveTab("Editor");
  }, [uiMode, isError]);

  const addToast = (kind: "warn" | "ok", message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [{ id, kind, message }, ...prev].slice(0, 3));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, kind === "ok" ? 4000 : 5000);
  };

  useEffect(() => {
    const runtime = new ProvaRuntime({
      onReady: () => setPyodideStatus("ready"),
      onDone: async (payload) => {
        setWorkerResult(payload);
        try {
          const analyze = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, varTypes: payload.varTypes })
          });
          const meta = (await analyze.json()) as AnalyzeMetadata;
          setMetadata(meta);

          const fullAnnotated: AnnotatedStep[] = Array.from(
            { length: payload.rawTrace.length },
            () => ({ explanation: "", visual_actions: [], aiError: null })
          );

          const failNetwork = `${code}\n${stdin}`.toLowerCase().includes("fallback");
          await streamExplain(
            payload.rawTrace,
            (index, chunk) => {
              chunk.forEach((item, idx) => {
                fullAnnotated[index + idx] = item;
              });
              setAnnotated([...fullAnnotated]);
            },
            { failNetwork }
          );

          setUiMode(payload.rawTrace.some((step) => step.runtimeError) ? "errorStep" : "visualizing");
          setCurrentStep(payload.rawTrace.findIndex((step) => step.runtimeError) >= 0
            ? payload.rawTrace.findIndex((step) => step.runtimeError)
            : 0);
          setPyodideStatus("ready");
        } catch {
          setUiMode("dataExploration");
          setPyodideStatus("ready");
          addToast("warn", "AI 설명 연결에 실패했습니다. 변수 데이터만으로 탐색합니다.");
        }
      },
      onError: (error) => {
        setPyodideStatus("error");
        setGlobalError({ type: "RUNTIME", message: error.message });
      },
      onTimeout: () => {
        setPyodideStatus("reinitializing");
        addToast("warn", "실행 시간이 너무 길어 안전을 위해 중단하고 환경을 재설정합니다.");
        setTimeout(() => {
          setPyodideStatus("ready");
          addToast("ok", "환경 준비 완료. 코드를 수정 후 다시 시도해 주세요.");
        }, 900);
      }
    });
    runtime.init();
    runtimeRef.current = runtime;
    return () => runtime.destroy();
  }, [code, setAnnotated, setCurrentStep, setGlobalError, setMetadata, setPyodideStatus, setUiMode, setWorkerResult, stdin]);

  useEffect(() => {
    if (!playback.isPlaying) {
      if (playTimer.current) clearInterval(playTimer.current);
      playTimer.current = null;
      return;
    }
    if (playTimer.current) clearInterval(playTimer.current);
    playTimer.current = setInterval(() => {
      const next = playback.currentStep + 1;
      if (next >= mergedTrace.length) {
        setPlaying(false);
        return;
      }
      if (mergedTrace[next]?.runtimeError) {
        setCurrentStep(next);
        setPlaying(false);
        setUiMode("errorStep");
        return;
      }
      setCurrentStep(next);
    }, Math.max(300, 900 / playback.playbackSpeed));
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
    };
  }, [mergedTrace, playback.currentStep, playback.isPlaying, playback.playbackSpeed, setCurrentStep, setPlaying, setUiMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setCurrentStep(playback.currentStep - 1);
      if (e.key === "ArrowRight") setCurrentStep(playback.currentStep + 1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying(!playback.isPlaying);
      }
      if (e.key === "Home") setCurrentStep(0);
      if (e.key === "End") setCurrentStep(mergedTrace.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mergedTrace.length, playback.currentStep, playback.isPlaying, setCurrentStep, setPlaying]);

  const headerBadge = useMemo(() => {
    if (isRunning) return { text: "알고리즘 분석 중...", style: "border-[#e3b341]/40 bg-[#3d2b00]/60 text-[#e3b341]" };
    if (isFallback) return { text: "○ 알고리즘 감지 실패", style: "border-prova-line text-prova-muted" };
    if (metadata?.display_name) return { text: `● ${metadata.display_name}`, style: "border-prova-green/40 bg-[#1a4731]/60 text-prova-green" };
    return { text: "WAITING FOR EXECUTION...", style: "border-prova-line text-prova-muted" };
  }, [isFallback, isRunning, metadata?.display_name]);

  const TABS: NavTab[] = ["Editor", "Visualizer", "Debugger", "Docs"];
  const SIDE_ICONS = [
    { id: "files" as const, Icon: IconFiles },
    { id: "search" as const, Icon: IconSearch },
    { id: "git" as const, Icon: IconGit },
    { id: "settings" as const, Icon: IconSettings },
  ];

  return (
    <div className="h-screen flex flex-col bg-prova-bg text-[#e6edf3] overflow-hidden">
      {/* ── Running progress bar ────────────────────────────── */}
      <div className={`h-[2px] shrink-0 transition-opacity duration-300 ${isRunning ? "opacity-100 animate-pulse bg-gradient-to-r from-[#58a6ff] via-prova-green to-[#58a6ff]" : "opacity-0"}`} />

      {/* ── Status banners ──────────────────────────────────── */}
      {(pyodideStatus === "loading" || pyodideStatus === "error" || isFallback) && (
        <div className={`shrink-0 h-9 flex items-center justify-between px-4 text-xs font-medium ${
          pyodideStatus === "loading" ? "bg-[#3d2b00] text-[#e3b341]"
          : pyodideStatus === "error" ? "bg-[#5a1212] text-[#ffc1c1]"
          : "bg-[#7c4a00]/70 text-[#ffe09a]"
        }`}>
          <div className="flex items-center gap-2">
            <IconWarning />
            <span>
              {pyodideStatus === "loading" && "Python 환경 준비 중입니다. 잠시만 기다려 주세요."}
              {pyodideStatus === "error" && "Python 환경 초기화에 실패했습니다. 페이지를 새로고침해 주세요."}
              {isFallback && "AI 연결에 실패했습니다. 기본 변수 뷰로 코드 흐름을 추적합니다."}
            </span>
          </div>
          {pyodideStatus === "error" && (
            <button className="border border-current rounded px-3 py-1 hover:bg-white/10 transition-colors" onClick={() => window.location.reload()}>
              새로고침
            </button>
          )}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="shrink-0 h-11 bg-[#161b22] border-b border-prova-line flex items-center px-3 gap-4">
        {/* Logo */}
        <div className="font-bold text-[15px] tracking-tight shrink-0">
          Pro<span className="text-prova-green">va</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-prova-line shrink-0" />

        {/* Tab navigation */}
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-7 px-3 rounded text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[#21262d] text-white"
                  : "text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d]/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Status badge — centered */}
        <div className="flex-1 flex justify-center">
          <div className={`text-[11px] rounded-full border px-3 py-[3px] font-mono tracking-wide ${headerBadge.style}`}>
            {headerBadge.text}
          </div>
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button className="w-7 h-7 flex items-center justify-center rounded text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors">
            <IconHelp />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors">
            <IconBell />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors">
            <IconSettings />
          </button>
        </div>

        {/* Execute button */}
        <button
          className={`shrink-0 h-7 px-4 rounded text-xs font-bold tracking-wide transition-colors ${
            pyodideStatus === "ready"
              ? "bg-prova-green text-black hover:bg-[#4ac763]"
              : pyodideStatus === "error"
                ? "bg-[#2d1112] border border-prova-red text-[#f8b4b4]"
                : "bg-[#21262d] border border-prova-line text-prova-muted cursor-not-allowed"
          }`}
          disabled={pyodideStatus !== "ready"}
          onClick={() => {
            if (pyodideStatus !== "ready") return;
            resetForRun();
            setPyodideStatus("running");
            runtimeRef.current?.run(code, stdin);
          }}
        >
          {runButtonLabel(pyodideStatus, mergedTrace.length > 0)}
        </button>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left icon sidebar */}
        <aside className="w-11 shrink-0 bg-[#161b22] border-r border-prova-line flex flex-col items-center py-2 gap-1">
          {SIDE_ICONS.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSideIcon(id)}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                activeSideIcon === id
                  ? "text-white bg-[#21262d]"
                  : "text-prova-muted hover:text-[#c9d1d9] hover:bg-[#21262d]/60"
              }`}
            >
              <Icon />
            </button>
          ))}
        </aside>

        {/* 3-column main area */}
        <div className="flex-1 grid grid-cols-[28%_45%_27%] min-h-0 min-w-0">
          {/* ── Code Editor ───────────────────────────── */}
          <section className="border-r border-prova-line min-h-0 flex flex-col min-w-0">
            {/* Section header */}
            <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-prova-line bg-[#0f141a]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                  bfs_algorithm.py
                </span>
                {isVisualizing && (
                  <span className={`text-[10px] px-2 py-[2px] rounded-full border font-medium ${
                    isError
                      ? "border-prova-red/40 bg-[#2d1112]/60 text-prova-red"
                      : "border-prova-green/40 bg-[#1a4731]/60 text-prova-green"
                  }`}>
                    {isError ? "error" : "ready"}
                  </span>
                )}
              </div>
              {isVisualizing && (
                <span className="text-[10px] text-prova-muted font-mono">
                  Step {playback.currentStep + 1} / {mergedTrace.length}
                </span>
              )}
            </div>

            {/* Code lines */}
            <div className="flex-1 overflow-auto bg-[#0d1117]">
              {code.split("\n").map((line, index) => {
                const lineNo = index + 1;
                const active = currentStep?.line === lineNo;
                const error = active && currentStep?.runtimeError;
                return (
                  <div
                    key={lineNo}
                    className={`grid grid-cols-[36px_1fr] gap-0 font-mono text-[12px] leading-6 transition-colors ${
                      error
                        ? "bg-[#3d0b0b] border-l-2 border-prova-red"
                        : active
                          ? "bg-[#2d3748]/60 border-l-2 border-[#58a6ff]"
                          : "border-l-2 border-transparent"
                    }`}
                  >
                    <span className={`text-right pr-3 select-none text-[11px] leading-6 ${
                      active ? (error ? "text-prova-red" : "text-[#58a6ff]") : "text-[#4a5568]"
                    }`}>
                      {lineNo}
                    </span>
                    <span className={`pl-2 ${active && !error ? "text-white" : ""}`}>{line || " "}</span>
                  </div>
                );
              })}
            </div>

            {/* Python badge */}
            <div className="shrink-0 px-3 py-2 border-t border-prova-line bg-[#0f141a]">
              <span className="text-[10px] text-prova-muted font-mono">
                Python 3.11 · Standard Library · No external packages
              </span>
            </div>
          </section>

          {/* ── Visualization ─────────────────────────── */}
          <section className="border-r border-prova-line min-h-0 flex flex-col min-w-0">
            <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-prova-line bg-[#0f141a]">
              <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                {isFallback ? "Data Exploration" : "Grid Visualization"}
              </span>
              {isVisualizing && (
                <div className="flex items-center gap-1 text-prova-muted">
                  <IconRefresh />
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden bg-[#0d1117]">
              <GridLinearPanel
                step={currentStep}
                previousStep={previousStep}
                fallback={isFallback}
              />
            </div>
          </section>

          {/* ── Variables + AI ────────────────────────── */}
          <section className="min-h-0 flex flex-col min-w-0">
            {/* VARIABLE MONITOR */}
            <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-prova-line bg-[#0f141a]">
              <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                Variable Monitor
              </span>
              <div className="flex items-center gap-1 text-prova-muted">
                <button className="hover:text-[#c9d1d9] transition-colors"><IconRefresh /></button>
                <button className="hover:text-[#c9d1d9] transition-colors ml-1"><IconExpand /></button>
              </div>
            </div>

            {/* Scope bar */}
            <div className="shrink-0 px-3 py-[6px] bg-[#161b22] border-b border-prova-line">
              <span className="text-[10px] text-prova-muted font-mono">
                {currentStep
                  ? `<global> › ${currentStep.scope.func} (depth: ${currentStep.scope.depth})`
                  : "<global> (depth: 0)"}
              </span>
            </div>

            {/* Variables */}
            <div className="flex-1 overflow-auto min-h-0 bg-[#0d1117]">
              {!currentStep && (
                <div className="p-4 text-xs text-prova-muted italic">
                  실행 후 변수가 표시됩니다.
                </div>
              )}
              {currentStep && Object.entries(currentStep.vars).map(([key, value]) => {
                const changed = previousStep && JSON.stringify(previousStep.vars[key]) !== JSON.stringify(value);
                const isKey = metadata?.key_vars.includes(key);
                return (
                  <div
                    key={key}
                    className={`grid grid-cols-[2fr_3fr] gap-2 px-3 py-[5px] border-b border-[#1c2128] text-xs transition-colors ${
                      changed ? "bg-[#3d2b00]/40" : ""
                    }`}
                  >
                    <span className={`font-mono truncate ${isKey ? "text-prova-green font-semibold" : "text-[#8b949e]"}`}>
                      {key}
                      {changed && <span className="ml-1 text-[#e3b341]">·</span>}
                    </span>
                    <span className="font-mono text-[#c9d1d9] truncate">{JSON.stringify(value)}</span>
                  </div>
                );
              })}
            </div>

            {/* AI EXPLANATION */}
            <div className="shrink-0 h-9 flex items-center justify-between px-3 border-y border-prova-line bg-[#0f141a]">
              <span className="text-[10px] text-prova-muted uppercase tracking-widest font-medium">
                {isError ? "AI Root Cause Analysis" : "AI Explanation"}
              </span>
              {isError && (
                <div className="flex items-center gap-1 text-prova-red">
                  <IconBug />
                </div>
              )}
            </div>

            {/* AI content */}
            <div className="flex-1 overflow-auto min-h-0 bg-[#0d1117] p-3 text-xs space-y-2">
              {!currentStep && (
                <p className="text-prova-muted italic">실행 후 AI 설명이 표시됩니다.</p>
              )}
              {currentStep && !currentStep.explanation && (
                <p className="text-prova-muted italic">AI 연결에 실패했습니다.</p>
              )}
              {currentStep?.explanation && (
                <div className={`rounded-md border p-3 space-y-1 ${
                  currentStep.runtimeError ? "border-prova-red/40 bg-[#2d1112]/60" : "border-[#30363d] bg-[#161b22]"
                }`}>
                  <p className="text-[10px] text-prova-muted font-mono mb-2">L.{currentStep.line}</p>
                  <p className="text-[#c9d1d9] leading-relaxed">{currentStep.explanation}</p>
                  {currentStep.aiError && (
                    <div className="mt-3 space-y-2 border-t border-prova-red/30 pt-3">
                      <div className="rounded border border-[#5a1212] bg-[#1a0505] p-2">
                        <p className="text-[10px] text-prova-muted uppercase tracking-wide mb-1">Root Cause</p>
                        <p className="text-[#fca5a5]">{currentStep.aiError.root_cause}</p>
                      </div>
                      <div className="rounded border border-[#2d3748] bg-[#161b22] p-2">
                        <p className="text-[10px] text-prova-muted uppercase tracking-wide mb-1">Fix Hint</p>
                        <p className="text-[#c9d1d9]">{currentStep.aiError.fix_hint}</p>
                      </div>
                      <button
                        className="w-full h-8 rounded border border-prova-red bg-[#2d1112] text-prova-red text-xs font-medium hover:bg-[#3d1a1a] transition-colors"
                        onClick={() => setCurrentStep(Math.max(0, playback.currentStep - 1))}
                      >
                        ↩ 에러 이전으로 되돌아가기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Bottom input bar ────────────────────────────────── */}
      <div className="shrink-0 border-t border-prova-line bg-[#161b22] px-3 py-2 flex items-center gap-3">
        <textarea
          className="flex-1 h-12 rounded border border-prova-line bg-[#0d1117] text-xs font-mono p-2 resize-none placeholder:text-prova-muted focus:outline-none focus:border-[#58a6ff]/60 transition-colors disabled:opacity-40"
          placeholder="줄마다 입력값을 작성하세요 (예: 5 3↵2 4 1)"
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          disabled={isRunning || pyodideStatus === "error"}
        />
        <button
          className={`shrink-0 h-12 px-5 rounded text-xs font-bold tracking-wide transition-colors ${
            pyodideStatus === "ready"
              ? "bg-prova-green text-black hover:bg-[#4ac763]"
              : pyodideStatus === "error"
                ? "bg-[#2d1112] border border-prova-red text-[#f8b4b4]"
                : "bg-[#21262d] border border-prova-line text-prova-muted cursor-not-allowed"
          }`}
          disabled={pyodideStatus !== "ready"}
          onClick={() => {
            if (pyodideStatus !== "ready") return;
            resetForRun();
            setPyodideStatus("running");
            runtimeRef.current?.run(code, stdin);
          }}
        >
          {runButtonLabel(pyodideStatus, mergedTrace.length > 0)}
        </button>
      </div>

      {/* ── Timeline ────────────────────────────────────────── */}
      <TimelineControls
        steps={mergedTrace}
        branchLines={branchLines}
        currentStep={playback.currentStep}
        isRunning={isRunning}
        isPlaying={playback.isPlaying}
        speed={playback.playbackSpeed}
        isError={isError}
        onStepChange={(step) => setCurrentStep(step)}
        onTogglePlay={() => setPlaying(!playback.isPlaying)}
        onSpeedChange={(value) => setSpeed(value)}
        onJumpToError={() => {
          const errorIndex = mergedTrace.findIndex((s) => s.runtimeError);
          if (errorIndex >= 0) setCurrentStep(errorIndex);
        }}
      />

      {/* ── Toasts ──────────────────────────────────────────── */}
      <div className="fixed right-4 bottom-20 w-[340px] flex flex-col gap-2 pointer-events-none z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs shadow-lg ${
              toast.kind === "ok"
                ? "bg-[#0d1f17] border-prova-green text-prova-green"
                : "bg-[#1f1200] border-[#e3b341]/60 text-[#ffe09a]"
            }`}
          >
            <span className="mt-[1px]">{toast.kind === "ok" ? "✓" : "⚠"}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
