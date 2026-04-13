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

  // ── Locale switcher ──────────────────────────────────────
  locale_switchTo: "EN",
  locale_switchTitle: "Switch to English",
};
