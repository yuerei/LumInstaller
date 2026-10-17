import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * Small metadata pill. `tone="brand"` highlights with the accent; default is a
 * muted chip.
 */
export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "brand";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        tone === "brand"
          ? "bg-brand/15 text-brand"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
