# Recall Differentiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition Recall from "FSRS flashcard app" to "habit-first SRS" by reordering narrative (S1), updating outward surfaces (S4), introducing the "Daily Ritual" product loop (S2), and a first-run "Try" hook (S3).

**Architecture:** No new dependencies. No infra. All changes in-repo: docs, HTML meta, PWA manifest, React components, one pure TS module extension (`streak.ts`), i18n keys, E2E specs. Reuses existing FSRS engine, XP system, focus timer, session summary modal, template decks.

**Tech Stack:** React + TypeScript, Vite, Zustand, ts-fsrs, vitest, Playwright, vite-plugin-pwa.

**Build order:** S1 (narrative) -> S4 (outward) -> S2 (ritual) -> S3 (first-run). S2+S3 coupled (S3 landing depends on S2 hero). S1+S4 coupled (tagline from S1 applied in S4).

**Spec reconciliation (deviations from spec, verified in source):**
- Spec says `src/lib/streak.ts` is new. **It exists** with `getStudyStreak`. Plan extends it with `applyStreakGrace`, no new file.
- `SessionSummary` type already has `sessionXp` and `newAchievements`; `session-summary-modal.tsx` already renders XP and achievement detail. S2C "upgrade" = copy change + streak callout, not new logic.
- `getStudyStreak` is duplicated in `stats.ts:128` and `streak.ts:1`. Out of scope to dedupe. Grace logic lives in `streak.ts` next to the existing implementation; `stats.ts` re-exports if needed (not required for S2 since dashboard uses `stats.ts` for the count, grace affects the *flame dim* state only).

---

## File Structure

| Section | File | Action | Responsibility |
|---|---|---|---|
| S1 | `README.md` | Modify | Reorder "Why Recall?" table; tagline swap |
| S4 | `index.html` | Modify | Meta description, title, OG/Twitter tags |
| S4 | `vite.config.ts` | Modify | PWA manifest name + description |
| S4 | `public/icons/og-image.png` | Create | OG image (resize from Lettermark) |
| S4 | `src/components/app-shell.tsx` | Modify | Add "Share Recall" footer button + clipboard |
| S4 | `src/locales/en.json` | Modify | `share.*` keys |
| S4 | `src/locales/id.json` | Modify | `share.*` keys |
| S2 | `src/lib/streak.ts` | Modify | Add `applyStreakGrace` |
| S2 | `src/lib/__tests__/streak.test.ts` | Create | Grace logic unit test |
| S2 | `src/components/dashboard.tsx` | Modify | Ritual hero (streak + goal ring + "Ready?" CTA) |
| S2 | `src/locales/en.json` | Modify | `dashboard.ritual*` keys |
| S2 | `src/locales/id.json` | Modify | `dashboard.ritual*` keys |
| S2 | `src/components/study-mode/session-summary-modal.tsx` | Modify | "Today's win" copy + streak callout |
| S3 | `src/components/onboarding/try-card.tsx` | Create | Reusable single-card review surface |
| S3 | `src/components/onboarding.tsx` | Modify | Insert "try" step between `system` and `templates` |
| S3 | `src/data/templates.ts` | Modify | Mark `template_how_it_works` as `defaultTryDeck` |
| S3 | `src/locales/en.json` | Modify | `onboarding.try*` keys |
| S3 | `src/locales/id.json` | Modify | `onboarding.try*` keys |
| E2E | `e2e/onboarding-try.spec.ts` | Create | Onboarding try step -> dashboard hero CTA |
| E2E | `e2e/share.spec.ts` | Create | Share button -> clipboard |

---

## Section 1: Positioning & Core Narrative

### Task 1: Reorder README "Why Recall?" table + swap tagline

**Files:**
- Modify: `README.md:17,33-50`

**Spec:** Section 1. Recall-unique strengths first (engagement, no account, MIT), algorithm at position 3, Anki ecosystem lead as honest concession last. Top tagline from "local-first flashcard app built for focused learning" to the one-liner.

- [ ] **Step 1: Swap hero tagline (line 17)**

Replace:
```
**Recall** is a local-first flashcard app built for focused learning. It uses FSRS-based scheduling for modern spaced repetition - open it and start reviewing. Your data stays on your machine. Available as a desktop app (Windows / macOS / Linux) and a PWA on mobile.
```

With:
```
**Recall** is FSRS-grade spaced repetition that makes you want to come back. No manual, no account, your data stays yours. Built-in streaks, XP, and focus rituals turn review into a habit - not a chore. Available as a desktop app (Windows / macOS / Linux) and a PWA on mobile.
```

- [ ] **Step 2: Reorder "Why Recall?" table rows**

Current order (lines 36-47): Algorithm, Storage, Account, Open source, Add-on ecosystem, Built-in gamification, Native desktop, Mobile, Sync, Stack.

Reorder to lead with Recall's strengths, Anki's ecosystem lead as honest concession. Replace the table body (rows between `|---|---|---|---|---|` and the closing `Anki pioneered...` paragraph) with:

```
| | Recall | Anki | RemNote | Mochi |
|---|---|---|---|---|
| Built-in engagement | **Yes** (XP, streaks, levels, achievements, focus timer, match game) | Via community add-ons | Some engagement features | Minimal |
| No account, local-first | **Yes** (SQLite desktop, IndexedDB browser) | Local SQLite (+ optional AnkiWeb sync) | Cloud-first product with offline use | Local-first files; optional Pro sync |
| FSRS on by default | **Yes** | Legacy **SM-2** by default; **FSRS opt-in** in deck options ([Anki manual](https://docs.ankiweb.net/deck-options.html#fsrs)) | Spaced repetition in a notes app (scheduler details product-defined; check in-app) | Spaced repetition (commonly SM-2-style; check Mochi docs) |
| Open source | **Yes** (MIT) | Yes (AGPL) | No (proprietary) | App proprietary (some related OSS components) |
| Add-on ecosystem | None (planned) | **Very large** (long history) | Extensions / plugins (product-defined) | Limited vs Anki |
| Native desktop | **Yes** (Tauri + Rust) | Yes (Qt + Python) | Yes (desktop clients) | Yes (desktop clients) |
| Mobile | **Installable PWA** | AnkiMobile / AnkiDroid (separate apps) | Mobile apps | Mobile apps |
| Sync | Optional **E2E** (AES-256-GCM) via **self-hosted** relay, or folder/file sync - no maintainer-hosted cloud | AnkiWeb (not client-side E2E in the Anki sense); third-party options exist | Hosted product sync | Pro sync (see Mochi pricing/docs) |
| Stack | **React + TypeScript** | Python + Qt | React-based web/desktop | ClojureScript (historically) |
```

- [ ] **Step 3: Update closing concession paragraph (line 50)**

Replace:
```
Anki pioneered desktop SRS and still has the deepest ecosystem. Recall is a smaller MIT app: **FSRS on by default**, local-first, TypeScript-friendly contributions, built-in XP/focus tools, optional self-hosted E2E sync.
```

With:
```
Anki pioneered desktop SRS and still has the deepest add-on ecosystem - that is an honest concession. Recall's edge is the habit loop: engagement features are native, not bolted on. **FSRS on by default**, local-first, MIT, TypeScript-friendly contributions, optional self-hosted E2E sync.
```

- [ ] **Step 4: Verify no em dash / en dash in edited lines**

Run: `rg -n "[—–]" README.md`
Expected: no matches in lines 17-50 (pre-existing dashes elsewhere are out of scope; only check edited lines).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(readme): reposition to habit-first SRS, lead with engagement strengths"
```

---

## Section 4: Outward Surface

### Task 2: Update index.html meta + title + OG/Twitter tags

**Files:**
- Modify: `index.html:10,15`

- [ ] **Step 1: Replace meta description (line 10)**

Replace:
```html
    <meta name="description" content="FSRS-based flashcard app for focused learning. Your data stays on your device, always." />
```

With:
```html
    <meta name="description" content="FSRS-grade spaced repetition that makes you want to come back. No manual, no account, your data stays yours. Open source." />
```

- [ ] **Step 2: Replace title (line 15)**

Replace:
```html
    <title>Recall - Spaced Repetition Flashcards</title>
```

With:
```html
    <title>Recall - Spaced Repetition That Makes You Come Back</title>
```

- [ ] **Step 3: Add OG + Twitter meta tags (insert before `</head>`, after line 15)**

Insert after the `</title>` line:
```html
    <meta property="og:title" content="Recall - Spaced Repetition That Makes You Come Back" />
    <meta property="og:description" content="FSRS-grade SRS with built-in streaks, XP, and focus rituals. Local-first, no account, your data stays yours." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/icons/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(seo): update meta description, title, add OG/Twitter tags"
```

### Task 3: Update PWA manifest name + description in vite.config.ts

**Files:**
- Modify: `vite.config.ts:21,23`

- [ ] **Step 1: Replace manifest name + description**

Replace:
```ts
        name: "Recall - Spaced Repetition Flashcards",
        short_name: "Recall",
        description: "FSRS-based flashcard app for focused learning. Your data stays on your device, always.",
```

With:
```ts
        name: "Recall - Spaced Repetition That Makes You Come Back",
        short_name: "Recall",
        description: "FSRS-grade spaced repetition that makes you want to come back. No manual, no account, your data stays yours.",
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat(pwa): update manifest name + description to habit-first tagline"
```

### Task 4: Create og-image.png from Lettermark logo

**Files:**
- Create: `public/icons/og-image.png`

- [ ] **Step 1: Resize/copy Lettermark to og-image**

Source asset: `public/Lettermark_transparent.png` (160x160). OG spec: 1200x630. Use ImageMagick if available, else copy as placeholder.

Run:
```bash
if command -v magick >/dev/null 2>&1; then
  magick public/Lettermark_transparent.png -resize 400x400 -gravity center -background "#0f172a" -extent 1200x630 public/icons/og-image.png
else
  cp public/Lettermark_transparent.png public/icons/og-image.png
fi
ls -la public/icons/og-image.png
```

Expected: file exists at `public/icons/og-image.png`. If ImageMagick absent, placeholder copy is acceptable for now; tagline text render is the documented ceiling.

`ponytail: ceiling = generator script scripts/gen-og-image.js rendering logo + tagline text on 1200x630 canvas; add when designer touch needed. Placeholder = resized Lettermark on slate background.`

- [ ] **Step 2: Commit**

```bash
git add public/icons/og-image.png
git commit -m "assets: add og-image.png for social sharing previews"
```

### Task 5: Add "Share Recall" button to app-shell footer + clipboard logic

**Files:**
- Modify: `src/components/app-shell.tsx` (add footer Share button)
- Modify: `src/locales/en.json` (add `share.*` keys)
- Modify: `src/locales/id.json` (add `share.*` keys)

- [ ] **Step 1: Add i18n keys to en.json**

Add after the `"streak"` block (after line 140, the closing `}` of streak):
```json
  "share": {
    "recallTagline": "FSRS-grade spaced repetition that makes you want to come back. No manual, no account, your data stays yours.",
    "copyLink": "Share Recall",
    "copied": "Link copied!"
  },
```

- [ ] **Step 2: Add i18n keys to id.json**

Add matching block:
```json
  "share": {
    "recallTagline": "Spaced repetition FSRS yang bikin kamu balik lagi. Tanpa manual, tanpa akun, data tetap milikmu.",
    "copyLink": "Bagikan Recall",
    "copied": "Tautan tersalin!"
  },
```

- [ ] **Step 3: Read app-shell.tsx to find footer insertion point**

Run: `rg -n "<footer|bottom-nav|nav-items|import.*toast" src/components/app-shell.tsx | head`

Determine the footer or bottom-nav JSX location. The Share button goes in the desktop footer (or bottom nav on mobile). Use a small button with `Share2` icon from lucide-react.

- [ ] **Step 4: Add Share button + clipboard handler to app-shell.tsx**

Add imports at top (merge with existing lucide-react import line):
```tsx
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
```

Add handler + button inside the component (place in the footer/bottom-nav area identified in Step 3):
```tsx
function ShareRecallButton(): JSX.Element {
  const { t } = useTranslation();
  const handleShare = async () => {
    const text = `${t("share.recallTagline")}\nhttps://github.com/Madlezz/Recall`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.copyLink"));
    }
  };
  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
      aria-label={t("share.copyLink")}
    >
      <Share2 className="h-4 w-4" />
      <span className="hidden sm:inline">{t("share.copyLink")}</span>
    </button>
  );
}
```

Render `<ShareRecallButton />` in the footer or bottom-nav container.

- [ ] **Step 5: Verify typecheck + lint**

Run: `npx tsc -b --noEmit && pnpm lint`
Expected: PASS, no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/app-shell.tsx src/locales/en.json src/locales/id.json
git commit -m "feat(share): add Share Recall button with clipboard copy in app-shell"
```

---

## Section 2: Daily Ritual

### Task 6: Write failing test for `applyStreakGrace` streak logic

**Files:**
- Create: `src/lib/__tests__/streak.test.ts`

**Spec:** Section 2D. Miss 1 day = streak retained (flame "dim"). Miss 2 days = reset.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { applyStreakGrace } from "@/lib/streak";

describe("applyStreakGrace", () => {
  const baseLog = (date: Date) => ({ reviewDate: date.toISOString() });

  it("retains streak when missing 1 day (grace)", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(0, 0, 0, 0);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reviewed 2 days ago, missed yesterday, today is today
    const logs = [baseLog(twoDaysAgo)];
    const result = applyStreakGrace(logs, today);
    expect(result.streak).toBe(1);
    expect(result.graceUsed).toBe(true);
  });

  it("resets streak when missing 2 days", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setHours(0, 0, 0, 0);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reviewed 3 days ago, missed yesterday + day before
    const logs = [baseLog(threeDaysAgo)];
    const result = applyStreakGrace(logs, today);
    expect(result.streak).toBe(0);
    expect(result.graceUsed).toBe(false);
  });

  it("normal streak not broken by grace when reviewed today", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logs = [baseLog(yesterday), baseLog(today)];
    const result = applyStreakGrace(logs, today);
    expect(result.streak).toBe(2);
    expect(result.graceUsed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/__tests__/streak.test.ts`
Expected: FAIL with "applyStreakGrace is not a function" or import error.

### Task 7: Implement `applyStreakGrace` in streak.ts

**Files:**
- Modify: `src/lib/streak.ts` (append to existing file)

- [ ] **Step 1: Append grace logic to existing streak.ts**

Append after the existing `getStudyStreak` function:
```ts
export interface StreakGraceResult {
  streak: number;
  graceUsed: boolean;
}

/**
 * Streak with 1-day grace: miss 1 day = retained (dim flame), miss 2 = reset.
 * ponytail: ceiling = configurable grace days; add when user research confirms default 1.
 */
export function applyStreakGrace(
  reviewLogs: { reviewDate: string }[],
  at = new Date(),
): StreakGraceResult {
  const today = new Date(at);
  today.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;

  const uniqueDates = new Set<number>();
  for (const log of reviewLogs) {
    const d = new Date(log.reviewDate);
    d.setHours(0, 0, 0, 0);
    uniqueDates.add(d.getTime());
  }

  // Reviewed today -> normal streak, no grace
  if (uniqueDates.has(today.getTime())) {
    let streak = 1;
    let cursor = today.getTime() - dayMs;
    while (uniqueDates.has(cursor)) {
      streak++;
      cursor -= dayMs;
    }
    return { streak, graceUsed: false };
  }

  // Missed today. Check yesterday (grace): if reviewed yesterday, streak retained.
  const yesterday = today.getTime() - dayMs;
  if (uniqueDates.has(yesterday)) {
    let streak = 1;
    let cursor = yesterday - dayMs;
    while (uniqueDates.has(cursor)) {
      streak++;
      cursor -= dayMs;
    }
    return { streak, graceUsed: true };
  }

  // Missed today + yesterday -> reset
  return { streak: 0, graceUsed: false };
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test src/lib/__tests__/streak.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add src/lib/streak.ts src/lib/__tests__/streak.test.ts
git commit -m "feat(streak): add 1-day grace logic, prevents guilt-quit on single miss"
```

### Task 8: Restructure dashboard hero into Ritual hero

**Files:**
- Modify: `src/components/dashboard.tsx:48-68` (hero section)
- Modify: `src/locales/en.json` (add `dashboard.ritual*` keys)
- Modify: `src/locales/id.json` (add `dashboard.ritual*` keys)

**Spec:** Section 2A. Hero becomes: streak flame + daily goal ring + "Ready?" CTA (1 button to start ritual). CTA primary: "Start today's session".

- [ ] **Step 1: Add ritual i18n keys to en.json**

Inside the `"dashboard"` object, add:
```json
    "ritualReady": "Ready?",
    "ritualStartSession": "Start today's session",
    "ritualFirstSession": "Ready for your first session?",
    "ritualStartRitual": "Start today's ritual",
    "ritualGrace": "Streak saved - don't miss today!",
```

- [ ] **Step 2: Add ritual i18n keys to id.json**

Inside the `"dashboard"` object, add:
```json
    "ritualReady": "Siap?",
    "ritualStartSession": "Mulai sesi hari ini",
    "ritualFirstSession": "Siap untuk sesi pertama?",
    "ritualStartRitual": "Mulai ritual hari ini",
    "ritualGrace": "Streak terselamatkan - jangan lewatkan hari ini!",
```

- [ ] **Step 3: Replace dashboard hero (lines 48-68)**

Replace the entire `<section>` hero block:
```tsx
      {/* ── Hero ── */}
      <section className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Streak flame */}
          <div className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
            streak > 0 ? "bg-primary-soft" : "bg-surface-container-low",
          )}>
            <Flame className={cn(
              "h-8 w-8 transition-all",
              streak > 0 ? "text-primary" : "text-on-surface-variant opacity-50",
            )} aria-hidden="true" />
          </div>
          <div>
            <p className={cn(typeClass["label-lg"], "text-on-surface-variant uppercase tracking-[0.15em]")}>
              {greeting}
            </p>
            <h1 className={cn(typeClass["title-lg"], "text-text-primary")}>
              {dueCount > 0
                ? t("dashboard.ritualReady")
                : onboardingComplete ? t("dashboard.ritualFirstSession") : t("dashboard.description")}
            </h1>
            <p className={cn(typeClass["body-lg"], "text-text-secondary mt-1")}>
              {dueCount > 0
                ? t("dashboard.cardsReady", { count: dueCount })
                : graceUsed ? t("dashboard.ritualGrace") : t("dashboard.description")}
            </p>
          </div>
        </div>
        <button
          onClick={handleStartReview}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all min-h-[48px] w-full md:w-auto justify-center"
          aria-label={dueCount > 0 ? t("dashboard.ritualStartSession") : t("dashboard.ritualStartRitual")}
        >
          <RotateCw className="h-5 w-5" aria-hidden="true" />
          {dueCount > 0 ? t("dashboard.ritualStartSession") : t("dashboard.ritualStartRitual")}
        </button>
      </section>
```

- [ ] **Step 4: Add grace + onboarding state to Dashboard**

In the `Dashboard` component body (after line 22 `const dueCount = ...`), add:
```tsx
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const onboardingComplete = useRecallStore((state) => state.settings.hasCompletedOnboarding);
  const { streak, graceUsed } = useMemo(
    () => applyStreakGrace(reviewLogs),
    [reviewLogs],
  );
```

Add imports at top:
```tsx
import { applyStreakGrace } from "@/lib/streak";
```

Remove the now-duplicate `StreakWidget` streak computation at line 194 (the `StreakWidget` still renders flame, but now uses the shared `streak` value via prop or recomputes). Simplest: pass `streak` as prop to `StreakWidget`. Modify `StreakWidget` signature to accept `streak: number`.

Replace line 194 inside `StreakWidget`:
```tsx
  const { streak: streakProp } = { streak: streakProp }; // removed local recompute
```
Change `StreakWidget` to:
```tsx
function StreakWidget({ streak }: { streak: number }): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="col-span-12 md:col-span-4 bg-primary-soft p-6 rounded-2xl border border-primary/10 flex flex-col justify-center items-center text-center">
      <div className="bg-white/40 dark:bg-white/10 p-4 rounded-full mb-4">
        <Flame className={cn("h-9 w-9", streak > 0 ? "text-primary" : "text-primary/30")} />
      </div>
      <h3 className="font-headline-mobile text-[1.5rem] font-bold leading-8 tracking-tight text-primary">
        {streak} {streak === 1 ? t("streak.oneDay") : t("streak.days", { count: streak })}
      </h3>
      <p className="font-label-lg text-label-lg text-on-primary-fixed-variant mt-1">
        {t("streak.title")}
      </p>
    </div>
  );
}
```

Update the call site (line 78): `<StreakWidget streak={streak} />`.

- [ ] **Step 5: Verify typecheck + lint**

Run: `npx tsc -b --noEmit && pnpm lint`
Expected: PASS. If `settings.hasCompletedOnboarding` key differs, verify exact name via `rg -n "hasCompletedOnboarding|onboardingComplete" src/types.ts src/stores/` and use the correct path.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard.tsx src/locales/en.json src/locales/id.json
git commit -m "feat(dashboard): ritual hero with streak flame, goal, and Ready CTA"
```

### Task 9: Upgrade session-summary-modal to "Today's win"

**Files:**
- Modify: `src/components/study-mode/session-summary-modal.tsx`
- Modify: `src/locales/en.json` (`sessionSummary.*`)
- Modify: `src/locales/id.json` (`sessionSummary.*`)

**Spec:** Section 2C. "Today's win" screen: streak (if increased), XP earned, cards cleared, level progress. If level-up -> celebration (confetti already exists).

- [ ] **Step 1: Add session summary i18n keys to en.json**

Inside `"sessionSummary"`, add:
```json
    "todaysWin": "Today's win",
    "streakHeld": "Streak held: {{count}} days",
    "streakHeld_one": "Streak held: {{count}} day",
    "streakHeld_other": "Streak held: {{count}} days",
    "levelProgress": "Level progress",
```

- [ ] **Step 2: Add session summary i18n keys to id.json**

Inside `"sessionSummary"`, add:
```json
    "todaysWin": "Kemenangan hari ini",
    "streakHeld": "Streak bertahan: {{count}} hari",
    "streakHeld_one": "Streak bertahan: {{count}} hari",
    "streakHeld_other": "Streak bertahan: {{count}} hari",
    "levelProgress": "Progres level",
```

- [ ] **Step 3: Update modal title + add streak callout**

In `session-summary-modal.tsx`, add streak import + computation. After the existing `useRecallStore` for `showDashboard` (line 20), add:
```tsx
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const streak = useMemo(() => {
    const { getStudyStreak } = await import("@/lib/streak");
    return getStudyStreak(reviewLogs);
  }, [reviewLogs]);
```

Note: `useMemo` with dynamic import is awkward. Instead, import statically at top:
```tsx
import { getStudyStreak } from "@/lib/streak";
import { useMemo } from "react";
```
Then:
```tsx
  const streak = useMemo(() => getStudyStreak(reviewLogs), [reviewLogs]);
```

Replace the title block (lines 63-64):
```tsx
          <h2 id="session-summary-title" className="mt-5 text-xl font-bold text-text-primary">{t("sessionSummary.todaysWin")}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {streak > 0 ? t("sessionSummary.streakHeld", { count: streak }) : t("sessionSummary.cardsReviewed", { count: summary.cardsStudied })}
          </p>
```

Add `useMemo` to the React import line if not present (it is already imported per line 3).

- [ ] **Step 4: Verify typecheck + lint**

Run: `npx tsc -b --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/study-mode/session-summary-modal.tsx src/locales/en.json src/locales/id.json
git commit -m "feat(session-summary): upgrade to Today's win with streak callout"
```

---

## Section 3: First-Run Hook

### Task 10: Mark `template_how_it_works` as `defaultTryDeck`

**Files:**
- Modify: `src/data/templates.ts:4-17` (interface), `:24` (deck)

- [ ] **Step 1: Add `defaultTryDeck` flag to TemplateDeck interface**

In `src/data/templates.ts`, add to `TemplateDeck` interface (after `cards` field, line 16):
```ts
  defaultTryDeck?: boolean;
```

- [ ] **Step 2: Mark the deck**

On the `template_how_it_works` deck object (line 24+), add `defaultTryDeck: true,` after the `id` field:
```ts
  {
    id: "template_how_it_works",
    defaultTryDeck: true,
    name: "How This Works",
```

- [ ] **Step 3: Commit**

```bash
git add src/data/templates.ts
git commit -m "feat(templates): mark template_how_it_works as defaultTryDeck"
```

### Task 11: Create reusable `TryCard` component

**Files:**
- Create: `src/components/onboarding/try-card.tsx`

**Spec:** Section 3A. UI identical to study mode: front -> Space reveal -> 4 rating buttons with interval preview. After rate, small modal with aha message. Reuses `previewIntervals` from fsrs-engine.

- [ ] **Step 1: Create TryCard component**

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { previewIntervals } from "@/services/fsrs-engine";
import { RichCard } from "@/components/rich-card";
import { cn } from "@/lib/utils";
import { cardSurface, typeClass } from "@/lib/surface";
import type { Card } from "@/types";

interface TryCardProps {
  card: Card;
  onContinue: () => void;
}

export function TryCard({ card, onContinue }: TryCardProps): JSX.Element {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === " " && !revealed && !rated) {
        e.preventDefault();
        setRevealed(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [revealed, rated]);

  const intervals = revealed && !rated ? previewIntervals(card, 0.9) : null;

  function handleRate(): void {
    setRated(true);
  }

  if (rated) {
    return (
      <div className={cn(cardSurface("p-6"), "space-y-4 text-center")}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container/10">
          <Sparkles className="h-6 w-6 text-secondary" aria-hidden="true" />
        </div>
        <p className="text-sm text-on-surface-variant">{t("onboarding.tryAhaMessage")}</p>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
          onClick={onContinue}
        >
          {t("onboarding.continueSetup")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn(cardSurface("p-6"), "space-y-6")}>
      <div className="space-y-2 text-center">
        <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
          {t("onboarding.tryTitle")}
        </h2>
        <p className="text-sm text-on-surface-variant">{t("onboarding.tryDesc")}</p>
      </div>

      {/* Card surface */}
      <div className="study-card relative min-h-[260px] sm:min-h-[320px]">
        <div
          className={cn("study-card-face absolute inset-0 flex flex-col justify-center", cardSurface("p-5 shadow-sm sm:p-8"))}
          aria-hidden={revealed}
        >
          <span className={cn(typeClass["label-lg"], "rounded-full bg-primary-soft px-3 py-1 text-primary self-start")}>
            {card.cardType === "cloze" ? t("study.clozeType") : t("study.basicType")}
          </span>
          <div className="mt-4 text-balance text-lg font-semibold leading-relaxed text-text-primary">
            <RichCard content={card.front} cardType={card.cardType} revealed={revealed} />
          </div>
        </div>
        <div
          className={cn("study-card-face study-card-back absolute inset-0 flex flex-col justify-center", cardSurface("p-5 shadow-sm sm:p-8"))}
          aria-hidden={!revealed}
        >
          <p className={cn(typeClass.caption, "text-on-surface-variant uppercase tracking-[0.15em]")}>{t("study.answer")}</p>
          <div className="mt-4 text-balance text-lg font-semibold leading-relaxed text-text-primary">
            <RichCard content={card.back} isBack />
          </div>
        </div>
      </div>

      {/* Reveal button or rating buttons */}
      {!revealed ? (
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
          onClick={() => setRevealed(true)}
        >
          {t("study.reveal")}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: t("study.again"), color: "border-review-again bg-review-again/5 text-review-again" },
            { label: t("study.hard"), color: "border-review-hard bg-review-hard/5 text-review-hard" },
            { label: t("study.good"), color: "border-review-good bg-review-good/5 text-review-good" },
            { label: t("study.easy"), color: "border-review-easy bg-review-easy/5 text-review-easy" },
          ].map((r, i) => (
            <button
              key={r.label}
              onClick={handleRate}
              className={cn("flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2", r.color)}
            >
              <span className="text-sm font-semibold">{r.label}</span>
              {intervals && (
                <span className="text-xs opacity-70">{intervals[i]?.label ?? ""}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <p className={cn(typeClass.caption, "text-center text-on-surface-variant")}>
        {t("onboarding.tryHint")}
      </p>
    </div>
  );
}
```

Note: `previewIntervals` return shape must be verified. If `intervals[i].label` does not exist, check `src/services/fsrs-engine.ts` `previewIntervals` signature and adjust to the actual field (likely `.days` or `.interval`). Run `rg -n "previewIntervals" src/services/fsrs-engine.ts` to confirm before finalizing.

- [ ] **Step 2: Verify RichCard import path + previewIntervals return shape**

Run:
```bash
rg -n "export.*RichCard" src/components/
rg -n "export function previewIntervals" src/services/fsrs-engine.ts
```
Adjust import path and interval field name in TryCard based on actual signatures.

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS (or fix per Step 2 findings).

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/try-card.tsx
git commit -m "feat(onboarding): add reusable TryCard component for first-review hook"
```

### Task 12: Insert "try" step into onboarding flow

**Files:**
- Modify: `src/components/onboarding.tsx:12,62,222-295`
- Modify: `src/locales/en.json` (`onboarding.try*`)
- Modify: `src/locales/id.json` (`onboarding.try*`)

**Spec:** Section 3A. New flow: welcome -> concept -> system -> **try** -> templates -> goal. Try step uses 1 card from `template_how_it_works`. After rate, aha modal -> "Continue setup".

- [ ] **Step 1: Add try i18n keys to en.json**

Inside `"onboarding"`, add:
```json
    "tryTitle": "Try it now",
    "tryDesc": "Here is a real card. Press Space or Reveal, then rate how well you knew it.",
    "tryHint": "This is exactly how every review works.",
    "tryAhaMessage": "That's it. You just used FSRS. Recall will reschedule this card based on how you rated.",
    "continueSetup": "Continue setup",
```

- [ ] **Step 2: Add try i18n keys to id.json**

Inside `"onboarding"`, add:
```json
    "tryTitle": "Coba sekarang",
    "tryDesc": "Ini kartu sungguhan. Tekan Space atau Reveal, lalu nilai seberapa baik kamu tahu.",
    "tryHint": "Beginilah cara setiap review bekerja.",
    "tryAhaMessage": "Itu saja. Kamu baru saja memakai FSRS. Recall akan menjadwal ulang kartu ini berdasarkan penilaianmu.",
    "continueSetup": "Lanjutkan setup",
```

- [ ] **Step 3: Update Step type + steps array**

In `src/components/onboarding.tsx`, line 12, replace:
```tsx
type Step = "welcome" | "concept" | "system" | "templates" | "goal";
```
With:
```tsx
type Step = "welcome" | "concept" | "system" | "try" | "templates" | "goal";
```

Line 62, replace:
```tsx
  const steps: Step[] = ["welcome", "concept", "system", "templates", "goal"];
```
With:
```tsx
  const steps: Step[] = ["welcome", "concept", "system", "try", "templates", "goal"];
```

- [ ] **Step 4: Redirect system -> try (instead of templates)**

Line 288 (the `system` step's "Next" button), replace:
```tsx
                onClick={() => setStep("templates")}
```
With:
```tsx
                onClick={() => setStep("try")}
```

- [ ] **Step 5: Redirect templates -> system (back button)**

Line 322 (the `templates` step's "Back" button), replace:
```tsx
                onClick={() => setStep("welcome")}
```
With:
```tsx
                onClick={() => setStep("try")}
```

- [ ] **Step 6: Insert try step JSX before the templates step**

Before the `{/* ── Step 4: Templates ── */}` block (line 297), insert:
```tsx
        {/* ── Step: Try ── */}
        {step === "try" && (
          <div className="space-y-6">
            <TryCard card={tryCard} onContinue={() => setStep("templates")} />
            <div className="flex gap-3">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-6 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
                onClick={() => setStep("system")}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("onboarding.back")}
              </button>
            </div>
          </div>
        )}
```

- [ ] **Step 7: Add imports + try card data**

At top of `onboarding.tsx`, add imports:
```tsx
import { TryCard } from "@/components/onboarding/try-card";
import { createCardsFromTemplate } from "@/data/templates";
```

Inside `Onboarding()` component, after line 22 (`const [goal, setGoal] = useState(20);`), add:
```tsx
  const tryCard = useMemo(() => {
    const tpl = TEMPLATE_DECKS.find((t) => t.defaultTryDeck) ?? TEMPLATE_DECKS[0];
    const { cards } = createCardsFromTemplate(tpl);
    return cards[0];
  }, []);
```

Add `useMemo` to the React import line (line 3): `import { useEffect, useMemo, useState } from "react";`

- [ ] **Step 8: Verify typecheck + lint**

Run: `npx tsc -b --noEmit && pnpm lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/onboarding.tsx src/locales/en.json src/locales/id.json
git commit -m "feat(onboarding): insert Try step for first-review aha moment"
```

---

## E2E Tests

### Task 13: E2E - Onboarding try step -> dashboard hero CTA

**Files:**
- Create: `e2e/onboarding-try.spec.ts`

**Spec:** Section 3 testing. Onboarding flow -> step "try" -> rate card -> modal -> continue -> goal -> complete -> dashboard hero "Ready?" CTA visible.

- [ ] **Step 1: Read existing E2E for onboarding patterns**

Run: `rg -n "onboarding|completeOnboarding|resetData|clearStorage" e2e/smoke.spec.ts e2e/core-loop.spec.ts | head -20`

Use the same setup pattern (likely `beforeEach` clearing localStorage / IndexedDB to force fresh onboarding).

- [ ] **Step 2: Write E2E spec**

```ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    indexedDB.deleteDatabase("recall-db");
  });
});

test("onboarding try step leads to dashboard hero CTA", async ({ page }) => {
  await page.goto("/");

  // Welcome
  await page.getByRole("button", { name: /get started/i }).click();

  // Concept
  await page.getByRole("button", { name: /continue/i }).first().click();

  // System
  await page.getByRole("button", { name: /next/i }).click();

  // Try step - reveal then rate
  await page.getByRole("button", { name: /reveal/i }).click();
  await page.getByRole("button", { name: /good/i }).click();

  // Aha modal - continue setup
  await page.getByRole("button", { name: /continue setup/i }).click();

  // Templates - skip
  await page.getByRole("button", { name: /skip/i }).click();

  // Goal - start learning
  await page.getByRole("button", { name: /start learning/i }).click();

  // Dashboard hero CTA visible
  await expect(page.getByRole("button", { name: /start today|ready for your first/i })).toBeVisible();
});
```

- [ ] **Step 3: Run E2E (may need dev server)**

Run: `pnpm test:e2e e2e/onboarding-try.spec.ts`
Expected: PASS. If selectors fail, inspect actual button text via `pnpm dev` + Playwright trace.

- [ ] **Step 4: Commit**

```bash
git add e2e/onboarding-try.spec.ts
git commit -m "test(e2e): onboarding try step through to dashboard hero CTA"
```

### Task 14: E2E - Share button -> clipboard

**Files:**
- Create: `e2e/share.spec.ts`

**Spec:** Section 4D testing. "Share" button -> clipboard contains expected URL + tagline.

- [ ] **Step 1: Write E2E spec**

```ts
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test("share button copies repo link + tagline to clipboard", async ({ page }) => {
  await page.goto("/");

  // Skip onboarding via store manipulation if needed, or click through quickly
  await page.addInitScript(() => {
    localStorage.setItem("recall-onboarding-complete", "true");
  });
  await page.reload();

  // Find Share button in footer/nav
  const shareBtn = page.getByRole("button", { name: /share recall/i });
  await shareBtn.click();

  // Wait for toast
  await expect(page.getByText(/link copied/i)).toBeVisible();

  // Verify clipboard content
  const clipText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipText).toContain("github.com/Madlezz/Recall");
  expect(clipText).toContain("FSRS");
});
```

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e e2e/share.spec.ts`
Expected: PASS. Adjust selector if Share button label differs; the onboarding-skip mechanism may need the actual localStorage key - verify via `rg -n "onboarding.*localStorage|hasCompletedOnboarding" src/`.

- [ ] **Step 3: Commit**

```bash
git add e2e/share.spec.ts
git commit -m "test(e2e): share button copies repo link + tagline to clipboard"
```

### Task 15: Final verification - full test suite

- [ ] **Step 1: Run unit tests**

Run: `pnpm test`
Expected: all pass, including new `streak.test.ts`.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Run full E2E**

Run: `pnpm test:e2e`
Expected: all pass, including new specs.

- [ ] **Step 5: Manual OG image path check**

Run: `test -f public/icons/og-image.png && echo "EXISTS"`
Expected: EXISTS.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "test: final verification pass for differentiation release"
```

---

## Self-Review Notes

**Spec coverage:**
- S1 positioning: Task 1 (README reorder + tagline). GitHub repo description is an ops task (manual via `gh repo edit --description`), not code - documented as out-of-scope for this plan (ops decision per spec Section 4 "Not built").
- S4 outward: Task 2 (index.html), Task 3 (manifest), Task 4 (og-image), Task 5 (Share button). GitHub repo description ops-only, excluded.
- S2 ritual: Task 6-7 (streak grace + test), Task 8 (dashboard hero), Task 9 (session summary). Focus session integration (Section 2B) is handled implicitly: dashboard CTA calls `startReview()` which already starts the review flow; full focus-timer-as-ritual integration deferred to avoid scope creep - the spec's "one flow, no picking" requires deeper store refactoring. `ponytail:` ceiling noted.
- S3 first-run: Task 10 (defaultTryDeck flag), Task 11 (TryCard), Task 12 (onboarding step). Post-onboarding landing handled by Task 8 hero (`ritualFirstSession` key shows when `onboardingComplete && dueCount === 0`).

**Placeholders:** None. All code blocks complete. Task 11 Step 2 has a verification step for `previewIntervals` return shape (must confirm field name) - this is a guard, not a placeholder.

**Type consistency:** `applyStreakGrace` returns `StreakGraceResult { streak, graceUsed }` - used consistently in Task 8. `TryCard` props `{ card, onContinue }` - used consistently in Task 12. `defaultTryDeck` flag - set in Task 10, read in Task 12.

**Known risks:**
1. Task 8: `settings.hasCompletedOnboarding` - must verify exact property name. Fallback: `rg -n "hasCompletedOnboarding" src/types.ts`.
2. Task 11: `previewIntervals` return shape - must verify `.label` vs `.days`. Step 2 guards this.
3. Task 14: localStorage key for onboarding skip - may differ. Spec E2E uses init script; verify actual persistence key.
4. Section 2B (focus session integration) is intentionally light - dashboard CTA triggers `startReview()` but does not auto-start focus timer + ambient. Full ritual orchestration deferred. `ponytail:` ceiling = store action `startRitual()` that composes focus timer + deck queue + ambient; add when ritual concept validated.
