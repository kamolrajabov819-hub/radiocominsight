import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "./data-table";
import { EmptyState } from "./panel";
import { useI18n } from "@/lib/i18n";

export type LegendItem = { label: string; color: string };

/** The WCAG-clean twin every chart ships with. */
export type TableTwin = {
  columns: { key: string; header: string; numeric?: boolean }[];
  rows: Record<string, string | number>[];
};

/**
 * Frames a chart with its title, legend and a chart/table switch.
 *
 * The table view is not optional decoration: three light-mode series colours
 * sit under 3:1 against the surface, so the palette is only compliant when a
 * text equivalent is one click away.
 */
export function ChartFrame({
  title,
  hint,
  legend,
  table,
  children,
  note,
  empty,
  className,
  actions,
}: {
  title: string;
  hint?: string;
  legend?: LegendItem[];
  table?: TableTwin;
  children: ReactNode;
  note?: ReactNode;
  /** When set, replaces the chart body with a hatched placeholder. */
  empty?: string;
  className?: string;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"chart" | "table">("chart");
  const showTable = Boolean(table) && view === "table";

  return (
    <section className={cn("flex flex-col border border-border bg-surface", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-bold leading-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {table && (
            <div
              className="flex border border-border"
              role="group"
              aria-label={t("common.viewToggle")}
            >
              <ViewButton
                active={view === "chart"}
                onClick={() => setView("chart")}
                label={t("common.chartView")}
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </ViewButton>
              <ViewButton
                active={view === "table"}
                onClick={() => setView("table")}
                label={t("common.tableView")}
              >
                <Table2 className="h-3.5 w-3.5" />
              </ViewButton>
            </div>
          )}
        </div>
      </header>

      {legend && legend.length > 1 && !showTable && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border px-4 py-2">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 shrink-0" style={{ background: l.color }} aria-hidden />
              {l.label}
            </li>
          ))}
        </ul>
      )}

      <div className={cn("flex-1", showTable ? "" : "p-4")}>
        {empty ? (
          <div className={showTable ? "p-4" : ""}>
            <EmptyState>{empty}</EmptyState>
          </div>
        ) : showTable && table ? (
          <DataTable
            dense
            maxHeight="24rem"
            columns={table.columns.map<Column<Record<string, string | number>>>((c) => ({
              key: c.key,
              header: c.header,
              numeric: c.numeric,
              cell: (r) => r[c.key] ?? "—",
              sortValue: (r) => r[c.key] ?? "",
            }))}
            rows={table.rows}
          />
        ) : (
          children
        )}
      </div>

      {note && !showTable && (
        <p className="border-t border-border px-4 py-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}
    </section>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid h-7 w-8 place-items-center transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
