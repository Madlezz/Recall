import { BookOpen, Database, Home, LayoutGrid, Settings, Shield, Star, TrendingUp, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getDueTodayCount } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { getLevel, getLevelTitle, levelProgress } from "@/lib/xp";
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
      const showStats = useRecallStore((state) => state.showStats);
      const showBrowser = useRecallStore((state) => state.showBrowser);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex lg:flex-col">
              <div className="flex h-14 items-center gap-3 border-b px-4">
                <button className="flex items-center gap-2.5" onClick={showDashboard}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">Recall</span>
                </button>
              </div>

              <nav className="flex-1 space-y-0.5 px-3 py-4">
                        <NavButton active={view === "dashboard"} icon={Home} label="Dashboard" onClick={showDashboard} />
                        <NavButton active={view === "browser"} icon={LayoutGrid} label="Browser" onClick={showBrowser} />
                        <NavButton active={view === "stats"} icon={TrendingUp} label="Stats" onClick={showStats} />
                        <NavButton active={view === "settings"} icon={Settings} label="Settings" onClick={showSettings} />
                      </nav>

              <div className="border-t px-3 py-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  <Database className="h-3 w-3" />
                  Library
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                    <div className="font-semibold text-sm">{decks.length}</div>
                    <div className="text-[10px] text-muted-foreground">Decks</div>
                  </div>
                  <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                    <div className="font-semibold text-sm">{cards.length}</div>
                    <div className="text-[10px] text-muted-foreground">Cards</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="font-medium text-foreground">{getDueTodayCount(cards)}</span> due today
                </div>
              </div>

              <div className="border-t px-3 py-3">
                <LevelWidget />
              </div>

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
        "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {/* Active indicator */}
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />}
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function LevelWidget(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const level = getLevel(settings.xp);
  const title = getLevelTitle(level);
  const unlocked = settings.achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Shield className="h-3 w-3" />
          Level {level}
        </div>
        <span className="text-[10px] text-muted-foreground">{title}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round(levelProgress(settings.xp) * 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{settings.xp} XP</span>
        <span className="flex items-center gap-1">
          <Star className="h-2.5 w-2.5" />
          {unlocked}/14
        </span>
      </div>
    </div>
  );
}
