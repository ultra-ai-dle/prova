export interface Translations {
  // ── Header ──────────────────────────────────────────────
  header_contact: string;
  header_gallery: string;
  header_guidedTour: string;
  header_badge_analyzing: string;
  header_badge_fallback: string;
  header_badge_waiting: string;

  // ── Status banner ────────────────────────────────────────
  banner_jsInitFailed: string;
  banner_javaConnectFailed: string;
  banner_pyInitFailed: string;
  banner_aiFailed: string;
  banner_runtimeError: (msg: string) => string;
  banner_aiError: (msg: string) => string;
  banner_reload: string;

  // ── Editor ───────────────────────────────────────────────
  editor_editMode: string;
  editor_wordWrapOn: string;
  editor_wordWrapOff: string;
  editor_copy: string;
  editor_copied: string;
  editor_placeholderJs: string;
  editor_placeholderJava: string;
  editor_placeholderPy: string;
  editor_langLabel: string;
  editor_cppDisabled: string;
  editor_tabTitle: (size: number, next: number) => string;
  editor_langBadgeJs: string;
  editor_langBadgeJava: string;
  editor_langBadgePy: string;

  // ── Run button ───────────────────────────────────────────
  run_enterCode: string;
  run_enterStdin: string;
  run_loadingJs: string;
  run_loadingJava: string;
  run_loadingPy: string;
  run_running: string;
  run_reinitializing: string;
  run_error: string;
  run_rerun: string;
  run_start: string;
  run_titleNoCode: string;
  run_titleNoStdin: string;

  // ── Toast messages ───────────────────────────────────────
  toast_langSwitch: (lang: string) => string;
  toast_noCode: string;
  toast_noStdin: string;

  // ── Variable monitor ─────────────────────────────────────
  variable_label: string;
  variable_empty: string;

  // ── Input panel ──────────────────────────────────────────
  input_label: string;
  input_stdin: string;
  input_placeholder: string;

  // ── Output panel ─────────────────────────────────────────
  output_label: string;

  // ── Timeline controls ────────────────────────────────────
  timeline_label: string;
  timeline_step: (current: number, total: number) => string;
  timeline_prev: string;
  timeline_play: string;
  timeline_pause: string;
  timeline_next: string;
  timeline_speed: string;
  timeline_jumpToError: string;

  // ── Example gallery ──────────────────────────────────────
  gallery_title: string;
  gallery_close: string;
  gallery_confirmTitle: string;
  gallery_confirmDesc: (title: string) => string;
  gallery_cancel: string;
  gallery_confirm: string;
  gallery_empty: string;
  gallery_footer: string;
  gallery_difficulty_easy: string;
  gallery_difficulty_medium: string;

  // ── Visualization panel ───────────────────────────────────
  viz_emptyTitle: string;
  viz_emptyBody: string;

  // ── Locale switcher ──────────────────────────────────────
  /** Label shown on the button — displays the language to switch TO */
  locale_switchTo: string;
  locale_switchTitle: string;

  // ── Contact modal ─────────────────────────────────────────
  contact_title: string;
  contact_description: string;
  contact_descriptionHighlight: string;
  contact_messagePlaceholder: string;
  contact_replyEmailLabel: string;
  contact_replyEmailOptional: string;
  contact_replyEmailPlaceholder: string;
  contact_includeCodeLabel: string;
  contact_includeCodeHint: string;
  contact_includeCodeEmpty: string;
  contact_cancel: string;
  contact_submit: string;
  contact_submitting: string;
  contact_successTitle: string;
  contact_successMessage: string;
  contact_successReply: (email: string) => string;
  contact_descriptionSuffix: string;
  contact_close: string;

  // ── Guided tour UI ────────────────────────────────────────
  tour_skip: string;
  tour_prev: string;
  tour_next: string;
  tour_finish: string;
  tour_completionTitle: string;
  tour_completionBody: string;
  tour_completionStart: string;

  // ── Tour step contents (title + body per step) ────────────
  tour_steps: ReadonlyArray<{ title: string; body: string }>;
}
