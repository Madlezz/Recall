import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRecallStore } from "@/stores/recall-store";

interface QuickAddProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddDialog({ open, onClose }: QuickAddProps): JSX.Element {
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const [deckId, setDeckId] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const frontRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setFront("");
      setBack("");
      if (decks.length > 0 && !deckId) {
        setDeckId(decks[0].id);
      }
      // Focus front input after open animation
      setTimeout(() => frontRef.current?.focus(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deckId intentionally omitted
  }, [open, decks]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!deckId || !front.trim() || !back.trim()) return;

    try {
      await createCard({ deckId, front, back, hint: "", source: "", tags: [] });
      toast.success("Card added");
      setFront("");
      setBack("");
      frontRef.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add card");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return <></>;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="mb-5">
          <h2 className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100">Quick add</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Press Escape to close</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {decks.length > 0 ? (
            <Select value={deckId} onValueChange={setDeckId}>
              <SelectTrigger className="border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Select deck" />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Create a deck first to add cards.</p>
          )}

          <Textarea
            ref={frontRef}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front (question)..."
            className="min-h-[80px] border-zinc-200 font-mono text-sm dark:border-zinc-800"
            disabled={decks.length === 0}
          />
          <Input
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back (answer)..."
            className="border-zinc-200 dark:border-zinc-800"
            disabled={decks.length === 0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && front.trim() && back.trim()) {
                e.preventDefault();
                void handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!deckId || !front.trim() || !back.trim()} className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              <Plus className="h-4 w-4 mr-1" />
              Add Card
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
