import { AnnotatedStep, MergedTraceStep, RawTraceStep } from '@/types/frogger';

export const EMPTY_ANNOTATED: AnnotatedStep = {
  explanation: '',
  visual_actions: [],
  aiError: null,
};

export function mergeTrace(
  rawTrace: RawTraceStep[],
  annotated: Array<AnnotatedStep | null | undefined>,
): MergedTraceStep[] {
  return rawTrace.map((step, index) => {
    const annotation = annotated[index] ?? EMPTY_ANNOTATED;
    return {
      ...step,
      explanation: annotation.explanation,
      visual_actions: annotation.visual_actions,
      aiError: annotation.aiError,
    };
  });
}
