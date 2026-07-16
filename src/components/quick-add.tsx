import { Mic, MicOff, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogTitle id="quick-add-title">{t("quickAdd.title")}</DialogTitle>
        <DialogDescription>{t("quickAdd.pressEscapeToClose")}</DialogDescription>

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
                className={`absolute right-2 top-2 rounded-md p-1.5 transition-colors ${frontVoice.listening ? "text-destructive animate-pulse" : "text-on-surface-variant hover:text-text-secondary dark:hover:text-text-primary"}`}
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
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors ${backVoice.listening ? "text-destructive animate-pulse" : "text-on-surface-variant hover:text-text-secondary dark:hover:text-text-primary"}`}
              >
                {backVoice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-outline-variant pt-4 dark:border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-text-primary active:scale-95 transition-all"
            >
              {t("quickAdd.cancel")}
            </button>
            <button
              type="submit"
              disabled={!deckId || !front.trim() || !back.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl hover:bg-primary-hover active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("quickAdd.addCard")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
