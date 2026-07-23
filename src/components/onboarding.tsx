import { ArrowRight, BookCheck, Brain, ChevronLeft, ChevronRight, Shield, Sparkles } from "lucide-react";
import { useRecallStore } from "@/stores/recall-store";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { TEMPLATE_DECKS, createCardsFromTemplate, type TemplateDeck } from "@/data/templates";
import { TryCard } from "@/components/onboarding/try-card";
import { RecallLogo } from "@/components/recall-logo";
import { cn } from "@/lib/utils";
import { cardSurface, typeClass } from "@/lib/surface";
import type { Card, Deck } from "@/types";

type Step = "welcome" | "concept" | "system" | "try" | "templates" | "goal";

export function Onboarding(): JSX.Element {
  const { t } = useTranslation();
  const completeOnboarding = useRecallStore((state) => state.completeOnboarding);
  const importTemplateDecks = useRecallStore((state) => state.importTemplateDecks);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const [step, setStep] = useState<Step>("welcome");
  const [visible, setVisible] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState(20);

  const tryCard = useMemo(() => {
    const tpl = TEMPLATE_DECKS.find((t) => t.defaultTryDeck) ?? TEMPLATE_DECKS[0];
    const { cards } = createCardsFromTemplate(tpl);
    return cards[0];
  }, []);

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
        const allDecks: Deck[] = [];
        const allCards: Card[] = [];
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

  const steps: Step[] = ["welcome", "concept", "system", "try", "templates", "goal"];
  const stepIndex = steps.indexOf(step);

  return (
    <main className="flex min-h-screen flex-col bg-background text-text-primary">
      {/* ── Header ── */}
      {step !== "welcome" && (
        <header className="flex items-center justify-between px-gutter-mobile h-14 shrink-0">
          <div className="flex items-center gap-2">
            <RecallLogo className="h-8 w-8 object-contain" />
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
            onClick={() => setStep("templates")}
          >
            {t("onboarding.skip")}
          </button>
        </header>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-4">
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
            <div className="flex items-center justify-center">
              <RecallLogo className="h-16 w-16 object-contain" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
                {t("onboarding.welcomeTitle")}
              </h1>
              <p className="text-sm text-on-surface-variant">
                {t("onboarding.welcomeTagline")}
              </p>
            </div>
            <div className="space-y-3">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
                onClick={() => setStep("concept")}
              >
                {t("onboarding.getStarted")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-on-surface-variant">
                {t("onboarding.privacyNote")}
              </p>
              <button
                className="text-sm text-on-surface-variant underline underline-offset-4 hover:text-primary transition-colors"
                onClick={() => setStep("templates")}
              >
                {t("onboarding.alreadyHaveAccount")}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: How It Works ── */}
        {step === "concept" && (
          <div className="space-y-6">
            <div className={cn(cardSurface("p-6"), "space-y-6")}>
              {/* Timeline illustration */}
              <div className="relative mx-auto aspect-[21/9] w-full max-w-md overflow-hidden rounded-xl bg-surface-container-lowest">
                {/* Forgetting curve (dashed) */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 160" aria-hidden="true">
                  <path
                    d="M 40 140 C 80 140 120 40 180 40 C 240 40 280 130 360 130"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    fill="none"
                    className="text-outline-variant"
                  />
                  {/* Timeline */}
                  <line x1="20" y1="140" x2="380" y2="140" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary" />
                  {/* Dots */}
                  <circle cx="60" cy="140" r="5" className="fill-primary" />
                  <circle cx="180" cy="140" r="5" className="fill-primary" />
                  <circle cx="300" cy="140" r="5" className="fill-primary" />
                  {/* Labels */}
                  <text x="60" y="154" textAnchor="middle" className="fill-on-surface-variant text-[10px]">Day 0</text>
                  <text x="180" y="154" textAnchor="middle" className="fill-on-surface-variant text-[10px]">Day 3</text>
                  <text x="300" y="154" textAnchor="middle" className="fill-on-surface-variant text-[10px]">Day 10</text>
                </svg>
                {/* Floating card */}
                <div className="absolute left-[44%] top-[20%] z-10 flex h-16 w-24 flex-col justify-between rounded-lg border-2 border-primary-soft bg-surface p-2 shadow-md">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-6 rounded-full bg-primary-soft" />
                    <div className="h-1.5 w-3 rounded-full bg-surface-variant" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 w-full rounded-full bg-surface-container-highest" />
                    <div className="h-1 w-3/4 rounded-full bg-surface-container-highest" />
                  </div>
                </div>
                {/* Pulse highlight */}
                <div className="absolute left-[44%] top-[75%] h-8 w-8 animate-ping rounded-full bg-primary/10" />
                <div className="absolute left-[44%] top-[75%] flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
              </div>

              {/* Text */}
              <div className="space-y-2 text-center">
                <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
                  {t("onboarding.conceptTitle")}
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {t("onboarding.conceptDesc")}
                </p>
              </div>

              {/* Badge */}
              <div className="flex items-center justify-center gap-2 rounded-full bg-secondary-container/10 px-4 py-1.5">
                <BookCheck className="h-4 w-4 text-secondary" aria-hidden="true" />
                <span className="text-xs font-semibold text-secondary">{t("onboarding.conceptBadge")}</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-6 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
                onClick={() => setStep("welcome")}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {t("onboarding.back")}
              </button>
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
                onClick={() => setStep("system")}
              >
                {t("onboarding.conceptNext")}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: How to Rate ── */}
        {step === "system" && (
          <div className="space-y-6">
            <div className={cn(cardSurface("p-6"), "space-y-6")}>
              <div className="space-y-2 text-center">
                <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
                  {t("onboarding.systemTitle")}
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {t("onboarding.systemDesc")}
                </p>
              </div>

              {/* Rating buttons preview */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t("study.again"), time: "1m", color: "border-review-again bg-review-again/5 text-review-again" },
                  { label: t("study.hard"), time: "4d", color: "border-review-hard bg-review-hard/5 text-review-hard" },
                  { label: t("study.good"), time: "10d", color: "border-review-good bg-review-good/5 text-review-good" },
                  { label: t("study.easy"), time: "25d", color: "border-review-easy bg-review-easy/5 text-review-easy" },
                ].map((r) => (
                  <div
                    key={r.label}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 px-4 py-3 ${r.color}`}
                  >
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className="text-xs opacity-70">{r.time}</span>
                  </div>
                ))}
              </div>

              {/* Explanation cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-primary-soft px-4 py-3 text-center">
                  <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-semibold text-primary">{t("onboarding.systemOptimal")}</p>
                  <p className={cn(typeClass.caption, "mt-0.5 text-on-surface-variant")}>{t("onboarding.systemOptimalDesc")}</p>
                </div>
                <div className="rounded-xl bg-secondary-container/10 px-4 py-3 text-center">
                  <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
                    <Sparkles className="h-4 w-4 text-secondary" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-semibold text-secondary">{t("onboarding.systemFsrs")}</p>
                  <p className={cn(typeClass.caption, "mt-0.5 text-on-surface-variant")}>{t("onboarding.systemFsrsDesc")}</p>
                </div>
                <div className="rounded-xl bg-tertiary-container/10 px-4 py-3 text-center">
                  <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-tertiary/10">
                    <Shield className="h-4 w-4 text-tertiary" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-semibold text-tertiary">{t("onboarding.systemTrust")}</p>
                  <p className={cn(typeClass.caption, "mt-0.5 text-on-surface-variant")}>{t("onboarding.systemTrustDesc")}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-6 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
                onClick={() => setStep("concept")}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {t("onboarding.back")}
              </button>
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
                onClick={() => setStep("try")}
              >
                {t("onboarding.systemNext")}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Try ── */}
        {step === "try" && (
          <div className="space-y-6">
            <TryCard card={tryCard} onContinue={() => setStep("templates")} />
            <div className="flex gap-3">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-6 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
                onClick={() => setStep("system")}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("onboarding.back")}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Templates ── */}
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
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-6 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
                onClick={() => setStep("try")}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("onboarding.back")}
              </button>
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
                onClick={() => setStep("goal")}
              >
                {selectedTemplates.size > 0
                  ? t("onboarding.continueWith", { count: selectedTemplates.size })
                  : t("onboarding.skip")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Daily Goal ── */}
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

            {/* Large number display */}
            <div className="py-4">
              <span className="font-display text-[4.5rem] font-bold leading-none tracking-tight text-text-primary tabular-nums">
                {goal}
              </span>
              <span className={cn(typeClass["body-lg"], "text-on-surface-variant ml-1")}>
                {t("onboarding.cardsPerDay")}
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
                className="w-full h-2 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary"
                aria-label={t("onboarding.goalSliderAria")}
              />
              <div className="flex justify-between text-xs text-outline">
                <span>5</span>
                <span>100</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={75} aria-valuemin={0} aria-valuemax={100}>
              <div className="bg-primary h-full rounded-full w-3/4" />
            </div>

            <p className="text-xs text-on-surface-variant italic">
              {goal <= 10
                ? t("onboarding.goalMotivation_low")
                : goal >= 50
                  ? t("onboarding.goalMotivation_high")
                  : t("onboarding.goalMotivation_mid")}
            </p>

            <div className="flex gap-3">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-6 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
                onClick={() => setStep("templates")}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("onboarding.back")}
              </button>
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all"
                onClick={() => void handleImportAndFinish()}
              >
                <Sparkles className="h-4 w-4" />
                {t("onboarding.startLearning")}
              </button>
            </div>
          </div>
        )}
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