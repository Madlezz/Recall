import { Plus, Zap } from "lucide-react";
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
  }, [open, decks]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!deckId || !front.trim() || !back.trim()) return;

    try {
      await createCard({ deckId, front, back, hint: "", tags: [] });
      toast.success("Card added!");
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-lg border bg-card p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Quick Add Card</h2>
            <p className="text-xs text-muted-foreground">Ctrl+N · Press Escape to close</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {decks.length > 0 ? (
            <Select value={deckId} onValueChange={setDeckId}>
              <SelectTrigger>
                <SelectValue placeholder="Select deck" />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">Create a deck first to add cards.</p>
          )}

          <Textarea
            ref={frontRef}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front (question)..."
            className="min-h-[80px] font-mono text-sm"
            disabled={decks.length === 0}
          />

          <Input
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back (answer)..."
            disabled={decks.length === 0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && front.trim() && back.trim()) {
                e.preventDefault();
                void handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!deckId || !front.trim() || !back.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Card
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}