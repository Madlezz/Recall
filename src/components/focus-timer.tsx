import { useEffect, useRef, useState } from "react";
import { Coffee, CloudRain, Headphones, Pause, Play, RotateCcw, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSoundscape, stopSoundscape } from "@/services/audio";
import { getLevel, triggerLevelUpConfetti } from "@/lib/xp";
import { getFocusTimerXp } from "@/lib/xp-rules";
import { useRecallStore } from "@/stores/recall-store";
import { useTranslation } from "react-i18next";
import type { Soundscape } from "@/services/audio";

const SOUNDSCAPES: { id: Soundscape; labelKey: string; icon: typeof Headphones }[] = [
  { id: "rain", labelKey: "focusTimer.rain", icon: CloudRain },
  { id: "cafe", labelKey: "focusTimer.cafe", icon: Coffee },
  { id: "lofi", labelKey: "focusTimer.lofi", icon: Headphones },
];

const PRESETS = [15, 25, 45];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer(): JSX.Element {
  const { t } = useTranslation();
  const settings = useRecallStore((state) => state.settings);
  const addXp = useRecallStore((state) => state.addXp);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sc, setSc] = useState<Soundscape>("none");
  const [completed, setCompleted] = useState(false);
  const [showCompletionFlash, setShowCompletionFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xpAwardedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopSoundscape();
    };
  }, []);

  // Auto-dismiss completion flash after 2 seconds
  useEffect(() => {
    if (showCompletionFlash) {
      const timer = setTimeout(() => setShowCompletionFlash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showCompletionFlash]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // Don't capture shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (running) pause();
        else if (remaining === 0 && completed) reset();
        else start();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remaining, completed]);

  function tick(): void {
    setRemaining((prev) => {
      if (prev <= 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setRunning(false);
        setCompleted(true);
        setShowCompletionFlash(true);
        stopSoundscape();

        if (!xpAwardedRef.current) {
          xpAwardedRef.current = true;
          const xp = getFocusTimerXp(duration);
          const oldLevel = getLevel(settingsRef.current.xp);
          void addXp(xp);
          if (getLevel(settingsRef.current.xp + xp) > oldLevel) {
            setTimeout(() => triggerLevelUpConfetti(), 300);
          }
        }
        return 0;
      }
      return prev - 1;
    });
  }

  function start(): void {
    if (running) return;
    setRunning(true);
    setCompleted(false);
    xpAwardedRef.current = false;
    if (sc !== "none") startSoundscape(sc);
    intervalRef.current = setInterval(tick, 1000);
  }

  function pause(): void {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopSoundscape();
  }

  function reset(): void {
    pause();
    setRemaining(duration);
    setCompleted(false);
    setShowCompletionFlash(false);
  }

  function pickPreset(mins: number): void {
    if (running) return;
    const secs = mins * 60;
    setDuration(secs);
    setRemaining(secs);
    setCompleted(false);
  }

  function toggleSoundscape(s: Soundscape): void {
    if (s === sc) {
      stopSoundscape();
      setSc("none");
    } else {
      setSc(s);
      if (running) startSoundscape(s);
    }
  }

  const progress = duration > 0 ? 1 - remaining / duration : 1;
  const circumference = 2 * Math.PI * 72;

  return (
    <div className={`rounded-lg border bg-white px-5 py-5 dark:bg-zinc-900 transition-all duration-500 ${
      showCompletionFlash
        ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] dark:border-emerald-500 dark:shadow-[0_0_20px_rgba(52,211,153,0.3)]"
        : "border-zinc-200 dark:border-zinc-800"
    }`}>
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">{t("focusTimer.title")}</span>

      {/* Screen reader announcement for timer completion */}
      {showCompletionFlash && (
        <div className="sr-only" role="alert" aria-live="assertive">
          {t("focusTimer.completeAria")}
        </div>
      )}

      {/* Timer ring */}
      <div className="flex justify-center mt-4">
        <div className="relative">
          <svg width="160" height="160" className="-rotate-90" role="img" aria-label={t("focusTimer.timerAria", { remaining: formatTime(remaining), progress: Math.round(progress * 100) })}>
            <circle cx="80" cy="80" r="72" fill="none" stroke="currentColor" strokeWidth="5" className="text-zinc-100 dark:text-zinc-800" />
            <circle
              cx="80" cy="80" r="72"
              fill="none" stroke="currentColor" strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${
                showCompletionFlash ? "text-emerald-500" : "text-zinc-700 dark:text-zinc-300"
              }`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold tabular-nums tracking-tight transition-colors duration-500 ${
              showCompletionFlash ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-200"
            }`}>
              {formatTime(remaining)}
            </span>
            <span className={`mt-0.5 text-[11px] font-semibold transition-colors duration-500 ${
              showCompletionFlash ? "text-emerald-500" : "text-zinc-400"
            }`}>
              {running ? t("focusTimer.focusing") : completed ? t("focusTimer.done") : t("focusTimer.ready")}
            </span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="flex justify-center gap-1.5 mt-5">
        {PRESETS.map((m) => (
          <button
            key={m}
            disabled={running}
            onClick={() => pickPreset(m)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              duration === m * 60
                ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            }`}
          >
            {t("focusTimer.presetMinutes", { count: m })}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mt-3">
        {running ? (
          <Button size="sm" variant="outline" onClick={pause} className="gap-1.5" aria-label={t("focusTimer.pauseAria")}>
            <Pause className="h-3.5 w-3.5" /> {t("focusTimer.pause")}
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={remaining === 0 && completed} className="gap-1.5" aria-label={t(remaining === duration ? "focusTimer.startAria" : "focusTimer.resumeAria")}>
            <Play className="h-3.5 w-3.5" /> {t(remaining === duration ? "focusTimer.start" : "focusTimer.resume")}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={reset} disabled={running || (remaining === duration && !completed)} aria-label={t("focusTimer.resetAria")}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="mt-2 text-center text-[10px] text-zinc-400">
        {t("focusTimer.pressPrefix")} <kbd className="rounded border bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[10px] font-mono">F</kbd> {t(running ? "focusTimer.toPause" : "focusTimer.toStart")}
      </p>

      {/* Soundscapes */}
      <div className="mt-4 flex justify-center gap-1">
        <button
          onClick={() => toggleSoundscape("none")}
          className={`px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
            sc === "none" ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <VolumeX className="h-3 w-3 inline mr-0.5" />
          {t("focusTimer.off")}
        </button>
        {SOUNDSCAPES.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => toggleSoundscape(id)}
            className={`px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
              sc === id ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Icon className="h-3 w-3 inline mr-0.5" />
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
