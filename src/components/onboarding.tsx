import { BookCheck, Brain, ChevronLeft, ChevronRight, Shield, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TEMPLATE_DECKS, createCardsFromTemplate, type TemplateDeck } from "@/data/templates";
import { Mascot } from "@/components/mascot";
import { cardSurface } from "@/lib/surface";
import { cn } from "@/lib/utils";

type Step = "welcome" | "templates" | "goal";

const GOAL_OPTIONS = [5, 10, 20, 30, 50];

export function Onboarding(): JSX.Element {
  const { t } = useTranslation();
  const completeOnboarding = useRecallStore((state) => state.completeOnboarding);
  const startFresh = useRecallStore((state) => state.startFresh);
  const importTemplateDecks = useRecallStore((state) => state.importTemplateDecks);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const [step, setStep] = useState<Step>("welcome");
  const [visible, setVisible] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  function toggleTemplate(id: string): void {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImportAndFinish(): Promise<void> {
    try {
      if (selectedTemplates.size > 0) {
        const allDecks: any[] = [];
        const allCards: any[] = [];
        for (const templateId of selectedTemplates) {
          const template = TEMPLATE_DECKS.find((tpl) => tpl.id === templateId);
          if (template) {
            const { deck, cards } = createCardsFromTemplate(template);
            allDecks.push(deck);
            allCards.push(...cards);
          }
        }
        await importTemplateDecks(allDecks, allCards);
      }
      updateSettings({ dailyGoal: goal });
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

  const steps: Step[] = ["welcome", "templates", "goal"];
  const stepIndex = steps.indexOf(step);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-text-primary">
      <div
        className={cn(
          "w-full max-w-lg space-y-8 text-center transition-all duration-500",
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
        role="region"
        aria-label={t("onboarding.welcomeAria")}
      >
        {/* ── Step indicator ── */}
        <div className="flex items-center justify-center gap-2" aria-label={t("onboarding.stepIndicator", { step: stepIndex + 1, total: steps.length })}>
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === stepIndex ? "w-6 bg-primary" : i < stepIndex ? "w-2 bg-primary/40" : "w-2 bg-outline-variant",
              )}
            />
          ))}
        </div>

        {/* ── Step 1: Welcome ── */}
        {step === "welcome" && (
          <div className="space-y-6">
            <Mascot className="mx-auto h-20 w-20" />
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
                {t("onboarding.welcomeTitle")}
              </h1>
              <p className="text-sm text-on-surface-variant">
                {t("onboarding.welcomeTagline")}
              </p>
            </div>
            <div className="space-y-3 text-left" role="group" aria-label={t("onboarding.featuresAria")}>
              {[
                { icon: Zap, title: t("onboarding.feature1Title"), desc: t("onboarding.feature1Desc") },
                { icon: BookCheck, title: t("onboarding.feature2Title"), desc: t("onboarding.feature2Desc") },
                { icon: Shield, title: t("onboarding.feature3Title"), desc: t("onboarding.feature3Desc") },
              ].map((f, i) => (
                <div key={i} className={cardSurface("space-y-1 rounded-lg p-3")}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <f.icon className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
                    {f.title}
                  </div>
                  <p className="text-xs leading-relaxed text-on-surface-variant">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Button size="lg" className="w-full" onClick={() => setStep("templates")}>
                {t("onboarding.getStarted")}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-on-surface-variant" onClick={handleStartFresh}>
                {t("onboarding.startFresh")}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Templates ── */}
        {step === "templates" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Brain className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              <h2 className="font-headline text-xl font-bold tracking-tight text-text-primary">
                {t("onboarding.pickTemplates")}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {t("onboarding.pickTemplatesDesc")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              {TEMPLATE_DECKS.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplates.has(template.id)}
                  onToggle={() => toggleTemplate(template.id)}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep("welcome")}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("onboarding.back")}
              </Button>
              <Button size="lg" className="flex-1" onClick={() => setStep("goal")}>
                {selectedTemplates.size > 0
                  ? t("onboarding.continueWith", { count: selectedTemplates.size })
                  : t("onboarding.skip")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Daily Goal ── */}
        {step === "goal" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Sparkles className="mx-auto h-10 w-10 text-secondary" aria-hidden="true" />
              <h2 className="font-headline text-xl font-bold tracking-tight text-text-primary">
                {t("onboarding.setGoal")}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {t("onboarding.setGoalDesc")}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={cn(
                    "rounded-xl px-5 py-3 text-lg font-bold tabular-nums transition-all",
                    goal === g
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container text-text-primary hover:bg-surface-container-high",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant">
              {t("onboarding.goalHint", { count: goal })}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep("templates")}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("onboarding.back")}
              </Button>
              <Button size="lg" className="flex-1" onClick={() => void handleImportAndFinish()}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("onboarding.startLearning")}
              </Button>
            </div>
          </div>
        )}
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
      className={cn(
        "rounded-lg border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary-soft ring-2 ring-primary/20"
          : "border-outline-variant bg-surface hover:border-outline",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden="true">{template.icon}</div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-text-primary">{template.name}</h3>
          <p className="text-xs text-on-surface-variant">{template.description}</p>
          <p className="text-xs text-on-surface-variant">{t("onboarding.cardsCount", { count: template.cards.length })}</p>
        </div>
        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}