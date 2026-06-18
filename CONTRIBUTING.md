# Contributing to Recall

Thanks for your interest in contributing! Recall is a privacy-first, offline flashcard desktop app
built with Tauri + React + TypeScript.

## Getting Started

**Prerequisites:**
- Node.js 22+
- pnpm 10+
- Rust (stable) — install via https://rustup.rs
- For Linux: `libwebkit2gtk-4.1-dev` and `libappindicator3-dev`

**Setup:**
```bash
git clone https://github.com/Madlezz/Recall
cd Recall
pnpm install
pnpm tauri dev     # Full desktop app
# or
pnpm dev           # Browser-only (no Tauri APIs)
```

## How to Contribute

### Reporting Bugs
Use the **Bug Report** issue template. Include OS, app version, and steps to reproduce.

### Suggesting Features
Use the **Feature Request** issue template. Explain the problem you're solving, not just the solution.

### Pull Requests

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Run linter: `pnpm lint`
5. Commit with a clear message following [Conventional Commits](https://www.conventionalcommits.org/)
6. Open a pull request against `main`

## Project Structure

```
src/
  components/     # React UI components
  services/       # Business logic (FSRS engine, import/export, audio)
  stores/         # Zustand state management (split into slices)
  db/             # SQLite schema, TypeScript mappers, and query helpers
  lib/            # Pure utility functions (XP, cloze, deck health)
  types.ts        # Shared TypeScript types
src-tauri/
  src/            # Rust backend (file ops, Anki .apkg parsing via zip)
```

## Code Style

- TypeScript strict mode — no `any`, no type assertions without comment
- Prefer pure functions in `src/lib/` and `src/services/`
- UI state → Zustand slices in `src/stores/slices/`
- Database access only through `src/services/repository.ts`

## Running Tests

```bash
pnpm test            # Unit tests (Vitest)
pnpm test:watch      # Watch mode
pnpm test:e2e        # E2E tests (Playwright, requires `pnpm dev` running)
```

## Rust Development

The Rust backend lives in `src-tauri/`. To validate Rust changes:

```bash
cd src-tauri
cargo check          # Quick type/compile check
cargo test           # Run Rust unit tests
cargo clippy -- -D warnings   # Lint
```

## Good First Issues

Look for issues tagged [`good first issue`](https://github.com/Madlezz/Recall/labels/good%20first%20issue).

## License

By contributing, you agree your contributions will be licensed under the MIT License.