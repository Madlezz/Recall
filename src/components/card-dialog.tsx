import { ImageIcon, Plus } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { TagInput } from "@/components/tag-input";
import { ImageOcclusionEditor } from "@/components/image-occlusion-editor";
import { useRecallStore } from "@/stores/recall-store";
import { insertImage } from "@/services/images";
import type { Card, CardType, ImageOcclusionData } from "@/types";

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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [targetDeckId, setTargetDeckId] = useState(card?.deckId ?? deckId);
  const [cardType, setCardType] = useState<CardType>(card?.cardType ?? "basic");
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [hint, setHint] = useState(card?.hint ?? "");
  const [source, setSource] = useState(card?.source ?? "");
  const [tags, setTags] = useState<string[]>(card?.tags ?? []);
  const [occlusionData, setOcclusionData] = useState<ImageOcclusionData | null>(null);
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const updateCard = useRecallStore((state) => state.updateCard);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTargetDeckId(card?.deckId ?? deckId);
      setCardType(card?.cardType ?? "basic");
      setFront(card?.front ?? "");
      setBack(card?.back ?? "");
      setHint(card?.hint ?? "");
      setSource(card?.source ?? "");
      setTags(card?.tags ?? []);
      
      // Parse occlusion data if this is an image-occlusion card
      if (card?.cardType === "image-occlusion" && card?.front) {
        try {
          setOcclusionData(JSON.parse(card.front) as ImageOcclusionData);
        } catch {
          setOcclusionData(null);
        }
      } else {
        setOcclusionData(null);
      }
    }
  }, [card, deckId, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    
    let finalFront = front;
    let finalBack = back;
    
    // For image-occlusion cards, serialize the occlusion data to the front field
    if (cardType === "image-occlusion") {
      if (!occlusionData?.imageUrl) {
        toast.error(t("cardDialog.imageUploadRequired"));
        return;
      }
      if (!occlusionData.occlusions.length) {
        toast.error(t("cardDialog.createOcclusion"));
        return;
      }
      finalFront = JSON.stringify(occlusionData);
      finalBack = ""; // Image occlusion doesn't use back field
    } else {
      // Regular validation for basic/cloze cards
      if (!finalFront.trim()) {
        toast.error(t("cardDialog.frontEmpty"));
        return;
      }
      if (!finalBack.trim()) {
        toast.error(t("cardDialog.backEmpty"));
        return;
      }
    }
    
    const input = { deckId: targetDeckId, front: finalFront, back: finalBack, hint, source, tags, cardType };

    try {
      if (card) {
        await updateCard(card.id, input);
        toast.success(t("cardDialog.updated"));
      } else {
        await createCard(input);
        toast.success(t("cardDialog.created"));
      }
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(t("cardDialog.saveFailed", { message }));
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
            {t("cardDialog.addCard")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,900px)] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{card ? t("cardDialog.editCard") : t("cardDialog.newCard")}</DialogTitle>
            <DialogDescription>
              {t("cardDialog.markdownHelp")}{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{t("cardDialog.clozeHelp")}:</span> {t("cardDialog.clozeAutoDetect")}{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs">{"{{c1::hidden answer}}"}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-select" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.deck")}</Label>
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

            <div className="space-y-2">
              <Label htmlFor="card-type" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.cardType")}</Label>
              <Select value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
                <SelectTrigger id="card-type" className="border-zinc-200 dark:border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">{t("cardDialog.basic")}</SelectItem>
                  <SelectItem value="cloze">{t("cardDialog.cloze")}</SelectItem>
                  <SelectItem value="image-occlusion">{t("cardDialog.imageOcclusion")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cardType === "image-occlusion" ? (
              <div className="space-y-4">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.imageOcclusion")}</Label>
                <ImageOcclusionEditor value={occlusionData} onChange={setOcclusionData} />
              </div>
            ) : (
              <Tabs defaultValue="front" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="front">{t("cardDialog.front")}</TabsTrigger>
                <TabsTrigger value="back">{t("cardDialog.back")}</TabsTrigger>
              </TabsList>

              <TabsContent value="front" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="front-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.contentMarkdown")}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsertImage(frontRef.current, front, setFront)}
                        title={t("cardDialog.image")}
                        className="h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        {t("cardDialog.image")}
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
                    <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.preview")}</Label>
                    <div className="min-h-[200px] rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      {front ? (
                        <RichCard content={front} />
                      ) : (
                        <p className="text-sm text-zinc-400 italic">{t("cardDialog.previewPlaceholder")}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="back" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="back-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.contentMarkdown")}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsertImage(backRef.current, back, setBack)}
                        title={t("cardDialog.image")}
                        className="h-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        {t("cardDialog.image")}
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
                    <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.preview")}</Label>
                    <div className="min-h-[200px] rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                      {back ? (
                        <RichCard content={back} isBack />
                      ) : (
                        <p className="text-sm text-zinc-400 italic">{t("cardDialog.previewPlaceholder")}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hint-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.hint")}</Label>
                <Input
                  id="hint-input"
                  value={hint}
                  onChange={(event) => setHint(event.target.value)}
                  placeholder={t("cardDialog.hintPlaceholder")}
                  className="border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.source")}</Label>
                <Input
                  id="source-input"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder={t("cardDialog.sourcePlaceholder")}
                  className="border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("cardDialog.tags")}</Label>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder={t("cardDialog.tagsPlaceholder")}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("cardDialog.tagsHelp")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
              {t("cardDialog.cancel")}
            </Button>
            <Button type="submit" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">{card ? t("cardDialog.saveChanges") : t("cardDialog.createCard")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}