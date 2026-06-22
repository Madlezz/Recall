import { BookCheck, Brain, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TEMPLATE_DECKS, createCardsFromTemplate, type TemplateDeck } from "@/data/templates";

export function Onboarding(): JSX.Element {
  const completeOnboarding = useRecallStore((state) => state.completeOnboarding);
  const startFresh = useRecallStore((state) => state.startFresh);
  const importTemplateDecks = useRecallStore((state) => state.importTemplateDecks);
  const [visible, setVisible] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  function toggleTemplate(id: string): void {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleTryDemo(): Promise<void> {
    try {
      await completeOnboarding();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to complete onboarding:", error);
      toast.error(`Failed to load demo cards: ${message}`);
    }
  }

  async function handleStartFresh(): Promise<void> {
    try {
      await startFresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to start fresh:", error);
      toast.error(`Failed to reset data: ${message}`);
    }
  }

  async function handleImportTemplates(): Promise<void> {
    if (selectedTemplates.size === 0) {
      toast.error("Please select at least one template");
      return;
    }

    try {
      const allDecks = [];
      const allCards = [];

      for (const templateId of selectedTemplates) {
        const template = TEMPLATE_DECKS.find((t) => t.id === templateId);
        if (template) {
          const { deck, cards } = createCardsFromTemplate(template);
          allDecks.push(deck);
          allCards.push(...cards);
        }
      }

      await importTemplateDecks(allDecks, allCards);
      toast.success(`Imported ${allDecks.length} template deck(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to import templates:", error);
      toast.error(`Failed to import templates: ${message}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div
        className={`w-full max-w-2xl space-y-8 text-center transition-all duration-500 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        role="region"
        aria-label="Welcome to Recall"
      >
        <div className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <Brain className="h-7 w-7 text-zinc-800 dark:text-zinc-200" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Recall
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Beautiful flashcards, no cloud, no account.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-left" role="group" aria-label="Features">
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Zap className="h-4 w-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
              Smart Review, Zero Setup
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Uses the best spaced repetition algorithm (FSRS). You just review, it handles the rest.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <BookCheck className="h-4 w-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
              Rich Cards, Plain Text
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Markdown, LaTeX math, code highlighting. But it works great with plain text too.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-left">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Start with a template (optional)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_DECKS.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplates.has(template.id)}
                onToggle={() => toggleTemplate(template.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {selectedTemplates.size > 0 && (
            <Button
              size="lg"
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={() => void handleImportTemplates()}
              aria-label={`Import ${selectedTemplates.size} template(s)`}
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Import {selectedTemplates.size} Template{selectedTemplates.size > 1 ? "s" : ""}
            </Button>
          )}

          <Button
            size="lg"
            variant={selectedTemplates.size > 0 ? "outline" : "default"}
            className={`w-full ${
              selectedTemplates.size > 0
                ? "border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            }`}
            onClick={() => void handleTryDemo()}
            aria-label="Try with Demo Cards"
          >
            Try with Demo Cards
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() => void handleStartFresh()}
            aria-label="Start fresh with empty decks"
          >
            Start Fresh
          </Button>

          <p className="text-xs text-zinc-400 dark:text-zinc-500" id="privacy-note">
            Your data lives on your computer. No account, no cloud, no telemetry.
          </p>
        </div>
      </div>
    </main>
  );
}

function TemplateCard({
  template,
  selected,
  onToggle,
}: {
  template: TemplateDeck;
  selected: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onToggle}
      className={`rounded-lg border p-4 text-left transition-all ${
        selected
          ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-900 dark:ring-zinc-100/10"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden="true">
          {template.icon}
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {template.name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {template.description}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {template.cards.length} cards
          </p>
        </div>
        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
