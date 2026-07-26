import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  /** Rendered cell. Defaults to the sort value. */
  cell?: (row: T) => ReactNode;
  /** Numeric/string value used for sorting. Omit to make the column static. */
  sortValue?: (row: T) => number | string;
  align?: "left" | "right";
  /** Applies the mono/tabular figure treatment. */
  numeric?: boolean;
  width?: string;
};

/**
 * Sticky-header table with optional per-column sorting. Every chart in the
 * product has one of these as its table twin, so values are always reachable
 * without hovering.
 */
export function DataTable<T>({
  columns,
  rows,
  initialSort,
  maxHeight = "28rem",
  footer,
  emptyLabel = "No rows for this period.",
  dense = false,
}: {
  columns: Column<T>[];
  rows: T[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  maxHeight?: string;
  footer?: ReactNode;
  emptyLabel?: string;
  dense?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const colDef = columns.find((c) => c.key === sort.key);
    if (!colDef?.sortValue) return rows;
    const getter = colDef.sortValue;
    return [...rows].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  if (!rows.length) {
    return <div className="px-4 py-8 text-center text-xs text-muted-foreground">{emptyLabel}</div>;
  }

  const pad = dense ? "px-2.5 py-1.5" : "px-3 py-2";

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full border-collapse text-[0.8125rem]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface-sunken">
            {columns.map((c) => {
              const sortable = Boolean(c.sortValue);
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    "border-b border-rule font-medium",
                    pad,
                    c.align === "right" || c.numeric ? "text-right" : "text-left",
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) =>
                          s?.key === c.key
                            ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                            : { key: c.key, dir: "desc" },
                        )
                      }
                      className={cn(
                        "eyebrow inline-flex items-center gap-1 transition-colors hover:text-foreground",
                        active && "text-foreground",
                      )}
                    >
                      {c.header}
                      {active &&
                        (sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  ) : (
                    <span className="eyebrow">{c.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/60 last:border-0 hover:bg-surface-sunken/60"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    pad,
                    c.numeric && "tnum",
                    c.align === "right" || c.numeric ? "text-right" : "text-left",
                  )}
                >
                  {c.cell ? c.cell(row) : String(c.sortValue?.(row) ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="sticky bottom-0 bg-surface-sunken">{footer}</tfoot>}
      </table>
    </div>
  );
}
