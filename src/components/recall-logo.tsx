import { useMemo } from "react";
import { useRecallStore } from "@/stores/recall-store";
import type { Theme } from "@/types";

/**
 * Recall brand logo (lettermark) from the new design system.
 * Uses the light/dark PNG assets exported from stitch. For tinted
 * contexts (on colored surfaces) use `variant="transparent"`.
 */
export function RecallLogo({
  className,
  variant,
}: {
  className?: string;
  variant?: "light" | "dark" | "auto" | "transparent";
}): JSX.Element {
  const theme = useRecallStore((s) => s.settings.theme) as Theme;
  const resolved = useMemo(() => {
    if (variant === "light") return "Lettermark_lightmode.png";
    if (variant === "dark") return "Lettermark_darkmode.png";
    if (variant === "transparent") return "Lettermark_transparent.png";
    // auto: pick based on current theme
    return theme === "dark" || theme === "high-contrast"
      ? "Lettermark_darkmode.png"
      : "Lettermark_lightmode.png";
  }, [variant, theme]);

  return (
    <img
      src={`/${resolved}`}
      alt="Recall"
      className={className ?? "h-8 w-8 object-contain"}
      draggable={false}
    />
  );
}
