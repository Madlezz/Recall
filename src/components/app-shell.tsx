import { BookOpen, Database, Home, Settings, Shield, Star, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getDueTodayCount } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { getLevel, getLevelTitle } from "@/lib/xp";
import { useRecallStore } from "@/stores/recall-store";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const view = useRecallStore((state) => state.view);
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const showSettings = useRecallStore((state) => state.showSettings);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card/80 p-4 backdrop-blur lg:block">
        <button className="flex w-full items-center gap-3 text-left" onClick={showDashboard}>
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Recall</span>
            <span className="block text-xs text-muted-foreground">Focused flashcards</span>
          </span>
        </button>

        <nav className="mt-8 space-y-1">
          <NavButton active={view === "dashboard"} icon={Home} label="Dashboard" onClick={showDashboard} />
          <NavButton active={view === "settings"} icon={Settings} label="Settings" onClick={showSettings} />
        </nav>

        <div className="mt-8 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Local data
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="font-semibold">{decks.length}</div>
              <div className="text-xs text-muted-foreground">Decks</div>
            </div>
            <div>
              <div className="font-semibold">{cards.length}</div>
              <div className="text-xs text-muted-foreground">Cards</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      {getDueTodayCount(cards)} due today
                    </div>
                  </div>

                  <LevelWidget />

                </aside>
      <header className="sticky top-0 z-30 border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 font-semibold" onClick={showDashboard}>
            <BookOpen className="h-5 w-5 text-primary" />
            Recall
          </button>
          <Button variant="ghost" size="icon" onClick={showSettings} aria-label="Open settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
}

function NavButton({ active, icon: Icon, label, onClick }: NavButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function LevelWidget(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const level = getLevel(settings.xp);
  const title = getLevelTitle(level);

  return (
    <div className="mt-4 rounded-lg border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        Level {level} · {title}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {settings.xp} XP earned · Keep reviewing to level up!
      </div>
    </div>
  );
}
