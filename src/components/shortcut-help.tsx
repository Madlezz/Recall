import { X } from "lucide-react";

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
  { keys: ["Ctrl", "N"], description: "Quick-add card" },
  { keys: ["Ctrl", "Z"], description: "Undo last review" },
  { keys: ["?"], description: "Show this help" },
  { keys: ["Esc"], description: "Close dialog / Exit" },
];

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps): JSX.Element {
  if (!open) return <></>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.description}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Press <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">?</kbd> anywhere to show this
        </p>
      </div>
    </div>
  );
}