# Redesign 3 Screen Tanpa Stitch — MatchGame, TagManager, FocusTimer

## Pola Stitch yang Diadopsi

| Pola | Implementasi |
|---|---|
| Card container | `cardSurface("p-lg")` — border + outline-variant + rounded-2xl |
| Soft container | `softSurface("p-lg")` — surface-container-low |
| Success container | `successSurface("p-lg")` — tertiary-container |
| Dashed empty | `dashedSurface("p-lg")` — border-2 dashed |
| Typography | `typeClass.title-lg/md`, `typeClass.body-lg/md`, `typeClass.label-lg`, `typeClass.caption` |
| Button primary | `bg-primary text-on-primary rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all` |
| Button outline | `border border-outline-variant rounded-xl hover:bg-surface-container-low active:scale-95` |
| Button ghost | `text-on-surface-variant hover:bg-surface-container-low rounded-full active:scale-95` |
| Chip/pill | `rounded-full` — active: `bg-primary text-on-primary`, inactive: `bg-surface border border-outline-variant` |
| Section heading | `font-title-md text-lg font-semibold text-text-primary mb-4` |
| Page header | `text-2xl font-semibold tracking-normal` + `text-sm text-on-surface-variant` |
| Empty state | Ikon faded + heading + hint text, centered |
| Spacing | `p-md`, `p-lg`, `gap-md`, `gap-lg`, `px-gutter-mobile`, `space-y-md`, `space-y-lg` |

---

## 1. FocusTimer (258 lines)

**File:** `src/components/focus-timer.tsx`

**Perubahan:**
- **Hardcoded glow** `rgba(0,114,67,0.4)` → token `shadow-[0_0_20px_var(--tertiary-container)]` atau `shadow-tertiary/20`
- **Card wrapper** → `cardSurface("p-lg")` ganti `rounded-2xl border bg-surface px-5 py-5`
- **Label atas** → `typeClass.caption` + `text-on-surface-variant`
- **Preset buttons** → stitch chip pattern: `rounded-full` active/inactive
- **Timer text** → `font-display text-[36px] font-bold tabular-nums tracking-tight`
- **Status label** → `typeClass.label-lg`
- **Soundscape selector** → stitch chip pattern, konsisten dengan preset
- **Keyboard hint** → stitch caption style dengan `<kbd>`
- **Play/pause** → stitch primary button (bukan shadcn `Button` variant outline)
- **Reset** → stitch ghost icon button

**Tidak berubah:** Logika timer, SVG ring, XP, soundscape, keyboard shortcut

---

## 2. MatchGame (332 lines)

**File:** `src/components/match-game.tsx`

**Catatan:** File ada korupsi parsial di baris 45-111 (state declarations). Perlu diperbaiki dulu.

**Perubahan:**
- **Header** → stitch header pattern: `text-2xl font-semibold` + stats bar
- **Stats bar** → stitch stat row: icon + label + value, `text-on-surface-variant`
- **Tiles** → stitch card pattern: `cardSurface("p-3")` + `hover:shadow-md active:scale-95 transition-all`
- **Tile label** → `typeClass.caption` + `text-on-surface-variant`
- **Selected tile** → `ring-2 ring-primary border-primary/30`
- **Matched tile** → opacity + scale down, pakai token `bg-review-easy/10`
- **Shake tile** → `animate-shake border-review-again/30 bg-review-again/10` (tetap)
- **Finished overlay** → `successSurface("p-lg")` ganti `bg-review-easy/10`
- **Empty state** → stitch empty state: icon circle `bg-surface-container-low`, heading, hint
- **Confetti** → tetap `canvas-confetti`
- **Back button** → stitch ghost button
- **Restart button** → stitch outline button

**Tidak berubah:** Logika game, `buildTiles`, `pickCards`, `handleTileClick`, confetti, audio, XP

---

## 3. TagManager (500 lines)

**File:** `src/components/tag-manager.tsx` + `TreeNode` (inline)

**Perubahan:**
- **Header** → stitch header pattern: `text-2xl font-semibold` + `text-sm text-on-surface-variant`
- **Search bar** → stitch search pattern: `bg-surface-container-low rounded-xl` dengan icon
- **Saved Searches panel** → `cardSurface("p-md")` ganti `rounded-lg border bg-surface p-4`
- **Saved Search row** → stitch card row: `softSurface("p-2 rounded-md")` dengan hover
- **Tag tree panel** → `cardSurface("p-md")`
- **Tree node** → stitch list item: `rounded-md hover:bg-surface-container-high transition-colors`
- **Hardcoded emerald** → `text-review-easy` atau `text-tertiary`
- **Hardcoded zinc ring** → `ring-outline-variant`
- **Tag count badge** → stitch chip: `bg-surface-container-high rounded-full`
- **Action buttons** → stitch icon button: `rounded-full hover:bg-surface-container-low`
- **Selected tag panel** → `cardSurface("p-md")`
- **Card preview** → `softSurface("p-2 rounded-md")`
- **Save dialog** → `cardSurface("p-md")` + stitch radio pattern
- **Badge** → tetap shadcn `Badge` (tone="muted") — sudah oke
- **Empty states** → stitch empty state pattern

**Tidak berubah:** `TreeNode` recursive logic, `buildTagTree`, `buildTagCounts`, rename/delete logic, saved search logic

---

## Urutan Pengerjaan

1. **FocusTimer** — paling kecil, paling sedikit perubahan
2. **MatchGame** — perbaiki korupsi + redesign
3. **TagManager** — paling besar, paling banyak perubahan

Setiap selesai: `pnpm typecheck` + `pnpm test` (jika ada test terkait).