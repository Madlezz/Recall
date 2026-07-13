import { useRecallStore } from "@/stores/recall-store";
import { cn } from "@/lib/utils";
import type { Theme } from "@/types";

/**
 * Recall mascot - the friendly "brain" mark used for motivation surfaces
 * (daily goal, achievements, streak). Uses the transparent lettermark so it
 * can sit on any surface. Renders grayscale at rest, full color on hover
 * via the `interactive` prop.
 */
export function Mascot({
  className,
  interactive = false,
}: {
  className?: string;
  interactive?: boolean;
}): JSX.Element {
  const theme = useRecallStore((s) => s.settings.theme) as Theme;
  // In high-contrast we keep it flat (no grayscale trickery that hides it)
  const isHC = theme === "high-contrast";
  return (
    <img
      src={`${import.meta.env.BASE_URL}Lettermark_transparent.png`}
      alt="Recall mascot"
      aria-hidden="true"
      className={cn(
        "object-contain",
        interactive && !isHC && "grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all",
        className ?? "h-6 w-6",
      )}
      draggable={false}
    />
  );
}
