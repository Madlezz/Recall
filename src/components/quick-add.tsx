import { Mic, MicOff, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRecallStore } from "@/stores/recall-store";
import { useVoiceInput } from "@/hooks/use-voice-input";

interface QuickAddProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddDialog({ open, onClose }: QuickAddProps): JSX.Element {
  const { t } = useTranslation();
  const decks = useRecallStore((state) => state.decks);
  const createCard = useRecallStore((state) => state.createCard);
  const voiceInputEnabled = useRecallStore((state) => state.settings.voiceInputEnabled);
  const [deckId, setDeckId] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const frontValueRef = useRef("");
  const backValueRef = useRef("");

  const frontVoice = useVoiceInput(frontValueRef, setFront);
  const backVoice = useVoiceInput(backValueRef, setBack);

  useEffect(() => {
    if (open) {
      setFront("");
      setBack("");
      frontValueRef.current = "";
      backValueRef.current = "";
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

    if (!deckId) {
      toast.error(t("quickAdd.selectDeckFirst"));
      return;
    }
    if (!front.trim()) {
      toast.error(t("quickAdd.frontEmpty"));
      return;
    }
    if (!back.trim()) {
      toast.error(t("quickAdd.backEmpty"));
      return;
    }

    try {
      await createCard({ deckId, front, back, hint: "", source: "", tags: [] });
      toast.success(t("quickAdd.added"));
      setFront("");
      setBack("");
      frontValueRef.current = "";
      backValueRef.current = "";
      frontRef.current?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("quickAdd.unknownError");
      toast.error(t("quickAdd.addFailed", { message }));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return <></>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
    >
      <div
        className="mx-4 w-full max-w-lg border border-outline-variant bg-surface p-6 text-text-primary shadow-sm dark:border-outline-variant dark:bg-background dark:text-text-primary"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="mb-5">
          <h2 id="quick-add-title" className="text-base font-medium tracking-tight text-text-primary dark:text-text-primary">{t("quickAdd.title")}</h2>
          <p className="text-sm text-on-surface-variant dark:text-on-surface-variant">{t("quickAdd.pressEscapeToClose")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {decks.length > 0 ? (
            <Select value={deckId} onValueChange={setDeckId}>
              <SelectTrigger className="border-outline-variant dark:border-outline-variant" aria-label={t("quickAdd.selectDeckAria")}>
                <SelectValue placeholder={t("quickAdd.selectDeckPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-on-surface-variant dark:text-on-surface-variant">{t("quickAdd.createDeckFirst")}</p>
          )}

          <div className="relative">
            <Textarea
              ref={frontRef}
              value={front}
              onChange={(e) => { setFront(e.target.value); frontValueRef.current = e.target.value; }}
              placeholder={t("quickAdd.frontPlaceholder")}
              aria-label={t("quickAdd.frontAria")}
              className="min-h-[80px] border-outline-variant font-mono text-sm"
              disabled={decks.length === 0}
            />
            {voiceInputEnabled && frontVoice.supported && (
              <button
                type="button"
                onClick={frontVoice.toggle}
                title={t("cardDialog.voiceInput")}
                aria-label={t("cardDialog.voiceInput")}
                className={`absolute right-2 top-2 rounded-md p-1.5 transition-colors ${frontVoice.listening ? "text-red-500 animate-pulse" : "text-on-surface-variant hover:text-text-secondary dark:hover:text-text-primary"}`}
              >
                {frontVoice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              value={back}
              onChange={(e) => { setBack(e.target.value); backValueRef.current = e.target.value; }}
              placeholder={t("quickAdd.backPlaceholder")}
              aria-label={t("quickAdd.backAria")}
              className="border-outline-variant dark:border-outline-variant"
              disabled={decks.length === 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" && front.trim() && back.trim()) {
                  e.preventDefault();
                  void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            {voiceInputEnabled && backVoice.supported && (
              <button
                type="button"
                onClick={backVoice.toggle}
                title={t("cardDialog.voiceInput")}
                aria-label={t("cardDialog.voiceInput")}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors ${backVoice.listening ? "text-red-500 animate-pulse" : "text-on-surface-variant hover:text-text-secondary dark:hover:text-text-primary"}`}
              >
                {backVoice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-outline-variant pt-4 dark:border-outline-variant">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-on-surface-variant hover:text-text-primary hover:bg-surface-container-high dark:text-on-surface-variant dark:hover:text-text-primary dark:hover:bg-surface-container">
              {t("quickAdd.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={!deckId || !front.trim() || !back.trim()} className="bg-primary text-on-primary hover:bg-primary-hover dark:bg-primary dark:text-on-primary dark:hover:bg-primary-container">
              <Plus className="h-4 w-4 mr-1" />
              {t("quickAdd.addCard")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
