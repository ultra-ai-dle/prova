export interface TourStep {
  targetSelector: string;
  placement: 'bottom-center' | 'right' | 'bottom-left' | 'bottom-right' | 'left';
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="header"]',
    placement: 'bottom-center',
    title: 'Prova에 오신 것을 환영합니다',
    body: 'AI가 알고리즘의 실행 흐름을 시각화해 주는 디버거입니다.\n핵심 기능을 안내해 드릴게요. 이 투어는 약 1분 정도 걸립니다.',
  },
  {
    targetSelector: '[data-tour="editor"]',
    placement: 'right',
    title: '코드 에디터',
    body: '여기에 알고리즘 코드를 작성하세요.\nBFS, DFS, DP 등 다양한 알고리즘을 지원합니다. 기본 예시 코드가 미리 채워져 있어요.\n상단의 Tab 버튼으로 들여쓰기 크기를 전환할 수 있습니다.',
  },
  {
    targetSelector: '[data-tour="language"]',
    placement: 'bottom-left',
    title: '언어 선택',
    body: 'Python과 JavaScript를 지원합니다.\n코드 패턴을 자동으로 감지하기도 해요.',
  },
  {
    targetSelector: '[data-tour="input"]',
    placement: 'left',
    title: '입력 & 실행',
    body: 'stdin 입력값을 작성하고 디버깅 시작 버튼을 클릭하세요.\nAI가 코드를 분석하고 시각화 전략을 결정합니다.',
  },
  {
    targetSelector: '[data-tour="visualization"]',
    placement: 'left',
    title: '시각화 패널',
    body: 'AI가 선택한 전략(격자, 그래프, 선형 등)에 맞춰\n알고리즘 동작을 애니메이션으로 보여줍니다.\n재귀 함수의 경우 콜트리 패널이 함께 표시됩니다.',
  },
  {
    targetSelector: '[data-tour="debug-controls"]',
    placement: 'left',
    title: '디버그 컨트롤',
    body: '슬라이더를 드래그하거나 Prev/Next 버튼으로 단계별 이동하세요. Play로 자동 재생, 속도 조절도 가능합니다.\n키보드 ←→로 스텝 이동, Space로 재생/정지할 수 있어요.',
  },
  {
    targetSelector: '[data-tour="variables"]',
    placement: 'left',
    title: '변수 모니터',
    body: '각 단계에서 변수 값이 어떻게 변하는지 실시간으로 추적합니다.\n변경된 변수는 노란색으로 강조됩니다.',
  },
  {
    targetSelector: '[data-tour="gallery"]',
    placement: 'bottom-right',
    title: '예제 갤러리',
    body: '이제 직접 탐색해 보세요!\n여기를 눌러 정렬, 탐색, 그래프 등 다양한 알고리즘 예제를 바로 불러올 수 있습니다.',
  },
];
