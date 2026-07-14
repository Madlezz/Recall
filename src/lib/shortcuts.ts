// Single source of truth for keyboard shortcuts.
// Both the study-mode key handler and the shortcut-help dialog read from here
// so the displayed help always matches the actual behavior.

export type ShortcutAction =
  | "reveal"
  | "rateAgain"
  | "rateHard"
  | "rateGood"
  | "rateEasy"
  | "bury"
  | "snooze"
  | "tts"
  | "undo"
  | "commandPalette"
  | "quickAdd"
  | "showHelp"
  | "closeDialog"
  | "importHub";

// A shortcut is stored as a normalized string:
//   - modifier prefixes: "ctrl+" (case-insensitive, joined with "+")
//   - the main key: a single character ("1", "b") or a named key ("space", "escape")
// Example: "ctrl+z", "1", "space", "escape"
export type ShortcutMap = Record<ShortcutAction, string>;

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  reveal: "space",
  rateAgain: "1",
  rateHard: "2",
  rateGood: "3",
  rateEasy: "4",
  bury: "b",
  snooze: "s",
  tts: "t",
  undo: "ctrl+z",
  commandPalette: "ctrl+k",
  quickAdd: "ctrl+n",
  showHelp: "?",
  importHub: "i",
  closeDialog: "escape",
};

// Actions the user is allowed to rebind from the settings panel.
// Global/non-study actions are excluded to keep the UI focused.
export const REBINDABLE_ACTIONS: ShortcutAction[] = [
  "reveal",
  "rateAgain",
  "rateHard",
  "rateGood",
  "rateEasy",
  "bury",
  "snooze",
  "tts",
  "undo",
];

export interface NormalizedKey {
  ctrl: boolean;
  key: string; // lowercased single char, or named key
}

export function normalizeShortcut(raw: string): NormalizedKey {
  const parts = raw.toLowerCase().split("+");
  const ctrl = parts.includes("ctrl");
  const key = parts[parts.length - 1];
  return { ctrl, key };
}

// Returns true if the keyboard event matches the given shortcut string.
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const { ctrl, key } = normalizeShortcut(shortcut);

  if (event.ctrlKey !== ctrl) return false;

  // Named keys: map KeyboardEvent.key / .code to our canonical names.
  const eventKey = event.key.toLowerCase();
  const eventCode = event.code.toLowerCase();

  if (key === "space") return eventCode === "space";
  if (key === "escape") return eventKey === "escape";
  if (key === "?") return eventKey === "?";

  // Single-character keys.
  return eventKey === key;
}

// Human-readable label for display (used by the help dialog and settings UI).
export function shortcutLabel(shortcut: string): string {
  const { ctrl, key } = normalizeShortcut(shortcut);
  const named: Record<string, string> = {
    space: "Space",
    escape: "Esc",
    "?": "?",
  };
  const main = named[key] ?? key.toUpperCase();
  return ctrl ? `Ctrl+${main}` : main;
}
