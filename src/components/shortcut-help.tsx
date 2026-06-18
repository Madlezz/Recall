import { X } from "lucide-react";
import { useEffect } from "react";

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["Space"], description: "Reveal answer (in study mode)" },
  { keys: ["1"], description: "Rate — Again" },
  { keys: ["2"], description: "Rate — Hard" },
  { keys: ["3"], description: "Rate — Good" },
  { keys: ["4"], description: "Rate — Easy" },
  { keys: ["B"], description: "Bury card (skip, see later)" },
  { keys: ["S"], description: "Snooze card for 2 hours" },
  { keys: ["R"], description: "Start review (from dashboard)" },
  { keys: ["F"], description: "Start/pause focus timer" },
  { keys: ["Ctrl", "N"], description: "Quick-add card" },
  { keys: ["Ctrl", "Z"], description: "Undo last review" },
  { keys: ["?"], description: "Show this help" },
  { keys: ["Esc"], description: "Close dialog / Exit" },
];

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps): JSX.Element {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return <></>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-lg border bg-white dark:bg-zinc-900 p-6 shadow-sm animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcut-help-title" className="font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">{s.description}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="rounded border bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs font-mono font-medium"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Press <kbd className="rounded border bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[10px] font-mono">?</kbd> anywhere to show this
        </p>
      </div>
    </div>
  );
}
