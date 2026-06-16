import { useEffect, useRef, useState } from "react";
import { Coffee, CloudRain, Headphones, Pause, Play, RotateCcw, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSoundscape, stopSoundscape } from "@/services/audio";
import { getLevel, triggerLevelUpConfetti } from "@/lib/xp";
import { useRecallStore } from "@/stores/recall-store";
import type { Soundscape } from "@/services/audio";

const SOUNDSCAPES: { id: Soundscape; label: string; icon: typeof Headphones }[] = [
  { id: "rain", label: "Rain", icon: CloudRain },
  { id: "cafe", label: "Cafe", icon: Coffee },
  { id: "lofi", label: "Lofi", icon: Headphones },
];

const PRESETS = [15, 25, 45];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer(): JSX.Element {
  const settings = useRecallStore((state) => state.settings);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sc, setSc] = useState<Soundscape>("none");
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xpAwardedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopSoundscape();
    };
  }, []);

  function tick(): void {
    setRemaining((prev) => {
      if (prev <= 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setRunning(false);
        setCompleted(true);
        stopSoundscape();

        if (!xpAwardedRef.current) {
          xpAwardedRef.current = true;
          const xp = duration <= 15 * 60 ? 15 : duration <= 25 * 60 ? 25 : 45;
          const oldLevel = getLevel(settingsRef.current.xp);
          void updateSettings({ xp: settingsRef.current.xp + xp });
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
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">Focus Timer</span>

      {/* Timer ring */}
      <div className="flex justify-center mt-4">
        <div className="relative">
          <svg width="160" height="160" className="-rotate-90">
            <circle cx="80" cy="80" r="72" fill="none" stroke="currentColor" strokeWidth="5" className="text-zinc-100 dark:text-zinc-800" />
            <circle
              cx="80" cy="80" r="72"
              fill="none" stroke="currentColor" strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              className="text-zinc-700 transition-[stroke-dashoffset] duration-1000 ease-linear dark:text-zinc-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-zinc-800 dark:text-zinc-200">
              {formatTime(remaining)}
            </span>
            <span className="mt-0.5 text-[11px] text-zinc-400">
              {running ? "focusing" : completed ? "done!" : "ready"}
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
            {m}m
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mt-3">
        {running ? (
          <Button size="sm" variant="outline" onClick={pause} className="gap-1.5">
            <Pause className="h-3.5 w-3.5" /> Pause
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={remaining === 0 && completed} className="gap-1.5">
            <Play className="h-3.5 w-3.5" /> {remaining === duration ? "Start" : "Resume"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={reset} disabled={running || (remaining === duration && !completed)}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Soundscapes */}
      <div className="mt-4 flex justify-center gap-1">
        <button
          onClick={() => toggleSoundscape("none")}
          className={`px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
            sc === "none" ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <VolumeX className="h-3 w-3 inline mr-0.5" />
          Off
        </button>
        {SOUNDSCAPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => toggleSoundscape(id)}
            className={`px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
              sc === id ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Icon className="h-3 w-3 inline mr-0.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}