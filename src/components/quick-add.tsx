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
        className="mx-4 w-full max-w-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="mb-5">
          <h2 id="quick-add-title" className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100">{t("quickAdd.title")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("quickAdd.pressEscapeToClose")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {decks.length > 0 ? (
            <Select value={deckId} onValueChange={setDeckId}>
              <SelectTrigger className="border-zinc-200 dark:border-zinc-800" aria-label={t("quickAdd.selectDeckAria")}>
                <SelectValue placeholder={t("quickAdd.selectDeckPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("quickAdd.createDeckFirst")}</p>
          )}

          <div className="relative">
            <Textarea
              ref={frontRef}
              value={front}
              onChange={(e) => { setFront(e.target.value); frontValueRef.current = e.target.value; }}
              placeholder={t("quickAdd.frontPlaceholder")}
              aria-label={t("quickAdd.frontAria")}
              className="min-h-[80px] border-zinc-200 font-mono text-sm dark:border-zinc-800"
              disabled={decks.length === 0}
            />
            {voiceInputEnabled && frontVoice.supported && (
              <button
                type="button"
                onClick={frontVoice.toggle}
                title={t("cardDialog.voiceInput")}
                aria-label={t("cardDialog.voiceInput")}
                className={`absolute right-2 top-2 rounded-md p-1.5 transition-colors ${frontVoice.listening ? "text-red-500 animate-pulse" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
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
              className="border-zinc-200 dark:border-zinc-800"
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
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors ${backVoice.listening ? "text-red-500 animate-pulse" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`}
              >
                {backVoice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800">
              {t("quickAdd.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={!deckId || !front.trim() || !back.trim()} className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              <Plus className="h-4 w-4 mr-1" />
              {t("quickAdd.addCard")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
