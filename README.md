# Recall

[![CI](https://github.com/Madlezz/Recall/actions/workflows/ci.yml/badge.svg)](https://github.com/Madlezz/Recall/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Madlezz/Recall)](https://github.com/Madlezz/Recall/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Madlezz/Recall/releases/latest)

> *Beautiful flashcards that live on your computer. No cloud, no account, no nonsense.*

**Recall** is a desktop flashcard app built for focused learning. It uses FSRS-based scheduling for modern spaced repetition — but you just open it and start reviewing. Your data stays on your machine, always.

---

## Why Recall?

| | Recall | Anki | RemNote / Mochi |
|---|---|---|---|
| Algorithm | **FSRS** (2023, state-of-art) | SM-2 (1987) | Proprietary |
| Storage | **Local SQLite** | Local (custom format) | Cloud |
| Account required | **No** | No | Yes |
| Open source | **Yes** (MIT) | Yes (AGPL) | No |
| Native desktop | **Yes** (Tauri, Rust) | Yes (Qt, Python) | Electron |
| Stack | **React + TypeScript** | Python + Qt | React |

Anki pioneered spaced repetition and has an enormous card ecosystem, but its codebase is
15+ years old and difficult to extend. Cloud alternatives like RemNote require accounts and
subscriptions. Recall fills the gap: a **modern, open-source, privacy-first** desktop app
that implements FSRS — the current scientific standard for spaced repetition — on a maintainable,
contributor-friendly TypeScript stack.

---

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)

![Study Mode](docs/screenshots/study.png)

![Stats](docs/screenshots/stats.png)

---

## Features

### 🧠 Smart Study
- **FSRS scheduling** — Again / Hard / Good / Easy, the algorithm handles the rest
- **Cloze deletion** — `{{c1::hidden text}}` fill-in-the-blank cards
- **Rich cards** — Markdown, LaTeX, syntax-highlighted code blocks
- **Anki import** — bring your `.apkg` decks
- **CSV import** — upload a spreadsheet, map columns
- **Custom study** — deck, count, tag filter, new-only
- **Card browser** — search, filter, sort, bulk tag/delete/move
- Keyboard-first: `Space` reveal, `1`–`4` rate, `R` to start review, `Ctrl+N` quick-add

### 🎮 Stay Motivated
- **XP & levels** — earn XP per review, climb from Curious Mind to Legend
- **Achievements** — 14 milestones (streaks, volume, accuracy, time-based)
- **Daily goal** — set a target, watch the progress bar, confetti on completion
- **Session summaries** — ratings breakdown, XP earned, achievement unlocks

### 🧘 Study Tools
- **Focus timer** — Pomodoro with 15/25/45m presets
- **Ambient soundscapes** — Rain, Cafe, Lofi (synthesized locally, zero files)
- **Match game** — turn cards into a tile-matching puzzle
- **Review calendar** — month grid showing study activity heatmap
- **Sound effects** — card flip, correct/incorrect feedback, level-up fanfares

### 📊 Analytics
- **Stats dashboard** — review volume, rating distribution, time-of-day patterns
- **Deck health** — retention %, leeches, overdue per deck
- **Activity heatmap** — GitHub-style contribution graph

### 🔒 Privacy First
- No account, no cloud, no telemetry
- 100% offline — SQLite database on your machine
- JSON export/import — portable and human-readable

---

## Quick Start

```bash
pnpm install
pnpm tauri dev       # Full desktop app
# or
pnpm dev             # Browser-only preview
```

---

## Download

Pre-built binaries are available on the [Releases page](https://github.com/Madlezz/Recall/releases/latest):

| Platform | File |
|----------|------|
| Windows | `.exe` or `.msi` installer |
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Linux | `.AppImage` or `.deb` |

Or build from source — see [Quick Start](#quick-start).

---

## Security

Recall is a local-first application — your data never leaves your machine. We take security seriously:

- **Automated auditing**: `cargo audit` (Rust) and Dependabot (JS/TS) run on every CI push
- **CodeQL analysis**: GitHub CodeQL scans for vulnerabilities on every PR
- **Responsible disclosure**: See [SECURITY.md](SECURITY.md) for reporting vulnerabilities

For known transitive vulnerabilities in upstream dependencies, see [SECURITY.md](SECURITY.md).

---

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `Space` | Reveal answer |
| `1`–`4` | Rate Again / Hard / Good / Easy |
| `R` | Start review |
| `B` | Bury card |
| `S` | Snooze card |
| `Ctrl+N` | Quick-add card (in-app) |
| `Ctrl+Shift+N` | Quick-add card (global, works when minimized) |
| `Ctrl+Z` | Undo last review |
| `?` | Show all shortcuts |

---

## Roadmap

- [x] Exam deadline mode — set a date, cards prioritize
- [x] Source-linked cards — attach references to your knowledge
- [x] Card quality checker — flag cards that need improvement
- [x] Screenshots in README
- [x] Desktop notifications for reviews
- [x] Card browser — table view with search, filter, sort, bulk operations
- [x] Custom study — configurable sessions: deck, card count, tag, new-only
- [x] Deck health — retention %, leech count, overdue on dashboard cards
- [x] CSV import — front,back,hint,tags with preview + deck selector
- [x] Keyboard shortcuts — B (bury), S (snooze) + elapsed timer in study
- [x] Sound volume slider — master gain for effects, chimes, soundscapes
- [x] Bulk tag management — add, set, or remove tags on selected cards

---

## Contributing

Recall is open to contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions,
project structure, and code style guidelines.

**Looking for a place to start?**
- Browse [`good first issue`](https://github.com/Madlezz/Recall/labels/good%20first%20issue) tags
- Check the roadmap above for planned features
- Open an issue to discuss before opening a large PR

---

## Tech

| What | With |
|------|------|
| Desktop | Tauri 2 |
| UI | React 19 + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Storage | SQLite (Drizzle ORM) |
| State | Zustand |
| Algorithm | FSRS (ts-fsrs) |
| Icons | Lucide |

---

## License

MIT © [Madlezz](https://github.com/Madlezz)