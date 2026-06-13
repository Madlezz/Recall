# Recall

[![CI](https://github.com/Madlezz/Recall/actions/workflows/ci.yml/badge.svg)](https://github.com/Madlezz/Recall/actions/workflows/ci.yml)

> *Beautiful flashcards that live on your computer. No cloud, no account, no nonsense.*

**Recall** is a desktop flashcard app built for focused learning. It uses FSRS-based scheduling for modern spaced repetition — but you just open it and start reviewing. Your data stays on your machine, always.

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
- Keyboard-first: `Space` reveal, `1`–`4` rate, `R` to start review, `Ctrl+N` quick-add

### 🎮 Stay Motivated
- **XP & levels** — earn XP per review, climb from Curious Mind to Legend
- **Achievements** — 14 milestones (streaks, volume, accuracy, time-based)
- **Daily goal** — set a target, watch the progress bar, confetti on completion
- **Session summaries** — ratings breakdown, XP earned, achievement unlocks
- **Confetti celebrations** — level-ups, achievements, goal hits, good accuracy

### 🧘 Study Tools
- **Focus timer** — Pomodoro with 15/25/45m presets
- **Ambient soundscapes** — Rain, Cafe, Lofi (all synthesized locally, zero files)
- **Match game** — turn cards into a tile-matching puzzle
- **Review calendar** — month grid showing study activity heatmap
- **Sound effects** — card flip, correct/incorrect feedback, level-up fanfares

### 📊 Analytics
- **Stats dashboard** — review volume, rating distribution, time-of-day patterns
- **Top decks** — see which topics get the most reviews
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
pnpm dev            # Browser-only preview
```

---

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `Space` | Reveal answer |
| `1`–`4` | Rate Again / Hard / Good / Easy |
| `R` | Start review |
| `Ctrl+N` | Quick-add card |
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

---

## Tech

| What | With |
|------|------|
| Desktop | Tauri 2 |
| UI | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Storage | SQLite (Drizzle ORM) |
| State | Zustand |
| Algorithm | FSRS (ts-fsrs) |
| Icons | Lucide |

---

## License

MIT © [Madlezz](https://github.com/Madlezz)