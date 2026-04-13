import type { Translations } from "./types";

export const ko: Translations = {
  // ── Header ──────────────────────────────────────────────
  header_contact: "문의하기",
  header_gallery: "예제 갤러리",
  header_guidedTour: "가이드 투어 다시보기",
  header_badge_analyzing: "알고리즘 분석 중...",
  header_badge_fallback: "○ 알고리즘 감지 실패",
  header_badge_waiting: "실행 대기 중...",

  // ── Status banner ────────────────────────────────────────
  banner_jsInitFailed:
    "JS 환경 초기화에 실패했습니다. 페이지를 새로고침해 주세요.",
  banner_javaConnectFailed:
    "Java 실행 환경에 연결하지 못했습니다. 설정을 확인하거나 잠시 후 다시 시도해 주세요.",
  banner_pyInitFailed:
    "Python 환경 초기화에 실패했습니다. 페이지를 새로고침해 주세요.",
  banner_aiFailed:
    "AI 연결에 실패했습니다. 기본 변수 뷰로 코드 흐름을 추적합니다.",
  banner_runtimeError: (msg) => `실행 오류: ${msg}`,
  banner_aiError: (msg) => `AI 분석 실패: ${msg}`,
  banner_reload: "새로고침",

  // ── Editor ───────────────────────────────────────────────
  editor_editMode: "편집 모드로 전환",
  editor_wordWrapOn: "줄 바꿈 끄기",
  editor_wordWrapOff: "줄 바꿈 켜기",
  editor_copy: "코드 복사",
  editor_copied: "복사됨!",
  editor_placeholderJs: "여기에 JavaScript 코드를 입력하세요.",
  editor_placeholderJava: "여기에 Java 코드를 입력하세요.",
  editor_placeholderPy: "여기에 Python 코드를 입력하세요.",
  editor_langLabel: "코드 언어 선택",
  editor_cppDisabled: "C++ (준비중)",
  editor_tabTitle: (size, next) =>
    `현재 Tab ${size} — 클릭하여 Tab ${next}로 전환`,
  editor_langBadgeJs: "JavaScript ES2022 · 동기 코드만 지원 · async/await 미지원",
  editor_langBadgeJava: "Java · 외부 실행 서비스 연동",
  editor_langBadgePy: "Python 3.11 · 표준 라이브러리 · 외부 패키지 미지원",

  // ── Run button ───────────────────────────────────────────
  run_enterCode: "코드를 입력하세요",
  run_enterStdin: "예시 입력을 입력하세요",
  run_loadingJs: "JS 환경 준비 중...",
  run_loadingJava: "Java 환경 준비 중...",
  run_loadingPy: "Python 준비 중...",
  run_running: "디버깅 중...",
  run_reinitializing: "초기화 중...",
  run_error: "디버깅 불가",
  run_rerun: "▶ 디버깅 다시 실행",
  run_start: "▶ 디버깅 시작",
  run_titleNoCode: "코드를 입력한 후 디버깅을 시작하세요.",
  run_titleNoStdin: "예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.",

  // ── Toast messages ───────────────────────────────────────
  toast_langSwitch: (lang) =>
    `코드 패턴을 감지해 ${lang}로 전환했습니다. 다시 실행해 주세요.`,
  toast_noCode: "코드를 입력한 후 디버깅을 시작하세요.",
  toast_noStdin: "예시 입력(stdin)을 입력한 후 디버깅을 시작하세요.",

  // ── Variable monitor ─────────────────────────────────────
  variable_label: "Variable Monitor",
  variable_empty: "실행 후 변수가 표시됩니다.",

  // ── Input panel ──────────────────────────────────────────
  input_label: "Input",
  input_stdin: "stdin",
  input_placeholder: "입력값을 작성하세요",

  // ── Output panel ─────────────────────────────────────────
  output_label: "Output",

  // ── Timeline controls ────────────────────────────────────
  timeline_label: "Debug Controls",
  timeline_step: (current, total) => `Step ${current} / ${total}`,
  timeline_prev: "Prev",
  timeline_play: "Play",
  timeline_pause: "Pause",
  timeline_next: "Next",
  timeline_speed: "Speed",
  timeline_jumpToError: "에러 위치로 이동",

  // ── Example gallery ──────────────────────────────────────
  gallery_title: "예제 갤러리",
  gallery_close: "닫기",
  gallery_confirmTitle: "현재 코드를 덮어쓸까요?",
  gallery_confirmDesc: (title) => `"${title}" 예제로 교체됩니다.`,
  gallery_cancel: "취소",
  gallery_confirm: "확인",
  gallery_empty: "해당 카테고리에 예제가 없습니다.",
  gallery_footer: "Python · JavaScript 지원 | 선택하면 에디터에 로드",
  gallery_difficulty_easy: "쉬움",
  gallery_difficulty_medium: "보통",

  // ── Visualization panel ───────────────────────────────────
  viz_emptyTitle: "실행 후 시각화가 여기에 표시됩니다",
  viz_emptyBody: "BFS, DFS, 스택, 큐, 격자 탐색을 자동으로 감지합니다.",

  // ── Locale switcher ──────────────────────────────────────
  locale_switchTo: "EN",
  locale_switchTitle: "Switch to English",

  // ── Contact modal ─────────────────────────────────────────
  contact_title: "버그 제보 / 문의하기",
  contact_description: "버그, 개선 의견, 뭐든 좋아요.",
  contact_descriptionHighlight: "어떤 버그도 환영합니다.",
  contact_messagePlaceholder:
    "예) 버블 정렬 코드 실행 후 3번 줄에 에러 하이라이트가 잘못 표시됩니다.\n\n재현 방법:\n1. ...\n2. ...",
  contact_replyEmailLabel: "회신 이메일",
  contact_replyEmailOptional: "(선택)",
  contact_replyEmailPlaceholder: "수정 완료 후 회신을 원하시면 이메일을 입력해주세요",
  contact_includeCodeLabel: "에디터 코드 함께 첨부하기",
  contact_includeCodeHint: "버그 재현에 코드가 있으면 훨씬 도움이 됩니다. 협조해 주셔서 감사합니다 🐸",
  contact_includeCodeEmpty: "(에디터가 비어 있습니다)",
  contact_cancel: "취소",
  contact_submit: "문의 보내기",
  contact_submitting: "전송 중...",
  contact_successTitle: "문의가 전송되었습니다!",
  contact_successMessage: "소중한 피드백 감사합니다. 빠르게 확인하겠습니다.",
  contact_successReply: (email) => `수정 완료 후 ${email}로 회신드릴게요.`,
  contact_descriptionSuffix: "재현 방법이나 증상을 최대한 구체적으로 적어주시면 더 빠르게 고칠 수 있어요.",
  contact_close: "닫기",

  // ── Guided tour UI ────────────────────────────────────────
  tour_skip: "건너뛰기",
  tour_prev: "이전",
  tour_next: "다음",
  tour_finish: "시작하기!",
  tour_completionTitle: "준비 완료!",
  tour_completionBody:
    "이제 코드를 작성하고 디버깅을 시작해 보세요.\n투어를 다시 보려면 우측 상단 ? 버튼을 클릭하세요.",
  tour_completionStart: "시작하기",

  // ── Tour step contents ────────────────────────────────────
  tour_steps: [
    {
      title: "Prova에 오신 것을 환영합니다",
      body: "AI가 알고리즘의 실행 흐름을 시각화해 주는 디버거입니다.\n핵심 기능을 안내해 드릴게요. 이 투어는 약 1분 정도 걸립니다.",
    },
    {
      title: "코드 에디터",
      body: "여기에 알고리즘 코드를 작성하세요.\nBFS, DFS, DP 등 다양한 알고리즘을 지원합니다. 기본 예시 코드가 미리 채워져 있어요.\n상단의 Tab 버튼으로 들여쓰기 크기를 전환할 수 있습니다.",
    },
    {
      title: "언어 선택",
      body: "Python과 JavaScript를 지원합니다.\n코드 패턴을 자동으로 감지하기도 해요.",
    },
    {
      title: "입력 & 실행",
      body: "stdin 입력값을 작성하고 디버깅 시작 버튼을 클릭하세요.\nAI가 코드를 분석하고 시각화 전략을 결정합니다.",
    },
    {
      title: "시각화 패널",
      body: "AI가 선택한 전략(격자, 그래프, 선형 등)에 맞춰\n알고리즘 동작을 애니메이션으로 보여줍니다.\n재귀 함수의 경우 콜트리 패널이 함께 표시됩니다.",
    },
    {
      title: "디버그 컨트롤",
      body: "슬라이더를 드래그하거나 Prev/Next 버튼으로 단계별 이동하세요. Play로 자동 재생, 속도 조절도 가능합니다.\n키보드 ←→로 스텝 이동, Space로 재생/정지할 수 있어요.",
    },
    {
      title: "변수 모니터",
      body: "각 단계에서 변수 값이 어떻게 변하는지 실시간으로 추적합니다.\n변경된 변수는 노란색으로 강조됩니다.",
    },
    {
      title: "예제 갤러리",
      body: "이제 직접 탐색해 보세요!\n여기를 눌러 정렬, 탐색, 그래프 등 다양한 알고리즘 예제를 바로 불러올 수 있습니다.",
    },
  ],
};
