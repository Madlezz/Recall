import { ImageIcon, Plus } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RichCard } from "@/components/RichCard";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseTags } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import { insertImage } from "@/services/images";
import type { Card } from "@/types";

interface CardDialogProps {
  card?: Card;
  deckId: string;
  trigger?: ReactNode;
}

/** Insert markdown image at cursor position in a textarea, or append to end. */
function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  setter: (value: string) => void,
  markdown: string,
): void {
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = currentValue.substring(0, start) + markdown + currentValue.substring(end);
    setter(newValue);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
      textarea.focus();
    });
  } else {
    setter(currentValue ? currentValue + "\n" + markdown : markdown);
  }
}

export function CardDialog({ card, deckId, trigger }: CardDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [targetDeckId, setTargetDeckId] = useState(card?.deckId ?? deckId);
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [hint, setHint] = useState(card?.hint ?? "");
  const [source, setSource] = useState(card?.source ?? "");
  const [tags, setTags] = useState(card?.tags.join(", ") ?? "");
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const updateCard = useRecallStore((state) => state.updateCard);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTargetDeckId(card?.deckId ?? deckId);
      setFront(card?.front ?? "");
      setBack(card?.back ?? "");
      setHint(card?.hint ?? "");
      setSource(card?.source ?? "");
      setTags(card?.tags.join(", ") ?? "");
    }
  }, [card, deckId, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = { deckId: targetDeckId, front, back, hint, source, tags: parseTags(tags) };

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

  async function handleInsertImage(
    textarea: HTMLTextAreaElement | null,
    value: string,
    setter: (v: string) => void,
  ): Promise<void> {
    const filename = await insertImage();
    if (!filename) return;
    insertAtCursor(textarea, value, setter, `![image](recall://${filename})`);
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
      <DialogContent className="w-[min(92vw,900px)] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{card ? "Edit card" : "New card"}</DialogTitle>
            <DialogDescription>
              Supports Markdown, code blocks with syntax highlighting, and LaTeX math ($inline$ and $$block$$).
              <br />
              <span className="text-primary font-medium">Cloze deletion:</span> wrap hidden text like{" "}
              <code className="bg-muted px-1 rounded text-xs">{"{{c1::hidden answer}}"}</code>{" "}
              — it auto-detects and becomes a fill-in-the-blank card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Label htmlFor="deck-select">Deck</Label>
            <Select value={targetDeckId} onValueChange={setTargetDeckId}>
              <SelectTrigger id="deck-select">
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

            <Tabs defaultValue="front" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="front">Front</TabsTrigger>
                <TabsTrigger value="back">Back</TabsTrigger>
              </TabsList>

              <TabsContent value="front" className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="front-input">Content (Markdown)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsertImage(frontRef.current, front, setFront)}
                        title="Insert image"
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Image
                      </Button>
                    </div>
                    <Textarea
                      id="front-input"
                      ref={frontRef}
                      value={front}
                      onChange={(event) => setFront(event.target.value)}
                      placeholder="# Question&#10;&#10;```python&#10;print('hello')&#10;```"
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="min-h-[200px] rounded-md border bg-muted/30 p-4">
                      {front ? (
                        <RichCard content={front} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Preview will appear here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="back" className="space-y-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="back-input">Content (Markdown)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsertImage(backRef.current, back, setBack)}
                        title="Insert image"
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Image
                      </Button>
                    </div>
                    <Textarea
                      id="back-input"
                      ref={backRef}
                      value={back}
                      onChange={(event) => setBack(event.target.value)}
                      placeholder="## Answer&#10;&#10;The solution is:&#10;&#10;$$E = mc^2$$"
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="min-h-[200px] rounded-md border bg-muted/30 p-4">
                      {back ? (
                        <RichCard content={back} isBack />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Preview will appear here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hint-input">Hint (optional)</Label>
                <Input
                  id="hint-input"
                  value={hint}
                  onChange={(event) => setHint(event.target.value)}
                  placeholder="A subtle clue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-input">Source URL (optional)</Label>
                <Input
                  id="source-input"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags-input">Tags (comma-separated)</Label>
                <Input
                  id="tags-input"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="react, hooks, typescript"
                />
              </div>
            </div>
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