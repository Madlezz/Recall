import type { LucideIcon } from "lucide-react";
import { cardSurface, typeClass } from "@/lib/surface";
import { cn } from "@/lib/utils";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

export function StatTile({ icon: Icon, label, value, className }: StatTileProps): JSX.Element {
  return (
    <div className={cn(cardSurface("p-4"), className)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-on-surface-variant" />
        <span className={cn(typeClass.caption, "text-on-surface-variant")}>{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
