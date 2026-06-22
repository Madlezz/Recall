import { Home, LayoutGrid, Moon, Search, Settings, Sun, Tag, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Theme } from "@/types";

interface Command {
  id: string;
  label: string;
  icon: typeof Home;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const showDashboard = useRecallStore((s) => s.showDashboard);
  const showBrowser = useRecallStore((s) => s.showBrowser);
  const showStats = useRecallStore((s) => s.showStats);
  const showSettings = useRecallStore((s) => s.showSettings);
  const showTags = useRecallStore((s) => s.showTags);
  const startReview = useRecallStore((s) => s.startReview);
  const setTheme = useRecallStore((s) => s.setTheme);
  const settings = useRecallStore((s) => s.settings);
  const activeStudy = useRecallStore((s) => s.activeStudy);

  const commands: Command[] = useMemo(() => [
    { id: "dashboard", label: "Go to Dashboard", icon: Home, action: showDashboard },
    { id: "browser", label: "Open Card Browser", icon: LayoutGrid, action: showBrowser },
    { id: "tags", label: "Manage Tags", icon: Tag, action: showTags },
    { id: "stats", label: "Go to Stats", icon: TrendingUp, action: showStats },
    { id: "settings", label: "Go to Settings", icon: Settings, action: showSettings },
    {
      id: "review",
      label: "Start Review",
      icon: Zap,
      shortcut: "R",
      action: () => startReview(),
    },
    {
      id: "theme",
      label: settings.theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
      icon: settings.theme === "dark" ? Sun : Moon,
      action: () => void setTheme(settings.theme === "dark" ? "light" as Theme : "dark" as Theme),
    },
    {
      id: "search",
      label: "Search Cards…",
      icon: Search,
      shortcut: "Ctrl+K",
      action: () => { showBrowser(); },
    },
  ], [showDashboard, showBrowser, showTags, showStats, showSettings, startReview, setTheme, settings.theme]);

  // Filter commands based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q));
  }, [commands, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global Ctrl/Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (activeStudy && !activeStudy.completed) return; // Don't open during study
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStudy]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function executeCommand(cmd: Command): void {
    setOpen(false);
    cmd.action();
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      executeCommand(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            aria-label="Command search"
          />
          <kbd className="hidden rounded border bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 sm:inline-block">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-2" role="listbox" aria-label="Commands">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              No commands found
            </div>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                role="option"
                aria-selected={i === selectedIndex}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors",
                  i === selectedIndex
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="rounded border bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <kbd className="rounded border bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-800">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <kbd className="rounded border bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-800">↵</kbd> select
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <kbd className="rounded border bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-800">esc</kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
