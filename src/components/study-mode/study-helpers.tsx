type AnswerVariant = "again" | "hard" | "good" | "easy";

// Default palette using semantic review tokens from the design system.
const answerStyles: Record<AnswerVariant, string> = {
  again: "bg-review-again/10 text-review-again border-review-again/30 hover:bg-review-again/20 dark:bg-review-again/20",
  hard: "bg-review-hard/10 text-review-hard border-review-hard/30 hover:bg-review-hard/20 dark:bg-review-hard/20",
  good: "bg-review-good/10 text-review-good border-review-good/30 hover:bg-review-good/20 dark:bg-review-good/20",
  easy: "bg-review-easy/10 text-review-easy border-review-easy/30 hover:bg-review-easy/20 dark:bg-review-easy/20",
};

// Color-blind-safe palette (Okabe-Ito) + a distinct glyph so ratings are never
// conveyed by color alone (WCAG 1.4.1 - use of color).
const answerStylesColorBlind: Record<AnswerVariant, string> = {
  again: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  hard: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
  good: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900",
  easy: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100 dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-900",
};

const answerGlyphs: Record<AnswerVariant, string> = {
  again: "✕",
  hard: "◑",
  good: "✓",
  easy: "★",
};

export function AnswerButton({
  label,
  keyHint,
  variant,
  interval,
  onClick,
  colorBlind = false,
}: {
  label: string;
  keyHint: string;
  variant: AnswerVariant;
  interval?: string;
  onClick: () => void;
  colorBlind?: boolean;
}): JSX.Element {
  const variantDescriptions: Record<AnswerVariant, string> = {
    again: "Rate as Again - forgot completely",
    hard: "Rate as Hard - remembered with difficulty",
    good: "Rate as Good - remembered with moderate effort",
    easy: "Rate as Easy - remembered easily",
  };

  const styles = colorBlind ? answerStylesColorBlind[variant] : answerStyles[variant];

  return (
    <button
      onClick={onClick}
      aria-label={variantDescriptions[variant]}
      className={`flex flex-col items-center gap-0.5 rounded-lg border px-4 py-3 min-h-[56px] text-sm font-semibold transition-colors sm:py-2 sm:min-h-0 ${styles}`}
    >
      <span className="flex items-center gap-2">
        {colorBlind && (
          <span className="text-base leading-none" aria-hidden="true">{answerGlyphs[variant]}</span>
        )}
        <span className="text-xs font-medium opacity-70 w-4" aria-hidden="true">{keyHint}</span>
        {label}
      </span>
      {interval && (
        <span className="text-xs font-normal opacity-70" aria-label={`Next interval: ${interval}`}>{interval}</span>
      )}
    </button>
  );
}

export function CompletionStat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
<div className="rounded-lg bg-surface-container-low py-2.5 px-1 dark:bg-surface-container">
	      <div className="text-lg font-bold tabular-nums text-text-primary">{value}</div>
	      <div className="mt-0.5 text-xs font-medium text-on-surface-variant">{label}</div>
    </div>
  );
}
