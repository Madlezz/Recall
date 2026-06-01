# Contributing

Thanks for helping improve Recall.

## Setup

```bash
pnpm install
pnpm tauri:dev
```

## Before Opening a PR

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

If your change touches Tauri or persistence, also run:

```bash
pnpm tauri:build
```

## Guidelines

- Keep Recall local-first.
- Do not add telemetry, tracking, cloud services, login, or external APIs.
- Keep UI copy in English.
- Keep deck/card/review terminology consistent.
- Prefer small focused changes.
- Update `docs/manual-qa.md` when user-facing flows change.
