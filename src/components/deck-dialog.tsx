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
import { deckColorOptions, getDeckColorClass } from "@/lib/deck-colors";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Deck, DeckColor } from "@/types";

interface DeckDialogProps {
  deck?: Deck;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeckDialog({ deck, trigger, open: controlledOpen, onOpenChange }: DeckDialogProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleOpenChange = controlledOpen !== undefined ? onOpenChange! : setInternalOpen;
  const [name, setName] = useState(deck?.name ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
  const [color, setColor] = useState<DeckColor>(deck?.color ?? "blue");
  const createDeck = useRecallStore((state) => state.createDeck);
  const updateDeck = useRecallStore((state) => state.updateDeck);
  const showDeck = useRecallStore((state) => state.showDeck);

  useEffect(() => {
    if (isOpen) {
      setName(deck?.name ?? "");
      setDescription(deck?.description ?? "");
      setColor(deck?.color ?? "blue");
    }
  }, [deck, isOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    try {
      if (deck) {
        await updateDeck(deck.id, { name, description, color });
        toast.success("Deck updated");
      } else {
        const deckId = await createDeck({ name, description, color });
        showDeck(deckId);
        toast.success("Deck created");
      }
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save deck");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            New Deck
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{deck ? "Edit deck" : "New deck"}</DialogTitle>
            <DialogDescription>Keep decks focused. One topic, one study loop.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Systems Design" />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Description</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short context for this deck"
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium">Color</span>
              <Select value={color} onValueChange={(value) => setColor(value as DeckColor)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deckColorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", getDeckColorClass(option.value))} />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{deck ? "Save changes" : "Create deck"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}