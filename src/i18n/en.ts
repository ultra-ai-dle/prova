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
  editor_langBadgeJs: "JavaScript ES2022 · Synchronous only · async/await not supported",
  editor_langBadgeJava: "Java · Remote execution service",
  editor_langBadgePy: "Python 3.11 · Standard Library · No external packages",

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
  gallery_difficulty_easy: "Easy",
  gallery_difficulty_medium: "Medium",

  // ── Visualization panel ───────────────────────────────────
  viz_emptyTitle: "Visualization will appear here after execution",
  viz_emptyBody: "Automatically detects BFS, DFS, Stacks, Queues, and Grid traversals.",

  // ── Locale switcher ──────────────────────────────────────
  locale_switchTo: "한국어",
  locale_switchTitle: "한국어로 전환",

  // ── Contact modal ─────────────────────────────────────────
  contact_title: "Report a Bug / Contact",
  contact_description: "Bugs, suggestions, anything goes.",
  contact_descriptionHighlight: "Every bug report is welcome.",
  contact_messagePlaceholder:
    "e.g. After running bubble sort, the error highlight appears on the wrong line.\n\nSteps to reproduce:\n1. ...\n2. ...",
  contact_replyEmailLabel: "Reply email",
  contact_replyEmailOptional: "(optional)",
  contact_replyEmailPlaceholder: "Enter your email if you'd like a reply when fixed",
  contact_includeCodeLabel: "Attach editor code",
  contact_includeCodeHint: "Including your code makes it much easier to reproduce the bug. Thank you 🐸",
  contact_includeCodeEmpty: "(editor is empty)",
  contact_cancel: "Cancel",
  contact_submit: "Send",
  contact_submitting: "Sending...",
  contact_successTitle: "Message sent!",
  contact_successMessage: "Thank you for the feedback. We'll look into it quickly.",
  contact_successReply: (email) => `We'll reply to ${email} once it's fixed.`,
  contact_descriptionSuffix: "The more detail you provide, the faster we can fix it.",
  contact_close: "Close",

  // ── Guided tour UI ────────────────────────────────────────
  tour_skip: "Skip",
  tour_prev: "Prev",
  tour_next: "Next",
  tour_finish: "Let's go!",
  tour_completionTitle: "You're all set!",
  tour_completionBody:
    "Start writing code and hit the debug button.\nClick the ? button at the top right to replay this tour.",
  tour_completionStart: "Get started",

  // ── Tour step contents ────────────────────────────────────
  tour_steps: [
    {
      title: "Welcome to Prova",
      body: "An AI-powered algorithm visualizer & debugger.\nLet's walk you through the key features. This tour takes about a minute.",
    },
    {
      title: "Code Editor",
      body: "Write your algorithm code here.\nSupports BFS, DFS, DP, and more. Sample code is pre-filled.\nUse the Tab button at the top to switch indent size.",
    },
    {
      title: "Language Selection",
      body: "Python and JavaScript are supported.\nProva can also auto-detect the language from your code.",
    },
    {
      title: "Input & Run",
      body: "Enter stdin input and click the debug button.\nAI will analyze your code and decide the best visualization strategy.",
    },
    {
      title: "Visualization Panel",
      body: "Animates the algorithm using the strategy chosen by AI\n(grid, graph, linear array, etc.).\nA call tree panel appears for recursive functions.",
    },
    {
      title: "Debug Controls",
      body: "Drag the slider or use Prev/Next to step through execution. Play for auto-playback, with adjustable speed.\nUse ←→ keys to step, Space to play/pause.",
    },
    {
      title: "Variable Monitor",
      body: "Tracks how variable values change at each step in real time.\nModified variables are highlighted in yellow.",
    },
    {
      title: "Example Gallery",
      body: "Explore on your own!\nClick here to instantly load sorting, search, graph, and other algorithm examples.",
    },
  ],
};
