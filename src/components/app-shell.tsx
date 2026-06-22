import { BookOpen, Home, LayoutGrid, Settings, Shield, Star, Tag, TrendingUp, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
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
  const showTags = useRecallStore((state) => state.showTags);

  const dueCount = getDueTodayCount(cards);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* ── Skip navigation ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg dark:focus:bg-white dark:focus:text-zinc-900"
      >
        Skip to main content
      </a>

      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        {/* Logo */}
        <button
          aria-label="Go to dashboard"
          onClick={showDashboard}
          className="flex items-center gap-2.5 px-5 h-14 shrink-0"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
          <span className="font-semibold text-sm tracking-tight">Recall</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1" aria-label="Main navigation">
          <NavButton active={view === "dashboard"} icon={Home} label="Dashboard" onClick={showDashboard} />
          <NavButton active={view === "browser"} icon={LayoutGrid} label="Browser" onClick={showBrowser} />
          <NavButton active={view === "tags"} icon={Tag} label="Tags" onClick={showTags} />
          <NavButton active={view === "stats"} icon={TrendingUp} label="Stats" onClick={showStats} />
          <NavButton active={view === "settings"} icon={Settings} label="Settings" onClick={showSettings} />
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-zinc-100 dark:bg-zinc-800" />

        {/* Library stats */}
        <div className="px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">Library</span>
            <span className="text-[10px] tabular-nums text-zinc-400">{decks.length} decks</span>
          </div>
          <div className="flex items-center text-sm tabular-nums">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{cards.length}</span>
            <span className="ml-1.5 text-zinc-400">cards</span>
            {dueCount > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Zap className="h-3 w-3" />
                {dueCount}
              </span>
            )}
          </div>
        </div>

        {/* Level */}
        <div className="px-5 pb-4 pt-1">
          <LevelWidget />
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90 lg:hidden">
        <button className="flex items-center gap-2 font-semibold text-sm" onClick={showDashboard}>
          <BookOpen className="h-5 w-5" />
          Recall
        </button>
        <Button variant="ghost" size="icon" onClick={showSettings} aria-label="Open settings">
          <Settings className="h-4 w-4" />
        </Button>
      </header>

      {/* ── Main content ── */}
      <main id="main-content" className="lg:pl-56" tabIndex={-1}>
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">{children}</div>
      </main>

      {/* ── Command Palette ── */}
      <CommandPalette />
    </div>
  );
}

// ── NavButton ──

interface NavButtonProps {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
}

function NavButton({ active, icon: Icon, label, onClick }: NavButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-zinc-100 text-zinc-900 font-medium dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

// ── LevelWidget ──

function LevelWidget(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const level = getLevel(settings.xp);
  const title = getLevelTitle(level);
  const progress = levelProgress(settings.xp);
  const unlocked = settings?.achievements?.filter((a) => a.unlockedAt)?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
          Level {level}
        </span>
        <span className="text-[10px] text-zinc-400 tabular-nums">{settings.xp} XP</span>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <Shield className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${level} progress: ${settings.xp} XP`}>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-zinc-700 transition-[width] duration-700 ease-out dark:bg-zinc-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="flex items-center gap-1 mt-1.5">
        <Star className="h-2.5 w-2.5 text-zinc-400" />
        <span className="text-[10px] text-zinc-400 tabular-nums">{unlocked}/14</span>
      </div>
    </div>
  );
}