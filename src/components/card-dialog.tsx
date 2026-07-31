import { ImageIcon, Mic, MicOff, Plus } from "lucide-react";
import { type ReactNode, useDeferredValue, useEffect, useRef, useState } from "react";
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
import { useVoiceInput } from "@/hooks/use-voice-input";

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
  const deferredFront = useDeferredValue(front);
  const deferredBack = useDeferredValue(back);
  const [hint, setHint] = useState(card?.hint ?? "");
  const [source, setSource] = useState(card?.source ?? "");
  const [tags, setTags] = useState<string[]>(card?.tags ?? []);
  const [occlusionData, setOcclusionData] = useState<ImageOcclusionData | null>(null);
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const updateCard = useRecallStore((state) => state.updateCard);
  const voiceInputEnabled = useRecallStore((state) => state.settings.voiceInputEnabled);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  // Refs to track current front/back values for voice input (avoids stale closures)
  const frontValueRef = useRef("");
  const backValueRef = useRef("");

  const frontVoice = useVoiceInput(frontValueRef, setFront);
  const backVoice = useVoiceInput(backValueRef, setBack);

  useEffect(() => {
    if (open) {
      setTargetDeckId(card?.deckId ?? deckId);
      setCardType(card?.cardType ?? "basic");
      setFront(card?.front ?? "");
      setBack(card?.back ?? "");
      setHint(card?.hint ?? "");
      setSource(card?.source ?? "");
      setTags(card?.tags ?? []);
      frontValueRef.current = card?.front ?? "";
      backValueRef.current = card?.back ?? "";
      
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
              <span className="font-medium text-text-primary dark:text-text-primary">{t("cardDialog.clozeHelp")}:</span> {t("cardDialog.clozeAutoDetect")}{" "}
              <code className="bg-surface-container dark:bg-surface-container px-1.5 py-0.5 rounded font-mono text-xs">{"{{c1::hidden answer}}"}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-select" className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.deck")}</Label>
              <Select value={targetDeckId} onValueChange={setTargetDeckId}>
                <SelectTrigger id="deck-select" className="border-outline-variant dark:border-outline-variant">
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
              <Label htmlFor="card-type" className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.cardType")}</Label>
              <Select value={cardType} onValueChange={(v) => setCardType(v as CardType)}>
                <SelectTrigger id="card-type" className="border-outline-variant dark:border-outline-variant">
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
                <Label className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.imageOcclusion")}</Label>
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
                      <Label htmlFor="front-input" className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.contentMarkdown")}</Label>
                      <button
                        type="button"
                        className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all h-8 text-on-surface-variant hover:text-text-primary hover:bg-surface-container-high dark:text-on-surface-variant dark:hover:text-text-primary dark:hover:bg-surface-container"
                        onClick={() => handleInsertImage(frontRef.current, front, setFront)}
                        title={t("cardDialog.image")}
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        {t("cardDialog.image")}
                      </button>
                      {voiceInputEnabled && frontVoice.supported && (
                        <button
                          type="button"
                          className={`rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all h-8 ${frontVoice.listening ? "text-destructive hover:text-destructive/80 animate-pulse" : "text-on-surface-variant hover:text-text-primary hover:bg-surface-container-high dark:text-on-surface-variant dark:hover:text-text-primary dark:hover:bg-surface-container"}`}
                          onClick={frontVoice.toggle}
                          title={t("cardDialog.voiceInput")}
                        >
                          {frontVoice.listening ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                          {frontVoice.listening ? t("cardDialog.stopListening") : t("cardDialog.voiceInput")}
                        </button>
                      )}
                    </div>
                    <Textarea
                      id="front-input"
                      ref={frontRef}
                      value={front}
                      onChange={(event) => { setFront(event.target.value); frontValueRef.current = event.target.value; }}
                      placeholder="# Question\n\n```python\nprint('hello')\n```"
                      className="min-h-[200px] border-outline-variant font-mono text-sm dark:border-outline-variant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.preview")}</Label>
                    <div className="min-h-[200px] rounded border border-outline-variant bg-background p-4 dark:border-outline-variant dark:bg-surface">
                      {front ? (
                        <RichCard content={deferredFront} />
                      ) : (
                        <p className="text-sm text-on-surface-variant italic">{t("cardDialog.previewPlaceholder")}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="back" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="back-input" className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.contentMarkdown")}</Label>
                      <button
                        type="button"
                        className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all h-8 text-on-surface-variant hover:text-text-primary hover:bg-surface-container-high dark:text-on-surface-variant dark:hover:text-text-primary dark:hover:bg-surface-container"
                        onClick={() => handleInsertImage(backRef.current, back, setBack)}
                        title={t("cardDialog.image")}
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        {t("cardDialog.image")}
                      </button>
                      {voiceInputEnabled && backVoice.supported && (
                        <button
                          type="button"
                          className={`rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all h-8 ${backVoice.listening ? "text-destructive hover:text-destructive/80 animate-pulse" : "text-on-surface-variant hover:text-text-primary hover:bg-surface-container-high dark:text-on-surface-variant dark:hover:text-text-primary dark:hover:bg-surface-container"}`}
                          onClick={backVoice.toggle}
                          title={t("cardDialog.voiceInput")}
                        >
                          {backVoice.listening ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
                          {backVoice.listening ? t("cardDialog.stopListening") : t("cardDialog.voiceInput")}
                        </button>
                      )}
                    </div>
                    <Textarea
                      id="back-input"
                      ref={backRef}
                      value={back}
                      onChange={(event) => { setBack(event.target.value); backValueRef.current = event.target.value; }}
                      placeholder="## Answer\n\nThe solution is:\n\n$$E = mc^2$$"
                      className="min-h-[200px] border-outline-variant font-mono text-sm dark:border-outline-variant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.preview")}</Label>
                    <div className="min-h-[200px] rounded border border-outline-variant bg-background p-4 dark:border-outline-variant dark:bg-surface">
                      {back ? (
                        <RichCard content={deferredBack} isBack />
                      ) : (
                        <p className="text-sm text-on-surface-variant italic">{t("cardDialog.previewPlaceholder")}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hint-input" className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.hint")}</Label>
                <Input
                  id="hint-input"
                  value={hint}
                  onChange={(event) => setHint(event.target.value)}
                  placeholder={t("cardDialog.hintPlaceholder")}
                  className="border-outline-variant dark:border-outline-variant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-input" className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.source")}</Label>
                <Input
                  id="source-input"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder={t("cardDialog.sourcePlaceholder")}
                  className="border-outline-variant dark:border-outline-variant"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-secondary dark:text-text-secondary">{t("cardDialog.tags")}</Label>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder={t("cardDialog.tagsPlaceholder")}
                />
                <p className="text-xs text-on-surface-variant dark:text-on-surface-variant">
                  {t("cardDialog.tagsHelp")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("cardDialog.cancel")}
            </Button>
            <Button type="submit">{card ? t("cardDialog.saveChanges") : t("cardDialog.createCard")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}