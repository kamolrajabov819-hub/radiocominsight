import type { ReactNode } from "react";
import { useData } from "@/lib/data-context";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * The single filter row for the whole product — every page re-renders
 * against the same slice. Never duplicate this inside a chart card.
 */
export function GlobalFilter() {
  const { quarters, quarter, setQuarter } = useData();
  const { t } = useI18n();
  if (!quarters.length) return null;

  return (
    <div
      className="flex items-center overflow-x-auto border border-border"
      role="group"
      aria-label={t("common.period")}
    >
      <Option active={!quarter} onClick={() => setQuarter(null)}>
        {t("common.allTime")}
      </Option>
      {quarters.map((q) => (
        <Option
          key={q.key}
          active={quarter?.key === q.key}
          onClick={() => setQuarter(q)}
          title={`${q.start} → ${q.stop}`}
        >
          {q.short}
        </Option>
      ))}
    </div>
  );
}

function Option({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "shrink-0 border-r border-border px-2.5 py-1.5 text-xs font-medium transition-colors last:border-r-0",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
