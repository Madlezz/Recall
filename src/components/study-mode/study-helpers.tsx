type AnswerVariant = "again" | "hard" | "good" | "easy";

const answerStyles: Record<AnswerVariant, string> = {
  again: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  hard: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  good: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  easy: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
};

export function AnswerButton({ label, keyHint, variant, interval, onClick }: { label: string; keyHint: string; variant: AnswerVariant; interval?: string; onClick: () => void }): JSX.Element {
  const variantDescriptions: Record<AnswerVariant, string> = {
    again: "Rate as Again - forgot completely",
    hard: "Rate as Hard - remembered with difficulty",
    good: "Rate as Good - remembered with moderate effort",
    easy: "Rate as Easy - remembered easily",
  };

  return (
    <button
      onClick={onClick}
      aria-label={variantDescriptions[variant]}
      className={`flex flex-col items-center gap-0.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${answerStyles[variant]}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-[10px] font-medium opacity-60 w-4" aria-hidden="true">{keyHint}</span>
        {label}
      </span>
      {interval && (
        <span className="text-[10px] font-normal opacity-60" aria-label={`Next interval: ${interval}`}>{interval}</span>
      )}
    </button>
  );
}

export function CompletionStat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-lg bg-zinc-50 py-2.5 px-1 dark:bg-zinc-800/50">
      <div className="text-lg font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium text-zinc-400">{label}</div>
    </div>
  );
}
