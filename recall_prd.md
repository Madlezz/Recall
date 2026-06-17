# PRD — Recall v2

> **Not Anki-lite. Just the most beautiful, dead-simple flashcard app that respects your privacy.**

---

## 0. Project North Star

### What Recall IS:
- A flashcard app your mom could use
- Beautiful by default — no ugly "developer UI"
- Zero setup required — download, open, start learning
- Your data lives on YOUR computer, forever
- Smarter scheduling (FSRS) hidden behind dead-simple buttons

### What Recall is NOT:
- Anki (we are NOT competing with Anki)
- A power-user tool with 500 settings
- A cloud service
- A productivity suite with plugins

### Our Unique Advantages:
1. **Tauri-native desktop** — lighter than Electron, feels like a real app
2. **FSRS with zero configuration** — smartest algorithm in the world, zero knobs
3. **Privacy-first** — no accounts, no cloud, no telemetry, no BS
4. **Import your Anki cards** — keep your cards, leave the complexity
5. **Beautiful by default** — dark theme, smooth animations, delightful UX
6. **Keyboard-first but mouse-friendly** — fast for power users, clear for everyone
7. **Rich cards** — Markdown, LaTeX, code highlighting out of the box

---

## 1. Overview

**Recall** is a desktop flashcard application built for focused learning without distractions, complexity, or cloud dependencies.

**Target users:** Students, learners, and anyone who wants to remember things — especially non-technical users who find Anki overwhelming.

**Core philosophy:** "It just works." No manual, no tutorial needed. Open the app → see your cards → review → done.

**Tagline:** *Beautiful. Simple. Private.*

---

## 2. Requirements

- **Platform:** Desktop (Tauri) — Windows, macOS, Linux
- **Frontend:** React 18, TypeScript strict, Vite
- **Storage:** SQLite via Drizzle ORM
- **User model:** Single local user, no login
- **Offline-first:** 100% offline forever
- **No cloud dependency:** Zero external API calls
- **No telemetry:** No analytics, tracking, or data collection
- **Portability:** Copy `.db` file or export JSON
- **UI language:** English
- **Design:** Minimal, clean, Linear-inspired. Dark mode default.
- **Font:** Inter, bundled locally
- **No external CDN:** All assets local
- **License:** MIT

---

## 3. Current Feature Status

### ✅ DONE — Core Experience
| Feature | Status |
|---------|--------|
| Dashboard with deck grid | ✅ |
| Deck CRUD (create, edit, delete) | ✅ |
| Card CRUD with rich editor (Markdown/LaTeX preview) | ✅ |
| Study mode with flip animation | ✅ |
| FSRS spaced repetition (4-tier: Again/Hard/Good/Easy) | ✅ |
| Study mode keyboard shortcuts (Space, 1-4) | ✅ |
| Session summary after review | ✅ |
| Light/dark theme toggle | ✅ |
| Settings page | ✅ |
| JSON export/import | ✅ |
| Anki .apkg import | ✅ |
| Deck stats (due, new, learning counts) | ✅ |

### ✅ DONE — Quality of Life
| Feature | Status |
|---------|--------|
| Rich card rendering (Markdown, LaTeX, code) | ✅ |
| Undo last review | ✅ |
| Tag display and filtering | ✅ |
| Daily new card limit (configurable) | ✅ |
| Study streak counter | ✅ |
| GitHub-style activity heatmap | ✅ |
| Leech card detection + warnings | ✅ |
| TTS read-aloud (offline Web Speech API) | ✅ |
| Bulk card selection + delete | ✅ |
| Deck sorting (name, due, total cards) | ✅ |
| Bury card action | ✅ |
| Move cards between decks | ✅ |
| Reset deck progress | ✅ |
| Global keyboard shortcut (R to review) | ✅ |

### ✅ DONE — v1.0 Essentials
| Feature | Status | Notes |
|---------|--------|-------|
| Seed/demo data | ✅ | 3 decks, 9 cards, review history on first launch |
| Onboarding flow | ✅ | 4-step carousel with "Skip to Dashboard" |
| Add card from anywhere | ✅ | Ctrl+N quick-add modal |
| README rewrite | ✅ | Screenshots, features, shortcuts, roadmap |
| CONTRIBUTING.md | ✅ | Open-source readiness |

### ❌ TODO — v1.0 Polish
| Feature | Priority | Why |
|---------|----------|-----|
| **Better empty states** | 🔴 HIGH | Beautiful empty states with clear CTAs |
| **Onboarding: dual-path** | 🔴 HIGH | "Try demo cards" vs "Start fresh" — currently only linear carousel |
| **Visual polish pass** | 🟡 MEDIUM | Micro-animations, transitions, hover states |
| **QA checklist** | ✅ DONE | Updated to match FSRS 4-button + all shipped features |

### 🌙 Post-v1.0 Ideas
- Image/audio card support
- Card templates (basic, cloze, image occlusion, etc.)
- P2P study sessions (local network)
- Optional password protection
- i18n / multi-language support
- E2E test suite (Playwright)

---

## 4. User Flows

### 4.1 First Launch (Onboarding)
1. User opens Recall
2. Welcome screen: "Recall — Beautiful flashcards, no cloud, no account."
3. Two options:
   - **"Try with demo cards"** → loads seed data → jumps to Dashboard
   - **"Start fresh"** → empty Dashboard with beautiful empty state
4. Dashboard shows clear CTAs whether empty or populated

### 4.2 Daily Review
1. Open Recall
2. Dashboard shows: "🔥 7-day streak · 23 cards due today"
3. Hit **Start Review** (or press R anywhere)
4. Cards appear big and centered
5. Space to reveal, 1-4 to rate
6. Session summary shows: "Nice! 18/23 cards reviewed. 82% accuracy."
7. Heatmap updates instantly

### 4.3 Quick Add
1. Press Ctrl+N anywhere
2. Quick-add modal slides up
3. Type front, Tab, back, Enter
4. Card added to last-used deck
5. Toast: "Card added to Biology"

---

## 5. Architecture (unchanged)

```
Tauri Desktop Shell
  └── React Frontend (Vite + TypeScript)
      ├── Zustand Store (global state)
      ├── shadcn/ui + Tailwind (UI)
      └── SQLite + Drizzle (persistence)
```

---

## 6. Technology Stack

- Tauri 2.x
- React 18 + TypeScript strict
- Vite
- SQLite via `@tauri-apps/plugin-sql`
- Drizzle ORM
- Tailwind CSS + shadcn/ui
- Zustand
- Lucide icons
- date-fns
- pnpm (required)
- FSRS (custom implementation)

---

## 7. Design Principles

1. **No settings needed to start.** Sensible defaults for everything.
2. **Every empty state is beautiful.** Never show a blank void.
3. **Keyboard shortcuts are discoverable.** Show hints, don't hide them.
4. **Animations are purposeful.** They guide attention, not distract.
5. **Text is clear, not technical.** "Due today" not "Scheduled reviews."
6. **Privacy is default, not optional.** No opt-in required.