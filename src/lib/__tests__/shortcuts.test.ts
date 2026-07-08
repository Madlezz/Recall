import { describe, it, expect } from "vitest";
import {
  DEFAULT_SHORTCUTS,
  normalizeShortcut,
  matchesShortcut,
  shortcutLabel,
} from "@/lib/shortcuts";

function keyEvent(partial: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: "",
    code: "",
    ctrlKey: false,
    preventDefault: () => {},
    ...partial,
  } as unknown as KeyboardEvent;
}

describe("shortcuts", () => {
  it("normalizeShortcut parses modifiers and keys", () => {
    expect(normalizeShortcut("ctrl+z")).toEqual({ ctrl: true, key: "z" });
    expect(normalizeShortcut("1")).toEqual({ ctrl: false, key: "1" });
    expect(normalizeShortcut("space")).toEqual({ ctrl: false, key: "space" });
  });

  it("matchesShortcut matches rating keys by single char", () => {
    expect(matchesShortcut(keyEvent({ key: "1" }), DEFAULT_SHORTCUTS.rateAgain)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "2" }), DEFAULT_SHORTCUTS.rateHard)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "x" }), DEFAULT_SHORTCUTS.rateAgain)).toBe(false);
  });

  it("matchesShortcut matches space reveal and ctrl+z undo", () => {
    expect(matchesShortcut(keyEvent({ code: "Space" }), DEFAULT_SHORTCUTS.reveal)).toBe(true);
    expect(matchesShortcut(keyEvent({ ctrlKey: true, key: "z" }), DEFAULT_SHORTCUTS.undo)).toBe(true);
    // ctrl modifier is required for undo
    expect(matchesShortcut(keyEvent({ key: "z" }), DEFAULT_SHORTCUTS.undo)).toBe(false);
  });

  it("matchesShortcut treats letter keys case-insensitively", () => {
    expect(matchesShortcut(keyEvent({ key: "B" }), DEFAULT_SHORTCUTS.bury)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: "b" }), DEFAULT_SHORTCUTS.bury)).toBe(true);
  });

  it("shortcutLabel renders human-readable labels", () => {
    expect(shortcutLabel(DEFAULT_SHORTCUTS.rateAgain)).toBe("1");
    expect(shortcutLabel(DEFAULT_SHORTCUTS.undo)).toBe("Ctrl+Z");
    expect(shortcutLabel(DEFAULT_SHORTCUTS.reveal)).toBe("Space");
  });

  it("DEFAULT_SHORTCUTS covers all rebindable actions", () => {
    for (const action of ["reveal", "rateAgain", "rateHard", "rateGood", "rateEasy", "bury", "snooze", "tts", "undo"] as const) {
      expect(DEFAULT_SHORTCUTS[action]).toBeTruthy();
    }
  });
});
