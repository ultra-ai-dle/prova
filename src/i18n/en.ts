import type { Translations } from "./types";

export const en: Translations = {
  // ── Header ──────────────────────────────────────────────
  header_contact: "Contact",
  header_gallery: "Example Gallery",
  header_guidedTour: "Guided Tour",
  header_badge_analyzing: "Analyzing algorithm...",
  header_badge_fallback: "○ Algorithm detection failed",
  header_badge_waiting: "Waiting for execution...",

  // ── Status banner ────────────────────────────────────────
  banner_jsInitFailed:
    "JS environment failed to initialize. Please refresh the page.",
  banner_javaConnectFailed:
    "Could not connect to the Java runtime. Check your settings or try again later.",
  banner_pyInitFailed:
    "Python environment failed to initialize. Please refresh the page.",
  banner_aiFailed:
    "AI connection failed. Tracking code flow with basic variable view.",
  banner_runtimeError: (msg) => `Runtime error: ${msg}`,
  banner_aiError: (msg) => `AI analysis failed: ${msg}`,
  banner_reload: "Refresh",

  // ── Editor ───────────────────────────────────────────────
  editor_editMode: "Switch to edit mode",
  editor_wordWrapOn: "Disable word wrap",
  editor_wordWrapOff: "Enable word wrap",
  editor_copy: "Copy code",
  editor_copied: "Copied!",
  editor_placeholderJs: "Enter your JavaScript code here.",
  editor_placeholderJava: "Enter your Java code here.",
  editor_placeholderPy: "Enter your Python code here.",
  editor_langLabel: "Select language",
  editor_cppDisabled: "C++ (coming soon)",
  editor_tabTitle: (size, next) =>
    `Tab size: ${size} — Click to switch to Tab ${next}`,

  // ── Run button ───────────────────────────────────────────
  run_enterCode: "Enter code to begin",
  run_enterStdin: "Enter input to begin",
  run_loadingJs: "Loading JS environment...",
  run_loadingJava: "Loading Java environment...",
  run_loadingPy: "Loading Python...",
  run_running: "Debugging...",
  run_reinitializing: "Reinitializing...",
  run_error: "Debug unavailable",
  run_rerun: "▶ Run again",
  run_start: "▶ Start debugging",
  run_titleNoCode: "Enter code before starting the debugger.",
  run_titleNoStdin: "Enter stdin input before starting the debugger.",

  // ── Toast messages ───────────────────────────────────────
  toast_langSwitch: (lang) =>
    `Detected ${lang} code. Language switched — please run again.`,
  toast_noCode: "Enter code before starting the debugger.",
  toast_noStdin: "Enter stdin input before starting the debugger.",

  // ── Variable monitor ─────────────────────────────────────
  variable_label: "Variable Monitor",
  variable_empty: "Variables will appear after execution.",

  // ── Input panel ──────────────────────────────────────────
  input_label: "Input",
  input_stdin: "stdin",
  input_placeholder: "Enter input values",

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
  timeline_jumpToError: "Jump to error",

  // ── Example gallery ──────────────────────────────────────
  gallery_title: "Example Gallery",
  gallery_close: "Close",
  gallery_confirmTitle: "Replace current code?",
  gallery_confirmDesc: (title) =>
    `"${title}" will be loaded into the editor.`,
  gallery_cancel: "Cancel",
  gallery_confirm: "Confirm",
  gallery_empty: "No examples in this category.",
  gallery_footer: "Python · JavaScript supported | Click to load into editor",

  // ── Locale switcher ──────────────────────────────────────
  locale_switchTo: "한국어",
  locale_switchTitle: "한국어로 전환",
};
