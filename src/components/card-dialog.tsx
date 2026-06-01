import { Plus } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseTags } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Card } from "@/types";

interface CardDialogProps {
  card?: Card;
  deckId: string;
  trigger?: ReactNode;
}

export function CardDialog({ card, deckId, trigger }: CardDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [targetDeckId, setTargetDeckId] = useState(card?.deckId ?? deckId);
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [hint, setHint] = useState(card?.hint ?? "");
  const [tags, setTags] = useState(card?.tags.join(", ") ?? "");
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const updateCard = useRecallStore((state) => state.updateCard);

  useEffect(() => {
    if (open) {
      setTargetDeckId(card?.deckId ?? deckId);
      setFront(card?.front ?? "");
      setBack(card?.back ?? "");
      setHint(card?.hint ?? "");
      setTags(card?.tags.join(", ") ?? "");
    }
  }, [card, deckId, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = { deckId: targetDeckId, front, back, hint, tags: parseTags(tags) };

    try {
      if (card) {
        await updateCard(card.id, input);
        toast.success("Card updated");
      } else {
        await createCard(input);
        toast.success("Card created");
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save card");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,680px)]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{card ? "Edit card" : "New card"}</DialogTitle>
            <DialogDescription>Basic front/back cards only for MVP.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Deck</span>
              <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {decks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Front</span>
              <Textarea value={front} onChange={(event) => setFront(event.target.value)} placeholder="Question" />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Back</span>
              <Textarea value={back} onChange={(event) => setBack(event.target.value)} placeholder="Answer" />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Hint</span>
              <Input value={hint} onChange={(event) => setHint(event.target.value)} placeholder="Optional" />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Tags</span>
              <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="react, hooks" />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{card ? "Save changes" : "Create card"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
