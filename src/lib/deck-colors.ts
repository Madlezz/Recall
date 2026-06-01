import type { DeckColor } from "@/types";

export const deckColorOptions: Array<{ value: DeckColor; label: string; className: string }> = [
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "green", label: "Green", className: "bg-emerald-500" },
  { value: "amber", label: "Amber", className: "bg-amber-500" },
  { value: "rose", label: "Rose", className: "bg-rose-500" },
  { value: "violet", label: "Violet", className: "bg-violet-500" },
  { value: "slate", label: "Slate", className: "bg-slate-500" },
];

export function getDeckColorClass(color: DeckColor): string {
  return deckColorOptions.find((option) => option.value === color)?.className ?? "bg-slate-500";
}
