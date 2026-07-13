import * as React from "react";
import { cn } from "@/lib/utils";
import {
  cardSurface,
  softSurface,
  brandSurface,
  motivationSurface,
  successSurface,
  dashedSurface,
  type SurfaceTier,
  surfaceClass,
} from "@/lib/surface";

type SurfaceVariant = "card" | "soft" | "brand" | "motivation" | "success" | "dashed";

const variantFn: Record<SurfaceVariant, (extra?: string) => string> = {
  card: cardSurface,
  soft: softSurface,
  brand: brandSurface,
  motivation: motivationSurface,
  success: successSurface,
  dashed: dashedSurface,
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Reusable M3 surface container. Defaults to the standard `card` surface
 * (bg-surface border-outline-variant rounded-2xl). Use `soft` for wells,
 * `brand`/`motivation`/`success` for tinted containers, `dashed` for create
 * placeholders.
 */
export function Surface({
  variant = "card",
  className,
  as: Tag = "div",
  ...props
}: SurfaceProps): JSX.Element {
  const Comp = Tag as React.ElementType;
  return <Comp className={cn(variantFn[variant](className))} {...props} />;
}

/** Plain surface tier wrapper (e.g. bg-surface-container-high). */
export function SurfaceTier({
  tier = "surface",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tier?: SurfaceTier }): JSX.Element {
  return <div className={cn(surfaceClass[tier], className)} {...props} />;
}
