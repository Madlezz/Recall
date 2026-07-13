import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "muted" | "success" | "warning";
}

export function Badge({ tone = "default", className, ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "default" && "bg-primary/12 text-primary",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-review-easy/15 text-review-easy",
        tone === "warning" && "bg-review-hard/15 text-review-hard",
        className,
      )}
      {...props}
    />
  );
}
