# Recall

> *Beautiful. Simple. Private.* — A local-first flashcard app that just works.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**Recall** is a desktop flashcard app designed for focused learning without distractions, complexity, or cloud dependencies. It uses the FSRS algorithm (the smartest in the world) but hides all the knobs — you just study, and it handles the rest.

---

## Why Recall?

| Feature                  | Recall                       | Anki                | Quizlet            |
|--------------------------|------------------------------|---------------------|---------------------|
| **Algorithm**            | FSRS                         | SM-2 / FSRS (plugin)| Proprietary        |
| **Setup**                | Open and go                  | Configure as needed | Sign up required   |
| **Privacy**              | 100% offline, no account     | Optional sync       | Cloud-only         |
| **Rich Content**         | Markdown, LaTeX, code        | Via plugins         | Limited            |
| **Anki Import**          | One-click `.apkg`            | Native              | ❌                 |
| **Design**               | Dark-first, clean            | Classic             | Gamified           |
| **Portable**             | Copy one folder anywhere     | Profile-based       | Web-only           |

---

## Features

### 🧠 Smart Review
- **FSRS algorithm** — forget SM-2. Recall uses the most accurate spaced repetition algorithm ever made
- **Zero configuration** — no intervals to tweak, no settings to optimize. It just works
- **4-tier ratings** — Again, Hard, Good, Easy — simple but powerful

### 🎨 Beautiful by Default
- **Dark-first design** with light mode toggle
- **Smooth animations** — card flips, micro-interactions
- **Beautiful empty states** — never stare at blank pages
- **Confetti celebrations** — because completing reviews should feel good

### ⌨️ Speed-First
- **Keyboard shortcuts** everywhere — Space to reveal, 1-4 to rate
- **Global hotkey** — press `R` from anywhere to start reviewing
- **Undo support** — mis-clicked? Ctrl+Z brings it back
- **Bury cards** — skip without rating

### 📊 Track Progress
- **Study streak counter** — how many days in a row?
- **GitHub-style activity heatmap** — visual motivation
- **Session summaries** — what you reviewed, how you did
- **Leech detection** — warns you about cards you keep failing

### 📝 Rich Content
- **Markdown** — headings, lists, links, formatting
- **LaTeX math** — `$E=mc^2$` renders beautifully
- **Code highlighting** — syntax-colored code blocks
- **Tags** — organize and filter cards your way

### 🔒 Privacy-First
- **No accounts** — your data stays on your computer
- **No cloud** — works 100% offline forever
- **No telemetry** — we don't track anything
- **Portable** — copy one folder to move between computers

### 📂 Import & Export
- **Anki `.apkg` import** — bring your cards from Anki
- **JSON export** — git-friendly, human-readable
- **JSON import** — replace or merge mode
- **Deck-specific export** — share individual decks

---

## Installation

### Download (Windows, macOS, Linux)
Coming soon — download from [Releases](https://github.com/Madlezz/Recall/releases).

### Run from Source
```bash
# Prerequisites: Node.js 18+, pnpm, Rust (for Tauri)
pnpm install
pnpm tauri dev      # Full desktop app
# or
pnpm dev            # Web-only (browser, no native features)
```

---

## Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Desktop     | Tauri 2.x                               |
| Frontend    | React 18 + TypeScript (strict)          |
| Bundler     | Vite                                    |
| Database    | SQLite (via Drizzle ORM)                |
| UI          | Tailwind CSS + shadcn/ui + Lucide icons |
| State       | Zustand                                 |
| Scheduling  | Custom FSRS implementation              |

---

## Philosophy

- **"It just works."** — No manual needed. Open → review → done.
- **Your mom could use it.** — Dead simple UI, clear labels, no jargon.
- **No settings rabbit holes.** — Sensible defaults. Power features are there if you want them.
- **Not competing with Anki.** — Anki is incredible for power users. Recall takes a different path: simplicity first.

---

## License

MIT © [Madlezz](https://github.com/Madlezz)

---

*Made with ❤️ in Indonesia. No cloud, no accounts, no BS.*