import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./charts";
import type { Delta } from "@/lib/metrics";

/**
 * The delta chip. `lowerIsBetter` flips the colour for cost metrics — a CPL
 * that fell is good news even though the arrow points down.
 */
export function DeltaChip({
  delta,
  lowerIsBetter = false,
  suffix,
  className,
}: {
  delta: Delta;
  lowerIsBetter?: boolean;
  suffix?: string;
  className?: string;
}) {
  if (!delta) return null;
  const { pct, direction } = delta;
  const good = direction === "flat" ? null : (direction === "up") !== lowerIsBetter;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[0.6875rem] font-medium",
        good === null && "text-muted-foreground",
        good === true && "text-positive",
        good === false && "text-negative",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="tnum">{direction === "flat" ? "0%" : `${Math.abs(pct).toFixed(1)}%`}</span>
      {suffix && <span className="ml-0.5 font-normal text-muted-foreground">{suffix}</span>}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  delta,
  deltaSuffix,
  lowerIsBetter,
  trend,
  trendColor,
  accent = false,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  delta?: Delta;
  deltaSuffix?: string;
  lowerIsBetter?: boolean;
  /** Per-quarter series, oldest first. */
  trend?: number[];
  trendColor?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between border border-border bg-surface p-4",
        accent && "border-l-2 border-l-primary",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              accent ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden
          />
        )}
      </div>

      <div className="mt-3 figure text-[1.75rem] leading-none">{value}</div>

      <div className="mt-2 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-0.5">
        <DeltaChip delta={delta ?? null} lowerIsBetter={lowerIsBetter} suffix={deltaSuffix} />
        {sub && <span className="text-[0.6875rem] text-muted-foreground">{sub}</span>}
      </div>

      {trend && trend.length > 1 && (
        <div className="mt-3">
          <Sparkline points={trend} color={trendColor} />
        </div>
      )}
    </div>
  );
}

/** Compact label/value pair for dense side panels. */
export function StatRow({
  label,
  value,
  swatch,
  delta,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  swatch?: string;
  delta?: Delta;
  lowerIsBetter?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="flex min-w-0 items-center gap-2">
        {swatch && (
          <span className="h-2.5 w-2.5 shrink-0" style={{ background: swatch }} aria-hidden />
        )}
        <span className="truncate text-muted-foreground">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {delta && <DeltaChip delta={delta} lowerIsBetter={lowerIsBetter} />}
        <span className="tnum">{value}</span>
      </span>
    </li>
  );
}
