import { BookCheck, Brain, Shuffle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { useEffect, useState } from "react";

export function Onboarding(): JSX.Element {
  const completeOnboarding = useRecallStore((state) => state.completeOnboarding);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const steps = [
    {
      icon: Brain,
      title: "Welcome to Recall",
      subtitle: "Beautiful flashcards that live on your computer. No cloud, no account, no nonsense.",
    },
    {
      icon: Zap,
      title: "Smart Review, Zero Setup",
      subtitle: "Recall uses the best spaced repetition algorithm. You just review — it handles the rest.",
    },
    {
      icon: BookCheck,
      title: "Your Cards, Your Way",
      subtitle: "Rich formatting, LaTeX math, code highlighting. But it works great with plain text too.",
    },
    {
      icon: Shuffle,
      title: "We Made You Some Cards",
      subtitle: "Start with 9 demo cards across 3 topics. You can delete them anytime.",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div
        className={`w-full max-w-md space-y-10 text-center transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="space-y-2">
          <h1 className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Recall
          </h1>
          <p className="text-sm text-muted-foreground">Beautiful. Simple. Private.</p>
        </div>

        <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <current.icon className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{current.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{current.subtitle}</p>
          </div>
        </div>

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={() => (isLast ? completeOnboarding() : setStep(step + 1))}>
            {isLast ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Learning
              </>
            ) : (
              "Continue"
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-primary" : "w-1.5 bg-muted"
                }`}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          {step > 0 && (
            <button
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => void completeOnboarding()}
            >
              Skip to Dashboard
            </button>
          )}
        </div>
      </div>
    </main>
  );
}