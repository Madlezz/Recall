import { Home, LayoutGrid, Library, Play, Settings, Shield, Star, Tag, Timer, TrendingUp, Zap, Download } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CommandPalette } from "@/components/command-palette";
import { RecallLogo } from "@/components/recall-logo";
import { getDueTodayCount } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { typeClass } from "@/lib/surface";
import { getLevel, getLevelTitle, levelProgress } from "@/lib/xp";
import { useRecallStore } from "@/stores/recall-store";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const { t } = useTranslation();
  const view = useRecallStore((state) => state.view);
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const showDashboard = useRecallStore((state) => state.showDashboard);
  const showSettings = useRecallStore((state) => state.showSettings);
  const showStats = useRecallStore((state) => state.showStats);
  const showBrowser = useRecallStore((state) => state.showBrowser);
  const showDeckBrowser = useRecallStore((state) => state.showDeckBrowser);
  const showTags = useRecallStore((state) => state.showTags);
  const showImportHub = useRecallStore((state) => state.showImportHub);
  const showFocusTimer = useRecallStore((state) => state.showFocusTimer);
  const startReview = useRecallStore((state) => state.startReview);
  const startMatch = useRecallStore((state) => state.startMatch);

  const dueCount = getDueTodayCount(cards);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* ── Skip navigation ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-inverse-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-inverse-on-surface focus:shadow-lg"
      >
        {t("nav.skipToMain")}
      </a>

      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-outline-variant bg-surface dark:bg-surface-container lg:flex">
        {/* Logo */}
        <button
          aria-label={t("nav.goToDashboard")}
          onClick={showDashboard}
          className="flex items-center gap-2.5 px-5 h-14 shrink-0"
        >
          <RecallLogo className="h-7 w-7 object-contain" />
          <span className="font-display font-semibold text-sm tracking-tight text-on-surface">Recall</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1" aria-label={t("nav.mainNav")}>
          <NavButton active={view === "dashboard"} icon={Home} label={t("nav.dashboard")} onClick={showDashboard} />
          <NavButton active={view === "deck-browser"} icon={Library} label={t("nav.decks")} onClick={showDeckBrowser} />
          <NavButton
            active={view === "study"}
            icon={Play}
            label={t("nav.review")}
            onClick={() => startReview(null)}
            badge={dueCount > 0 ? dueCount : undefined}
          />
          <NavButton active={view === "browser"} icon={LayoutGrid} label={t("nav.browser")} onClick={showBrowser} />
          <NavButton active={view === "tags"} icon={Tag} label={t("nav.tags")} onClick={showTags} />
          <NavButton active={view === "stats"} icon={TrendingUp} label={t("nav.stats")} onClick={showStats} />
          <NavButton active={view === "settings"} icon={Settings} label={t("nav.settings")} onClick={showSettings} />
          <NavButton active={view === "import-hub"} icon={Download} label={t("nav.importHub")} onClick={showImportHub} />

          {/* Tools section */}
          <div className="pt-3 pb-1 px-3">
            <span className={cn(typeClass.caption, "uppercase tracking-[0.15em] text-on-surface-variant")}>{t("nav.tools")}</span>
          </div>
          <NavButton active={view === "focus-timer"} icon={Timer} label={t("nav.focusTimer")} onClick={showFocusTimer} />
          <NavButton
            active={view === "match"}
            icon={Zap}
            label={t("nav.matchGame")}
            onClick={() => {
              const firstDeck = decks[0];
              if (firstDeck) startMatch(firstDeck.id);
              else showDashboard();
            }}
          />
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-outline-variant" />

        {/* Library stats */}
        <div className="px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className={cn(typeClass.caption, "uppercase tracking-[0.15em] text-on-surface-variant")}>{t("library.title")}</span>
            <span className="text-[10px] tabular-nums text-on-surface-variant">{t("library.decks", { count: decks.length })}</span>
          </div>
          <div className="flex items-center text-sm tabular-nums">
            <span className="font-semibold text-on-surface">{cards.length}</span>
            <span className="ml-1.5 text-on-surface-variant">{t("library.cards")}</span>
            {dueCount > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-secondary">
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

        {/* Shortcut hint */}
        <div className="px-5 pb-3">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
            className={cn(typeClass.caption, "text-on-surface-variant hover:text-on-surface transition-colors")}
            aria-label={t("nav.showShortcuts")}
          >
            {t("nav.pressForShortcuts")}
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-outline-variant bg-surface/90 px-4 backdrop-blur-sm dark:bg-surface-container/90 lg:hidden"
        style={{ minHeight: "calc(env(safe-area-inset-top) + 3.5rem)" }}
      >
        <button className="flex items-center gap-2 font-semibold text-sm text-on-surface" onClick={showDashboard}>
          <RecallLogo className="h-6 w-6 object-contain" />
          Recall
        </button>
        <div className="flex items-center gap-1">
          {/* Quick review button - primary action, thumb-reachable */}
          <button
            onClick={() => startReview(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
            aria-label={t("nav.review")}
          >
            <Play className="h-4 w-4" />
            {dueCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-secondary-container px-1.5 text-[10px] font-semibold text-on-secondary-container">
                {dueCount}
              </span>
            )}
          </button>
          <button
            onClick={showSettings}
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
            aria-label={t("nav.openSettings")}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main id="main-content" className="lg:pl-56" tabIndex={-1}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 lg:px-10 lg:py-8 lg:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-outline-variant bg-surface dark:bg-surface-container lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label={t("nav.mobileNav")}
      >
        <BottomTab active={view === "dashboard"} icon={Home} label={t("nav.dashboard")} onClick={showDashboard} />
        <BottomTab
          active={view === "study" || view === "match"}
          icon={Play}
          label={t("nav.review")}
          onClick={() => startReview(null)}
          badge={dueCount > 0 ? dueCount : undefined}
        />
        <BottomTab active={view === "deck-browser"} icon={Library} label={t("nav.decks")} onClick={showDeckBrowser} />
        <BottomTab active={view === "browser"} icon={LayoutGrid} label={t("nav.browser")} onClick={showBrowser} />
        <BottomTab active={view === "stats"} icon={TrendingUp} label={t("nav.stats")} onClick={showStats} />
      </nav>

      {/* ── Command Palette ── */}
      <CommandPalette />
    </div>
  );
}

// ── BottomTab (mobile bottom navigation) ──

interface BottomTabProps {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
  badge?: number;
}

function BottomTab({ active, icon: Icon, label, onClick, badge }: BottomTabProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors"
    >
      <span className="relative">
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            active ? "text-primary" : "text-on-surface-variant",
          )}
        />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary-container px-1 text-[9px] font-bold text-on-secondary-container">
            {badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          active ? "text-primary" : "text-on-surface-variant",
        )}
      >
        {label}
      </span>
    </button>
  );
}

// ── NavButton ──

interface NavButtonProps {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
  badge?: number;
}

function NavButton({ active, icon: Icon, label, onClick, badge }: NavButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary-soft text-primary font-medium"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface dark:hover:bg-surface-container",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-secondary-container px-1.5 text-[10px] font-semibold text-on-secondary-container">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── LevelWidget ──

function LevelWidget(): JSX.Element {
  const { t } = useTranslation();
  const settings = useRecallStore((state) => state.settings);
  const level = getLevel(settings.xp);
  const title = getLevelTitle(level);
  const progress = levelProgress(settings.xp);
  const unlocked = settings?.achievements?.filter((a) => a.unlockedAt)?.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
          {t("level.label", { level })}
        </span>
        <span className="text-[10px] text-on-surface-variant tabular-nums">{settings.xp} XP</span>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <Shield className="h-3.5 w-3.5 text-on-surface" />
        <span className="text-sm font-semibold text-on-surface">{title}</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("level.progress", { level, xp: settings.xp })}>
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="flex items-center gap-1 mt-1.5">
        <Star className="h-2.5 w-2.5 text-on-surface-variant" />
        <span className="text-[10px] text-on-surface-variant tabular-nums">{unlocked}/14</span>
      </div>
    </div>
  );
}
