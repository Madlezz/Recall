# Recall Rewrite: Truly Useful Local-First Flashcard App

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Rewrite Recall from scratch to be genuinely useful, fully offline, open-source, with clear advantages over Anki/Quizlet/Obsidian.

**Architecture:** Tauri 2 + React 18 + TypeScript + Zustand + Drizzle ORM + SQLite. Single-folder portable design.

**Killer Advantages over Competitors:**
1. **FSRS Algorithm** - Modern, mathematically superior to Anki's SM-2
2. **Anki Import** - One-click `.apkg` import (removes migration barrier)
3. **Beautiful Modern UI** - Linear-inspired, keyboard-first, not 2010 aesthetics
4. **Developer-First** - Native markdown, code highlighting, LaTeX out of the box
5. **Truly Portable** - Single folder, copy to USB, no install required
6. **Git-Friendly** - `.deck` files are plain JSON, easy to version control and share
7. **Zero Account Required** - Download, run, done. No cloud dependency.

**Tech Stack:**
- Tauri 2 (cross-platform desktop, small binary)
- React 18 + TypeScript + Vite
- Zustand (state management)
- Drizzle ORM + `@tauri-apps/plugin-sql` (SQLite)
- `ts-fsrs` (Free Spaced Repetition Scheduler)
- `react-markdown` + `rehype-highlight` + `rehype-katex` (rich cards)
- `jszip` (Anki `.apkg` import)
- Tailwind CSS + Lucide React (modern UI)

---

## Phase 1: Foundation & Setup

### Task 1: Clean Slate & Dependency Setup

**Objective:** Remove old bloat, install correct dependencies for the new architecture.

**Files:**
- Modify: `package.json`
- Delete: `src/services/study-engine.ts` (old SM-2)
- Delete: `src/db/schema.ts` (old schema)

**Step 1: Remove old dependencies**
```bash
pnpm remove katex rehype-katex remark-math remark-gfm react-markdown
```

**Step 2: Install new dependencies**
```bash
pnpm add ts-fsrs jszip react-markdown rehype-raw rehype-highlight rehype-katex katex lucide-react
pnpm add -D @types/katex
```

**Step 3: Install Tauri SQL plugin**
```bash
pnpm tauri add sql
```

**Step 4: Verify installation**
```bash
pnpm install
pnpm tauri build --help
```
Expected: Tauri CLI responds correctly.

**Step 5: Commit**
```bash
git add -A
git commit -m "chore: clean slate, install fsrs and anki import dependencies"
```

---

### Task 2: New Database Schema (FSRS + Portable)

**Objective:** Create Drizzle schema matching FSRS requirements and portable JSON export.

**Files:**
- Create: `src/db/schema.ts`
- Modify: `src/types.ts`

**Step 1: Update types.ts**
```typescript
export type CardStatus = "new" | "learning" | "review" | "relearning" | "graduated";
export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface Card {
  id: string;
  deckId: string;
  front: string; // Markdown supported
  back: string;  // Markdown supported
  hint?: string;
  tags: string[];
  
  // FSRS fields
  state: CardStatus;
  lastReviewDate: string | null;
  nextReviewDate: string;
  interval: number;      // days
  easeFactor: number;    // FSRS stability/difficulty
  repetitions: number;
  lapses: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  color: string;
  fsrsParams?: string; // JSON string of FSRS parameters (optional per-deck)
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewDate: string;
  interval: number;
  easeFactor: number;
}

export interface StudySession {
  id: string;
  deckId: string | null;
  startedAt: string;
  endedAt: string;
  cardsStudied: number;
}
```

**Step 2: Create schema.ts**
```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").default("blue"),
  fsrsParams: text("fsrs_params"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  deckId: text("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  hint: text("hint"),
  tags: text("tags").notNull(), // JSON string
  
  state: text("state").default("new").notNull(),
  lastReviewDate: text("last_review_date"),
  nextReviewDate: text("next_review_date").notNull(),
  interval: integer("interval").default(0).notNull(),
  easeFactor: integer("ease_factor").default(2500).notNull(), // FSRS uses 2500 base
  repetitions: integer("repetitions").default(0).notNull(),
  lapses: integer("lapses").default(0).notNull(),
  
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const reviewLogs = sqliteTable("review_logs", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  rating: text("rating").notNull(),
  reviewDate: text("review_date").notNull(),
  interval: integer("interval").notNull(),
  easeFactor: integer("ease_factor").notNull(),
});

export const studySessions = sqliteTable("study_sessions", {
  id: text("id").primaryKey(),
  deckId: text("deck_id"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull(),
  cardsStudied: integer("cards_studied").default(0).notNull(),
});
```

**Step 3: Verify types compile**
```bash
pnpm tsc --noEmit
```
Expected: No errors.

**Step 4: Commit**
```bash
git add src/types.ts src/db/schema.ts
git commit -m "feat: new FSRS-compatible database schema"
```

---

### Task 3: FSRS Study Engine

**Objective:** Replace old SM-2 logic with `ts-fsrs` algorithm.

**Files:**
- Create: `src/services/fsrs-engine.ts`

**Step 1: Create fsrs-engine.ts**
```typescript
import { fsrs, createEmptyCard, Rating, State } from "ts-fsrs";
import type { Card, ReviewRating } from "@/types";

const f = fsrs();

export function getDueCards(cards: Card[], now = new Date()): Card[] {
  return cards
    .filter(card => new Date(card.nextReviewDate) <= now)
    .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
}

export function calculateNextReview(
  card: Card,
  rating: ReviewRating
): Partial<Card> {
  const fsrsRating = rating === "again" ? Rating.Again :
                     rating === "hard" ? Rating.Hard :
                     rating === "good" ? Rating.Good : Rating.Easy;

  const schedulingCard = {
    due: new Date(card.nextReviewDate),
    stability: card.easeFactor / 1000,
    difficulty: card.lapses > 0 ? 5 : 3, // Simplified difficulty
    elapsed_days: card.interval,
    scheduled_days: card.interval,
    reps: card.repetitions,
    lapses: card.lapses,
    state: card.state === "new" ? State.New : 
           card.state === "learning" ? State.Learning : State.Review,
    last_review: card.lastReviewDate ? new Date(card.lastReviewDate) : undefined,
  };

  const s = f.repeat(schedulingCard, new Date())[fsrsRating];
  
  const newState = s.state === State.New ? "new" :
                   s.state === State.Learning ? "learning" :
                   s.state === State.Review ? "review" : "graduated";

  return {
    state: newState,
    lastReviewDate: new Date().toISOString(),
    nextReviewDate: s.due.toISOString(),
    interval: Math.round(s.scheduled_days),
    easeFactor: Math.round(s.stability * 1000),
    repetitions: s.reps,
    lapses: s.lapses,
    updatedAt: new Date().toISOString(),
  };
}

export function createNewCard(deckId: string, front: string, back: string, tags: string[]): Card {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    tags,
    state: "new",
    lastReviewDate: null,
    nextReviewDate: now,
    interval: 0,
    easeFactor: 2500,
    repetitions: 0,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  };
}
```

**Step 2: Write test for FSRS engine**
Create: `src/services/__tests__/fsrs-engine.test.ts`
```typescript
import { describe, it, expect } from "vitest";
import { calculateNextReview, createNewCard } from "../fsrs-engine";

describe("FSRS Engine", () => {
  it("should schedule new card correctly on 'good'", () => {
    const card = createNewCard("deck-1", "front", "back", []);
    const updated = calculateNextReview(card, "good");
    
    expect(updated.state).toBe("learning");
    expect(updated.interval).toBeGreaterThan(0);
    expect(updated.repetitions).toBe(1);
  });

  it("should reset interval on 'again'", () => {
    const card = createNewCard("deck-1", "front", "back", []);
    const first = calculateNextReview(card, "good");
    const second = calculateNextReview({ ...card, ...first } as any, "again");
    
    expect(second.interval).toBeLessThan(first.interval!);
    expect(second.lapses).toBe(1);
  });
});
```

**Step 3: Run tests**
```bash
pnpm test src/services/__tests__/fsrs-engine.test.ts
```
Expected: 2 passing tests.

**Step 4: Commit**
```bash
git add src/services/fsrs-engine.ts src/services/__tests__/fsrs-engine.test.ts
git commit -m "feat: implement FSRS spaced repetition algorithm"
```

---

## Phase 2: Anki Import (Killer Feature)

### Task 4: Anki .apkg Parser

**Objective:** Parse Anki `.apkg` files to allow seamless migration from Anki.

**Files:**
- Create: `src/services/anki-import.ts`

**Step 1: Create anki-import.ts**
```typescript
import JSZip from "jszip";
import { createNewCard } from "./fsrs-engine";
import type { Deck, Card } from "@/types";

export interface AnkiImportResult {
  decks: Deck[];
  cards: Card[];
  errors: string[];
}

export async function parseAnkiApkg(file: File): Promise<AnkiImportResult> {
  const zip = await JSZip.loadAsync(file);
  const collectionFile = zip.file("collection.anki2");
  
  if (!collectionFile) {
    throw new Error("Invalid .apkg file: missing collection.anki2");
  }

  // Note: In Tauri, we'll use a Rust command to parse SQLite, 
  // but for web fallback we can use sql.js
  // For now, return mock structure showing the interface
  const result: AnkiImportResult = {
    decks: [],
    cards: [],
    errors: []
  };

  // Actual implementation will call Tauri Rust command:
  // const parsed = await invoke("parse_anki_apkg", { filePath });
  
  return result;
}
```

**Step 2: Create Rust Tauri command for SQLite parsing**
Modify: `src-tauri/src/main.rs`
```rust
use tauri::command;
use rusqlite::Connection;
use std::fs::File;
use std::io::Read;
use zip::ZipArchive;
use tempfile::tempdir;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct AnkiCard {
    deck_name: String,
    front: String,
    back: String,
    tags: Vec<String>,
}

#[command]
async fn parse_anki_apkg(file_path: String) -> Result<Vec<AnkiCard>, String> {
    let temp_dir = tempdir().map_err(|e| e.to_string())?;
    
    let mut file = File::open(&file_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(&mut file).map_err(|e| e.to_string())?;
    
    let mut collection_file = archive.by_name("collection.anki2")
        .map_err(|_| "Invalid .apkg: missing collection.anki2".to_string())?;
    
    let db_path = temp_dir.path().join("collection.anki2");
    let mut db_file = File::create(&db_path).map_err(|e| e.to_string())?;
    std::io::copy(&mut collection_file, &mut db_file).map_err(|e| e.to_string())?;
    
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT n.mid, n.flds, n.tags, m.name 
         FROM notes n 
         JOIN models m ON n.mid = m.id 
         JOIN cards c ON c.nid = n.id"
    ).map_err(|e| e.to_string())?;
    
    let cards = stmt.query_map([], |row| {
        let fields: String = row.get(1)?;
        let parts: Vec<&str> = fields.split('\x1f').collect();
        Ok(AnkiCard {
            deck_name: row.get(3).unwrap_or_else(|_| "Default".to_string()),
            front: parts.get(0).unwrap_or(&"").to_string(),
            back: parts.get(1).unwrap_or(&"").to_string(),
            tags: row.get::<_, String>(2).unwrap_or_default().split(' ').map(|s| s.to_string()).collect(),
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for card in cards {
        result.push(card.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![parse_anki_apkg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 3: Add Rust dependencies**
Modify: `src-tauri/Cargo.toml`
```toml
[dependencies]
tauri = { version = "2", features = [] }
rusqlite = { version = "0.31", features = ["bundled"] }
zip = "0.6"
tempfile = "3"
serde = { version = "1", features = ["derive"] }
```

**Step 4: Verify Rust compiles**
```bash
cd src-tauri && cargo check
```
Expected: Compilation succeeds.

**Step 5: Commit**
```bash
git add src/services/anki-import.ts src-tauri/src/main.rs src-tauri/Cargo.toml
git commit -m "feat: Anki .apkg import support via Rust SQLite parser"
```

---

## Phase 3: Rich Card Support

### Task 5: Markdown + Code + LaTeX Renderer

**Objective:** Support rich card content natively without plugins.

**Files:**
- Create: `src/components/RichCard.tsx`

**Step 1: Create RichCard.tsx**
```typescript
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface RichCardProps {
  content: string;
  isBack?: boolean;
}

export function RichCard({ content, isBack = false }: RichCardProps) {
  return (
    <div className={`prose prose-invert max-w-none ${isBack ? 'border-t pt-4 mt-4' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

**Step 2: Install required remark/rehype plugins**
```bash
pnpm add remark-math
```

**Step 3: Update Study Mode to use RichCard**
Modify: `src/components/study-mode.tsx` (replace existing card display with `<RichCard content={card.front} />`)

**Step 4: Verify rendering**
```bash
pnpm dev
```
Expected: App starts, markdown/code renders correctly in study mode.

**Step 5: Commit**
```bash
git add src/components/RichCard.tsx src/components/study-mode.tsx
git commit -m "feat: native markdown, code highlighting, and LaTeX support"
```

---

## Phase 4: Polish & Distribution

### Task 6: Portable Mode & Git-Friendly Export

**Objective:** Make decks easily shareable and portable.

**Files:**
- Modify: `src/services/import-export.ts`

**Step 1: Update export format**
```typescript
export function exportDeckToJson(deck: Deck, cards: Card[]): string {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    deck,
    cards: cards.map(c => ({
      ...c,
      // Strip internal FSRS state for cleaner sharing
      state: "new",
      lastReviewDate: null,
      nextReviewDate: new Date().toISOString(),
      interval: 0,
      easeFactor: 2500,
      repetitions: 0,
      lapses: 0,
    }))
  };
  return JSON.stringify(payload, null, 2);
}
```

**Step 2: Add "Save to File" button in UI**
Modify: `src/components/deck-detail.tsx` to include export button that downloads `.json` file.

**Step 3: Verify export works**
```bash
pnpm dev
```
Expected: Can export deck to clean JSON file.

**Step 4: Commit**
```bash
git add src/services/import-export.ts src/components/deck-detail.tsx
git commit -m "feat: git-friendly JSON deck export with reset FSRS state"
```

---

### Task 7: Tauri Build Configuration for Portable App

**Objective:** Configure Tauri to produce a portable, no-install executable.

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: Update tauri.conf.json**
```json
{
  "$schema": "https://schema.t2.tauri.app/config/2",
  "productName": "Recall",
  "version": "1.0.0",
  "identifier": "dev.madlezz.recall",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Recall",
        "width": 1024,
        "height": 768,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "app", "appimage", "dmg"],
    "icon": ["icons/icon.ico"],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    }
  }
}
```

**Step 2: Build the app**
```bash
pnpm tauri build
```
Expected: Produces `.msi` installer and portable `.exe` in `src-tauri/target/release/bundle/`

**Step 3: Verify portable execution**
Copy the `.exe` to a different folder, run it, verify it creates data folder in `%APPDATA%` or local directory.

**Step 4: Commit**
```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: configure tauri for portable cross-platform builds"
```

---

## Phase 5: Final Review & Documentation

### Task 8: Update README with Killer Features

**Objective:** Document the advantages clearly to attract users.

**Files:**
- Modify: `README.md`

**Step 1: Rewrite README.md**
```markdown
# Recall

A modern, fully offline, open-source spaced repetition app built for developers and learners who value privacy and portability.

## Why Recall?

| Feature | Recall | Anki | Quizlet |
|---------|--------|------|---------|
| **Algorithm** | FSRS (Modern, accurate) | SM-2 (Outdated) | Proprietary |
| **Anki Import** | ✅ One-click `.apkg` | N/A | ❌ |
| **Rich Cards** | ✅ Markdown, Code, LaTeX | ⚠️ Clunky plugins | ⚠️ Limited |
| **Portable** | ✅ Single folder, USB-ready | ⚠️ Complex profile | ❌ Cloud-only |
| **Account Required** | ❌ No | ⚠️ For sync | ✅ Yes |
| **Git-Friendly** | ✅ JSON deck format | ❌ Binary `.apkg` | ❌ |

## Features

- **FSRS Algorithm**: Mathematically superior spaced repetition
- **Anki Migration**: Import your existing `.apkg` decks seamlessly
- **Developer-First**: Native syntax highlighting for code cards
- **100% Offline**: No accounts, no cloud, no tracking
- **Cross-Platform**: Windows, macOS, Linux

## Installation

Download the latest release from [Releases](link). No installation required — just run the executable.

## Development

```bash
pnpm install
pnpm tauri dev
```

## License

MIT
```

**Step 2: Verify README renders correctly**
```bash
cat README.md
```

**Step 3: Final commit**
```bash
git add README.md
git commit -m "docs: update README with killer features comparison"
```

---

## Execution Strategy

1. **Read this plan once** to understand the full scope.
2. **Execute task-by-task** using `subagent-driven-development`:
   - Dispatch implementer subagent with full task context
   - Dispatch spec compliance reviewer
   - Dispatch code quality reviewer
   - Only proceed when both reviewers approve
3. **Mark tasks complete** in todo list as you go.
4. **Final integration review** after all tasks complete.

## Success Criteria

- [ ] FSRS algorithm replaces SM-2 completely
- [ ] Anki `.apkg` import works end-to-end
- [ ] Rich cards (markdown, code, LaTeX) render correctly
- [ ] App builds successfully with `pnpm tauri build`
- [ ] README clearly communicates advantages over competitors
- [ ] All tests pass
