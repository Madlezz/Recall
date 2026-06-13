# Changelog

All notable changes to Recall are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-06-13

### Added
- **FSRS scheduling** — modern spaced repetition (Again / Hard / Good / Easy)
- **Cloze deletion** — `{{c1::hidden}}` fill-in-the-blank cards
- **Rich cards** — Markdown, LaTeX (KaTeX), syntax-highlighted code blocks
- **Anki import** — `.apkg` deck import with report
- **CSV import** — front/back/hint/tags with preview and deck selector
- **Card browser** — table view with search, filter, sort, and bulk operations
- **Bulk tag management** — add, set, or remove tags on selected cards
- **Custom study sessions** — configurable by deck, count, tag, new-only
- **Deck health dashboard** — retention %, leeches, overdue per deck
- **Stats dashboard** — review volume, rating distribution, time-of-day patterns
- **Activity heatmap** — GitHub-style contribution graph
- **XP & levels** — Curious Mind → Legend progression
- **Achievements** — 14 milestones across streaks, volume, accuracy, time
- **Daily goal** — set a target, progress bar, confetti on completion
- **Focus timer** — Pomodoro with 15/25/45m presets
- **Ambient soundscapes** — Rain, Cafe, Lofi (synthesized locally, zero files)
- **Match game** — tile-matching puzzle from card content
- **Exam deadline mode** — countdown + cram prioritization
- **Source-linked cards** — attach reference URLs
- **Card quality checker** — flag vague/stale/long/duplicate cards
- **Desktop notifications** — due card reminders via OS notification
- **Sound effects** — card flip, correct/incorrect feedback, level-up fanfares
- **Volume control** — master gain slider
- **Undo last review** — `Ctrl+Z` to revert
- **Keyboard shortcuts** — Space, 1–4, R, B, S, Ctrl+N, Ctrl+Z, ?
- **Review calendar** — month grid heatmap of study activity
- **JSON export/import** — portable, human-readable backup
- **Dark/light theme** — system-aware
- **Onboarding** — demo decks or start fresh
- **Privacy-first** — 100% offline, SQLite local storage, zero telemetry

### Technical
- Tauri v2 with cross-platform builds: Windows (MSI), macOS (DMG), Linux (AppImage)
- React 18 + TypeScript strict mode
- SQLite via `@tauri-apps/plugin-sql` + Drizzle ORM
- FSRS via `ts-fsrs` v5
- 80+ unit tests (Vitest) + E2E smoke tests (Playwright)
- GitHub Actions CI: lint → test → build on every push/PR