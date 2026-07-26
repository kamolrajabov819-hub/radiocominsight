import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "good" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-colors",
        tone === "primary" && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {Icon && (
          <Icon
            className={cn("h-4 w-4", tone === "primary" ? "text-primary" : "text-muted-foreground")}
          />
        )}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "mt-1 text-xs",
            tone === "good" && "text-emerald-500",
            tone === "bad" && "text-primary",
            tone !== "good" && tone !== "bad" && "text-muted-foreground",
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
