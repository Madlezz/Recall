import { Plus } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

    if (!name.trim()) {
      toast.error(t("deckDialog.nameEmpty"));
      return;
    }

    try {
      if (deck) {
        await updateDeck(deck.id, { name: name.trim(), description, color });
        toast.success(t("deckDialog.updated", { name: name.trim() }));
      } else {
        const deckId = await createDeck({ name: name.trim(), description, color });
        showDeck(deckId);
        toast.success(t("deckDialog.created", { name: name.trim() }));
      }
      handleOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("deckDialog.unknownError");
      toast.error(t("deckDialog.saveFailed", { message }));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            {t("deckDialog.newDeck")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{deck ? t("deckDialog.editDeckTitle") : t("deckDialog.newDeckTitle")}</DialogTitle>
            <DialogDescription>{t("deckDialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("deckDialog.nameLabel")}</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("deckDialog.namePlaceholder")}
                className="border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("deckDialog.descriptionLabel")}</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("deckDialog.descriptionPlaceholder")}
                className="border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("deckDialog.colorLabel")}</label>
              <Select value={color} onValueChange={(value) => setColor(value as DeckColor)}>
                <SelectTrigger className="border-zinc-200 dark:border-zinc-800">
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
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
              {t("deckDialog.cancel")}
            </Button>
            <Button type="submit" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">{deck ? t("deckDialog.saveChanges") : t("deckDialog.createDeck")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
