# Product

## Register

product

## Platform

web (React + Vite SPA; same UI also ships inside a Tauri desktop shell and as a PWA)

## Users

Self-directed learners (students, professionals) doing a daily 10-30 minute review habit on desktop or mobile PWA. No account, no cloud lock-in; data stays local-first. Success = the user comes back tomorrow: the daily ritual (due count, streak, first review) must be visible within seconds of opening. Secondary: power SRS users migrating from Anki, who need import fidelity and deck-at-scale browsing to not fall apart.

## Product Purpose

FSRS-grade spaced repetition with the habit loop built in, not bolted on. Streaks, XP, daily goals, focus timer, and match game are native. FSRS scheduling is on by default; sync is optional E2E self-hosted. Exists because Anki requires too much setup and willpower, and cloud-first alternatives take your data. Success looks like: reviews done daily, retention high, zero time spent configuring.

## Positioning

The habit-first SRS. Anki-grade scheduling science with a native engagement loop, local-first and MIT open source. Every screen reinforces: open, see what is due, start reviewing in one tap.

## Brand Personality

Encouraging, calm, dependable. Warm without hype; the tone of a good habit coach. Reliability signals (autosave, offline, local data) matter as much as motivational ones.

## Anti-references

Not Anki's raw-power-ugly UI: no dense config dumps, no gray utilitarianism, no engagement features hidden three dialogs deep.

## Design Principles

- Habit first: the path from open app to first review is the shortest path on every screen.
- Familiar over novel: standard app-shell patterns, consistent component vocabulary; the tool disappears into the task.
- State-rich and honest: every interactive component ships hover, focus, active, disabled, loading, error, empty. Empty states teach.
- Motion conveys state only. 150-250ms, ease-out exponential, reduced-motion variants everywhere.
- Local-first trust: UI always reflects what is saved, never pretends network state exists when it does not.

## Accessibility & Inclusion

WCAG AA: 4.5:1 body text contrast, full keyboard operability with visible focus, reduced-motion alternatives for every animation. Three themes (light, dark, high-contrast) already in tokens. Screen reader support documented in ACCESSIBILITY.md.
