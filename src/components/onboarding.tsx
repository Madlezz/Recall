import { BookCheck, Brain, Shield, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TEMPLATE_DECKS, createCardsFromTemplate, type TemplateDeck } from "@/data/templates";
import { cardSurface } from "@/lib/surface";

export function Onboarding(): JSX.Element {
  const { t } = useTranslation();
  const completeOnboarding = useRecallStore((state) => state.completeOnboarding);
  const startFresh = useRecallStore((state) => state.startFresh);
  const importTemplateDecks = useRecallStore((state) => state.importTemplateDecks);
  const [visible, setVisible] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
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
      toast.error(t("onboarding.loadDemoFailed", { message }));
    }
  }

  async function handleStartFresh(): Promise<void> {
    try {
      await startFresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to start fresh:", error);
      toast.error(t("onboarding.resetDataFailed", { message }));
    }
  }

  async function handleImportTemplates(): Promise<void> {
    if (selectedTemplates.size === 0) {
      toast.error(t("onboarding.selectAtLeastOne"));
      return;
    }

    try {
      const allDecks = [];
      const allCards = [];

      for (const templateId of selectedTemplates) {
        const template = TEMPLATE_DECKS.find((tpl) => tpl.id === templateId);
        if (template) {
          const { deck, cards } = createCardsFromTemplate(template);
          allDecks.push(deck);
          allCards.push(...cards);
        }
      }

      await importTemplateDecks(allDecks, allCards);
      toast.success(t("onboarding.importedDecks", { count: allDecks.length }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to import templates:", error);
      toast.error(t("onboarding.importFailed", { message }));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-text-primary">
      <div
        className={`w-full max-w-2xl space-y-8 text-center transition-all duration-500 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        role="region"
        aria-label={t("onboarding.welcomeAria")}
      >
        <div className="space-y-4">
          <div className={cardSurface("mx-auto flex h-14 w-14 items-center justify-center rounded-xl")}>
            <Brain className="h-7 w-7 text-text-primary" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-text-primary">
              {t("onboarding.appName")}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {t("onboarding.tagline")}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-left" role="group" aria-label={t("onboarding.featuresAria")}>
          <div className={cardSurface("space-y-2 rounded-lg p-3")}>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Zap className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
              {t("onboarding.feature1Title")}
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {t("onboarding.feature1Desc")}
            </p>
          </div>

          <div className={cardSurface("space-y-2 rounded-lg p-3")}>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <BookCheck className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
              {t("onboarding.feature2Title")}
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {t("onboarding.feature2Desc")}
            </p>
          </div>

          <div className={cardSurface("space-y-2 rounded-lg p-3")}>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Shield className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
              {t("onboarding.feature3Title")}
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {t("onboarding.feature3Desc")}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-left">
          <h2 className="text-sm font-semibold text-text-secondary">
            {t("onboarding.templateHeader")}
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
              className="w-full bg-primary text-on-primary hover:bg-primary-hover dark:hover:bg-primary-hover"
              onClick={() => void handleImportTemplates()}
              aria-label={t("onboarding.importTemplatesAria", { count: selectedTemplates.size })}
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("onboarding.importTemplates", { count: selectedTemplates.size })}
            </Button>
          )}

          <Button
            size="lg"
            variant={selectedTemplates.size > 0 ? "outline" : "default"}
            className={`w-full ${
              selectedTemplates.size > 0
                ? "border-outline-variant text-text-secondary hover:bg-surface-container-high"
                : "bg-primary text-on-primary hover:bg-primary-hover"
            }`}
            onClick={() => void handleTryDemo()}
            aria-label={t("onboarding.tryDemoAria")}
          >
            {t("onboarding.tryDemo")}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full border-outline-variant text-text-secondary hover:bg-surface-container-high"
            onClick={() => void handleStartFresh()}
            aria-label={t("onboarding.startFreshAria")}
          >
            {t("onboarding.startFresh")}
          </Button>

          <p className="text-xs text-on-surface-variant" id="privacy-note">
            {t("onboarding.privacyNote")}
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
  const { t } = useTranslation();
  return (
    <button
      onClick={onToggle}
      className={`rounded-lg border p-4 text-left transition-all ${
        selected
          ? "border-primary bg-primary-soft ring-2 ring-primary/20"
          : "border-outline-variant bg-surface hover:border-outline"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden="true">
          {template.icon}
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-text-primary">
            {template.name}
          </h3>
          <p className="text-xs text-on-surface-variant">
            {template.description}
          </p>
          <p className="text-xs text-on-surface-variant">
            {t("onboarding.cardsCount", { count: template.cards.length })}
          </p>
        </div>
        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
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