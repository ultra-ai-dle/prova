/**
 * Pyodide 워커 / 실행 런타임 한도.
 * 배포 없이 이 파일만 수정해 조절하면 됩니다.
 */
export const provaRuntimeConfig = {
  /**
   * 워커 스크립트 캐시 버전.
   * pyodide.worker.js를 수정했는데 브라우저가 옛 파일을 쓰면 이 값을 올리세요.
   */
  workerScriptVersion: "2026-04-10-2",

  /** 한 번의 디버깅 실행이 허용하는 최대 시간(ms). 초과 시 워커가 종료됩니다. */
  executionTimeoutMs: 120_000,

  /** 줄 단위 추적 스텝 수 상한. BFS 등 긴 루프는 이 값을 키우되, 메모리·JSON 크기가 커집니다. */
  maxTraceSteps: 10_000,

  /** 스텝 스냅샷 직렬화: 최상위 리스트/튜플/deque에서 보이는 원소 개수 상한 */
  safeSerializeListLimitRoot: 30,

  /** 그보다 깊은 중첩 컬렉션에서 자식당 원소 개수 상한 */
  safeSerializeListLimitNested: 128
} as const;
