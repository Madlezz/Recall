# Recall

> *Beautiful flashcards that live on your computer. No cloud, no account, no nonsense.*

**Recall** is a desktop flashcard app built for focused learning. It uses the smartest spaced repetition algorithm under the hood, but all you need to do is open it and start reviewing. Your data stays on your machine — always.

---

## Features

### 🧠 Smart Scheduling
FSRS scheduling runs silently in the background. You just hit **Again**, **Hard**, **Good**, or **Easy** — Recall figures out the rest. No settings to tweak.

### ⌨️ Built for Speed
- `Space` to reveal, `1`–`4` to rate
- `R` from anywhere to start your review
- `Ctrl+Z` to undo a misclick
- Everything works with keyboard — or mouse, if you prefer

### 📝 Rich Cards
Plain text works great. But if you want more:
- **Markdown** — headings, lists, formatting
- **LaTeX** — `$E=mc^2$` → renders beautifully
- **Code blocks** — with syntax highlighting

### 🔒 Privacy by Default
- No account, no login, no cloud
- 100% offline — works on a plane, in a cave, anywhere
- Zero telemetry — we don't even know you exist
- Portable: copy one folder and move to another computer

### 📊 Stay Motivated
- Study streak counter
- Activity heatmap (yes, like GitHub's)
- Session summaries after every review
- Confetti when you do well (because why not)

### 📂 Import & Export
- Import your Anki `.apkg` decks
- Export/import JSON — human-readable and git-friendly
- Deck-specific exports for sharing

### 🎨 Dark-First Design
Ships with dark mode as default. Light mode available in settings. Clean, minimal, no clutter.

---

## Quick Start

```bash
pnpm install
pnpm tauri dev       # Full desktop app
# or
pnpm dev            # Browser-only preview
```

Pre-built downloads coming soon.

---

## Tech

| What | With |
|------|------|
| Desktop shell | Tauri 2 |
| UI | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite (via Drizzle ORM) |
| State | Zustand |
| Icons | Lucide |

---

## Philosophy

- **Open the app, start learning.** No manual needed.
- **Defaults over settings.** Sensible choices out of the box.
- **Your data is yours.** No cloud dependency, ever.
- **Simple ≠ limited.** Rich content, smart scheduling — just hidden until you need it.

---

## License

MIT © [Madlezz](https://github.com/Madlezz)