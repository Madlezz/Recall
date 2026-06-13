import { useEffect, useRef, useState } from "react";
import { Coffee, CloudRain, Headphones, Pause, Play, RotateCcw, Timer, VolumeX, Zap } from "lucide-react";
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
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sc, setSc] = useState<Soundscape>("none");
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xpAwardedRef = useRef(false);

  // Cleanup on unmount
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

        // Award XP for completing a focus session
        if (!xpAwardedRef.current) {
          xpAwardedRef.current = true;
          const xp = duration <= 15 * 60 ? 15 : duration <= 25 * 60 ? 25 : 45;
          const oldLevel = getLevel(settings.xp);
          const newXp = settings.xp + xp;
          void updateSettings({ xp: newXp });
          if (getLevel(newXp) > oldLevel) {
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
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Focus Timer
        </h3>
        {completed && (
          <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Session complete!
          </span>
        )}
      </div>

      {/* Circular timer */}
      <div className="flex justify-center py-2">
        <div className="relative">
          <svg width="180" height="180" className="-rotate-90">
            <circle
              cx="90" cy="90" r="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/20"
            />
            <circle
              cx="90" cy="90" r="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums">{formatTime(remaining)}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {running ? "Focusing..." : completed ? "Well done!" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="flex justify-center gap-2 mt-4">
        {PRESETS.map((m) => (
          <Button
            key={m}
            variant={duration === m * 60 ? "default" : "outline"}
            size="sm"
            disabled={running}
            onClick={() => pickPreset(m)}
          >
            {m}m
          </Button>
        ))}
      </div>

      {/* Play/Pause/Reset */}
      <div className="flex justify-center gap-2 mt-3">
        {running ? (
          <Button size="sm" variant="outline" onClick={pause}>
            <Pause className="h-4 w-4 mr-1" /> Pause
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={remaining === 0 && completed}>
            <Play className="h-4 w-4 mr-1" /> {remaining === duration ? "Start" : "Resume"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={reset} disabled={running || (remaining === duration && !completed)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Soundscapes */}
      <div className="mt-4 border-t pt-3">
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant={sc === "none" ? "default" : "ghost"}
            onClick={() => toggleSoundscape("none")}
            className="h-8 w-8 p-0"
          >
            <VolumeX className="h-4 w-4" />
          </Button>
          {SOUNDSCAPES.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={sc === id ? "default" : "ghost"}
              onClick={() => toggleSoundscape(id)}
              className="h-8"
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}