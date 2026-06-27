# Getting Started with Recall

Welcome to Recall, a privacy-first flashcard app that uses spaced repetition to help you learn effectively. This guide will get you up and running in minutes.

## Installation

### Download Pre-built Binaries

Visit the [Releases page](https://github.com/Madlezz/Recall/releases/latest) and download the appropriate installer for your platform:

- **Windows**: `.msi` installer
- **macOS**: `.dmg` for Apple Silicon (M1/M2/M3) or Intel
- **Linux**: `.AppImage`

### Build from Source

If you prefer to build from source:

```bash
# Clone the repository
git clone https://github.com/Madlezz/Recall.git
cd Recall

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Or build for production
pnpm tauri build
```

## First Launch

When you launch Recall for the first time, you'll see the onboarding template gallery:

1. **Choose Starter Decks**: Select from 4 template decks (Languages, Coding, GRE, Medical) — each includes pre-made cards to jumpstart your learning
2. **Or Start Fresh**: Begin with an empty library and create your own content

We recommend importing at least one template deck to explore the interface before creating your own cards.

## Your First Study Session

### 1. Create a Deck

Decks organize your flashcards by topic. Click **New Deck** on the dashboard and give it a name (e.g., "Spanish Vocabulary" or "Biology Terms").

### 2. Add Cards

Click on your deck to open it, then click **Add Card**. Fill in:

- **Front**: The question or prompt
- **Back**: The answer
- **Tags** (optional): Keywords for organization (e.g., "grammar", "chapter-1")

Example:
```
Front: What is the Spanish word for "house"?
Back: casa
Tags: spanish, basic-vocab
```

### 3. Start Studying

Return to the dashboard and click **Start Review**. During study:

- Press **Space** to reveal the answer
- Rate your recall: **1** (Again), **2** (Hard), **3** (Good), or **4** (Easy)
- The FSRS algorithm schedules cards based on your ratings

### 4. Track Your Progress

The dashboard shows:
- **Streak**: Consecutive days of studying
- **Level**: Your XP-based progress
- **Daily Goal**: Cards reviewed today vs. your target

## Keyboard Shortcuts

Recall is keyboard-first. Press **?** anytime to see all shortcuts.

**Study mode**:
- `Space` - Reveal answer
- `1-4` - Rate cards
- `B` - Bury card (skip today)
- `S` - Snooze card (review in 2 hours)
- `Ctrl+Z` - Undo last review

**Navigation**:
- `Ctrl+N` - Quick add card
- `Ctrl+Shift+N` - Global quick add (works when minimized)
- `R` - Start review

## Importing Existing Cards

### From Anki

If you're migrating from Anki:

1. Export your deck as `.apkg` from Anki
2. In Recall, click the **Anki Import** button
3. Select your `.apkg` file
4. Review the import preview and confirm

### From CSV

For bulk imports:

1. Prepare a CSV file with columns: `front`, `back`, `tags` (optional)
2. Click **CSV Import** on the dashboard
3. Map your columns to Recall fields
4. Import and review

### From Markdown

For text-based workflows:

1. Create a markdown file with card definitions
2. Use the format:
   ```markdown
   # Card Title
   
   Question here?
   
   ---
   
   Answer here.
   ```
3. Import via **Markdown Import** button

## Tips for Effective Learning

### 1. Keep Cards Simple

Each card should test one concept. Avoid multi-part questions.

**Good**: "What is the capital of France?" → "Paris"

**Bad**: "List all European capitals and their countries" → (too broad)

### 2. Use Cloze Deletions

For fill-in-the-blank cards:

```
The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell.
```

This creates two cards:
- Card 1: "The [...] is the powerhouse of the cell." → "mitochondria"
- Card 2: "The mitochondria is the [...] of the cell." → "powerhouse"

### 3. Study Daily

Consistency beats intensity. Even 5 minutes daily is better than 2 hours weekly.

### 4. Trust the Algorithm

FSRS schedules cards optimally. If you rate a card "Good", trust that it will appear when you're likely to forget it.

### 5. Use Tags Wisely

Tags help you filter and organize:
- `chapter-1`, `chapter-2` for sequential content
- `difficult` for cards you struggle with
- `important` for high-priority concepts

## Privacy and Data

Your data is stored locally in SQLite format:

- **Windows**: `%APPDATA%\dev.madlezz.recall\recall.db`
- **macOS**: `~/Library/Application Support/dev.madlezz.recall/recall.db`
- **Linux**: `~/.local/share/dev.madlezz.recall/recall.db`

### Backup

Export your data regularly:

1. Go to **Settings** → **Export**
2. Choose JSON format for human-readable backups
3. Store backups in cloud storage or external drive

### No Cloud, No Tracking

Recall never sends your data to external servers. There's no account system, no telemetry, and no analytics. Your learning data stays on your machine.

## Troubleshooting

### Cards Not Appearing in Review

Cards appear when they're due based on the FSRS algorithm. New cards are due immediately. If you've rated all cards recently, you may need to wait.

### Import Failed

Check that your file format is correct:
- **Anki**: Must be `.apkg` format (not `.colpkg`)
- **CSV**: Must have `front` and `back` columns
- **Markdown**: Must follow the card format shown above

### Performance Issues

For large decks (10,000+ cards):
- Use the Card Browser to filter before bulk operations
- Export and re-import if the database becomes slow
- Keep regular backups

## Next Steps

- Explore **Statistics** to track your learning patterns
- Try the **Match Game** for a different study experience
- Set up **Focus Timer** with ambient sounds for deep study sessions
- Customize your **Daily Goal** in Settings

## Getting Help

- **Documentation**: Check the [docs folder](../docs/) for detailed guides
- **Issues**: Report bugs on [GitHub Issues](https://github.com/Madlezz/Recall/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/Madlezz/Recall/discussions)

Happy learning!
