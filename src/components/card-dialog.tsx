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
    
    if (!front.trim()) {
      toast.error("Card front (question) cannot be empty");
      return;
    }
    if (!back.trim()) {
      toast.error("Card back (answer) cannot be empty");
      return;
    }
    
    const input = { deckId: targetDeckId, front, back, hint, source, tags: parseTags(tags) };

    try {
      if (card) {
        await updateCard(card.id, input);
        toast.success("Card updated successfully");
      } else {
        await createCard(input);
        toast.success("Card created successfully");
      }
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Could not save card: ${message}`);
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
              Supports Markdown, code blocks with syntax highlighting, and LaTeX math ($inline$ and $$block$$).{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Cloze deletion:</span> wrap hidden text like{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs">{"{{c1::hidden answer}}"}</code>{" "}
              — it auto-detects and becomes a fill-in-the-blank card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-select" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Deck</Label>
              <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                <SelectTrigger id="deck-select" className="border-zinc-200 dark:border-zinc-800">
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
            </div>

            <Tabs defaultValue="front" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="front">Front</TabsTrigger>
                <TabsTrigger value="back">Back</TabsTrigger>
              </TabsList>

              <TabsContent value="front" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="front-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Content (Markdown)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsertImage(frontRef.current, front, setFront)}
                        title="Insert image"
                        className="h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
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
                      placeholder="# Question\n\n```python\nprint('hello')\n```"
                      className="min-h-[200px] border-zinc-200 font-mono text-sm dark:border-zinc-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview</Label>
                    <div className="min-h-[200px] rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      {front ? (
                        <RichCard content={front} />
                      ) : (
                        <p className="text-sm text-zinc-400 italic">Preview will appear here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="back" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="back-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Content (Markdown)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsertImage(backRef.current, back, setBack)}
                        title="Insert image"
                        className="h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
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
                      placeholder="## Answer\n\nThe solution is:\n\n$$E = mc^2$$"
                      className="min-h-[200px] border-zinc-200 font-mono text-sm dark:border-zinc-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview</Label>
                    <div className="min-h-[200px] rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      {back ? (
                        <RichCard content={back} isBack />
                      ) : (
                        <p className="text-sm text-zinc-400 italic">Preview will appear here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hint-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Hint (optional)</Label>
                <Input
                  id="hint-input"
                  value={hint}
                  onChange={(event) => setHint(event.target.value)}
                  placeholder="A subtle clue"
                  className="border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Source URL (optional)</Label>
                <Input
                  id="source-input"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="https://..."
                  className="border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tags (comma-separated)</Label>
                <Input
                  id="tags-input"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="react, hooks, typescript"
                  className="border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
              Cancel
            </Button>
            <Button type="submit" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">{card ? "Save changes" : "Create card"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}