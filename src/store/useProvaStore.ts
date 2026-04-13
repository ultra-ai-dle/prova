"use client";

import { create } from "zustand";
import {
  AnalyzeMetadata,
  AnnotatedStep,
  BranchLines,
  MergedTraceStep,
  PlaybackState,
  PyodideStatus,
  RawTraceStep,
  TraceError
} from "@/types/prova";
import { mergeTrace } from "@/features/trace/merge";

type UiMode =
  | "ready"
  | "running"
  | "visualizing"
  | "errorStep"
  | "dataExploration";

interface ProvaState {
  pyodideStatus: PyodideStatus;
  uiMode: UiMode;
  rawTrace: RawTraceStep[];
  annotated: AnnotatedStep[];
  mergedTrace: MergedTraceStep[];
  branchLines: BranchLines;
  varTypes: Record<string, string>;
  metadata: AnalyzeMetadata | null;
  globalError: TraceError | null;
  playback: PlaybackState;
  stdin: string;
  setPyodideStatus: (status: PyodideStatus) => void;
  setStdin: (stdin: string) => void;
  setWorkerResult: (payload: {
    rawTrace: RawTraceStep[];
    branchLines: BranchLines;
    varTypes: Record<string, string>;
  }) => void;
  setMetadata: (meta: AnalyzeMetadata | null) => void;
  setAnnotated: (annotated: AnnotatedStep[]) => void;
  setUiMode: (mode: UiMode) => void;
  setGlobalError: (error: TraceError | null) => void;
  setCurrentStep: (step: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setSpeed: (speed: number) => void;
  resetForRun: () => void;
  resetToReady: () => void;
}

const initialBranchLines: BranchLines = { loop: [], branch: [] };

export const useProvaStore = create<ProvaState>((set, get) => ({
  pyodideStatus: "loading",
  uiMode: "ready",
  rawTrace: [],
  annotated: [],
  mergedTrace: [],
  branchLines: initialBranchLines,
  varTypes: {},
  metadata: null,
  globalError: null,
  playback: {
    currentStep: 0,
    isPlaying: false,
    playbackSpeed: 1
  },
  stdin: "",
  setPyodideStatus: (status) => set({ pyodideStatus: status }),
  setStdin: (stdin) => set({ stdin }),
  setWorkerResult: ({ rawTrace, branchLines, varTypes }) =>
    set((state) => ({
      rawTrace,
      branchLines,
      varTypes,
      mergedTrace: mergeTrace(rawTrace, state.annotated)
    })),
  setMetadata: (metadata) => set({ metadata }),
  setAnnotated: (annotated) =>
    set((state) => ({
      annotated,
      mergedTrace: mergeTrace(state.rawTrace, annotated)
    })),
  setUiMode: (uiMode) => set({ uiMode }),
  setGlobalError: (globalError) => set({ globalError }),
  setCurrentStep: (step) =>
    set((state) => ({
      playback: {
        ...state.playback,
        currentStep: Math.max(0, Math.min(step, Math.max(state.mergedTrace.length - 1, 0)))
      }
    })),
  setPlaying: (isPlaying) =>
    set((state) => ({ playback: { ...state.playback, isPlaying } })),
  setSpeed: (playbackSpeed) =>
    set((state) => ({ playback: { ...state.playback, playbackSpeed } })),
  resetForRun: () =>
    set({
      uiMode: "running",
      rawTrace: [],
      annotated: [],
      mergedTrace: [],
      branchLines: initialBranchLines,
      varTypes: {},
      metadata: null,
      globalError: null,
      playback: { ...get().playback, currentStep: 0, isPlaying: false }
    }),
  resetToReady: () =>
    set({
      uiMode: "ready",
      rawTrace: [],
      annotated: [],
      mergedTrace: [],
      branchLines: initialBranchLines,
      varTypes: {},
      metadata: null,
      globalError: null,
      playback: { ...get().playback, currentStep: 0, isPlaying: false }
    })
}));
