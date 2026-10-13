import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * Plexo-style metric block: a small uppercase label above a prominent value.
 */
export function Stat({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn("text-sm font-semibold tabular-nums", valueClassName)}
      >
        {value}
      </span>
    </div>
  );
}
