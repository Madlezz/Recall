import { cn } from "@/lib/utils";

/**
 * Recall Design System - Material 3 surface + token helpers.
 *
 * Centralizes the class strings each screen reuses so the new
 * design language stays consistent. Components should prefer these
 * over ad-hoc `bg-zinc-*` classes. Legacy zinc classes remain valid
 * during the transitional period but should be migrated over time.
 */

export type SurfaceTier =
  | "surface"
  | "container-low"
  | "container"
  | "container-high"
  | "container-highest"
  | "raised"
  | "variant";

/** Maps design-system surface tiers to their Tailwind class strings. */
export const surfaceClass: Record<SurfaceTier, string> = {
  surface: "bg-surface text-on-surface",
  "container-low": "bg-surface-container-low text-on-surface",
  container: "bg-surface-container text-on-surface",
  "container-high": "bg-surface-container-high text-on-surface",
  "container-highest": "bg-surface-container-highest text-on-surface",
  raised: "bg-surface-raised text-on-surface",
  variant: "bg-surface-variant text-on-surface",
};

/**
 * Standard card surface used across dashboard, deck browser, stats, etc.
 * Uses `rounded-2xl` (28px) per the design system, with an outline-variant
 * border and a subtle container background in light/high-contrast modes.
 */
export function cardSurface(extra?: string): string {
  return cn(
    "bg-surface border border-outline-variant",
    "dark:bg-surface-container",
    "rounded-2xl",
    extra,
  );
}

/** Soft container surface (secondary cards, wells). */
export function softSurface(extra?: string): string {
  return cn("bg-surface-container-low", "dark:bg-surface-container", "rounded-2xl", extra);
}

/** Brand-tinted soft surface (primary-soft). Used for review/learning moments. */
export function brandSurface(extra?: string): string {
  return cn(
    "bg-primary-soft text-on-primary-container",
    "border border-outline-variant",
    "rounded-2xl",
    extra,
  );
}

/** Motivation-tinted surface (amber secondary-container). XP, streaks, daily goal. */
export function motivationSurface(extra?: string): string {
  return cn(
    "bg-secondary-container text-on-secondary-container",
    "border border-outline-variant",
    "rounded-2xl",
    extra,
  );
}

/** Success-tinted surface (green tertiary-container). Completion, achievements. */
export function successSurface(extra?: string): string {
  return cn(
    "bg-tertiary-container text-on-tertiary-container",
    "border border-outline-variant",
    "rounded-2xl",
    extra,
  );
}

/** Dashed placeholder surface for "create new" affordances (add deck, add card). */
export function dashedSurface(extra?: string): string {
  return cn(
    "border-2 border-dashed border-outline-variant bg-background",
    "hover:bg-surface-container-low transition-colors",
    "rounded-2xl",
    extra,
  );
}

/** Typography scale class strings, matching DESIGN.md's `typography.scale`. */
export const typeClass = {
  display: "font-display tracking-tight",
  headline: "font-headline tracking-tight",
  "title-lg": "font-headline text-[1.5rem] font-bold leading-[2rem] tracking-[-0.025em]",
  "title-md": "font-body text-[1.125rem] font-semibold leading-[1.625rem] tracking-[-0.015em]",
  "body-lg": "font-body text-base leading-[1.65rem]",
  "body-md": "font-body text-[0.9375rem] leading-[1.5rem]",
  "label-lg": "font-body text-[0.9375rem] font-semibold leading-5 tracking-[-0.005em]",
  caption: "font-body text-xs font-medium leading-4 tracking-[0.01em]",
} as const;
