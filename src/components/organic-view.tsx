import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatTile } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { SectionRule, Note } from "@/components/panel";
import { DataTable, type Column } from "@/components/data-table";
import { AiPanel } from "@/components/ai-panel";
import {
  ChartTooltip,
  Grid,
  PartToWhole,
  SERIES,
  SmallMultiples,
  lineCursor,
  surfaceStroke,
  xAxisProps,
  yAxisProps,
} from "@/components/charts";
import { useData } from "@/lib/data-context";
import {
  delta,
  filterByQuarter,
  fmtCompact,
  fmtInt,
  organicMetricKeys,
  sumOrganic,
} from "@/lib/metrics";
import { isSnapshotMetric } from "@/lib/parsers";
import { cn } from "@/lib/utils";

/**
 * Metric names are taken verbatim from the sheet — fuzzy matching is what
 * made these pages look empty before, because "Follows" never matched
 * "Page followers" and "Likes" never matched "Like count".
 */
export type OrganicSpec = {
  title: string;
  subtitle: string;
  filenameSlug: string;
  network: "facebook" | "instagram";
  /** Headline tiles, in display order. */
  headline: { key: string; label: string; compact?: boolean }[];
  /** Series for the "headline metrics by quarter" chart. */
  trend: string[];
  /** Part-to-whole breakdown of interactions. */
  interactionMix: string[];
};

export function OrganicView({ spec }: { spec: OrganicSpec }) {
  const { data, quarters, quarter, previousQuarter } = useData();
  const all = data[spec.network];
  const scoped = filterByQuarter(all, quarter?.key ?? null);
  const totals = sumOrganic(scoped.length ? scoped : []);
  const prevTotals = previousQuarter ? sumOrganic(filterByQuarter(all, previousQuarter.key)) : null;
  const allKeys = useMemo(() => organicMetricKeys(all), [all]);
  const deltaSuffix = previousQuarter ? `vs ${previousQuarter.short}` : undefined;

  const [explored, setExplored] = useState<string>(spec.trend[0] ?? allKeys[0] ?? "");

  const byQuarter = useMemo(
    () =>
      all.map((p) => {
        const row: Record<string, string | number> = { label: p.short };
        allKeys.forEach((k) => {
          row[k] = p.metrics[k] ?? 0;
        });
        return row;
      }),
    [all, allKeys],
  );

  const mixSlices = spec.interactionMix
    .map((k, i) => ({ name: k, value: totals[k] ?? 0, color: SERIES[i % SERIES.length] }))
    .filter((d) => d.value > 0);

  const trendSeries = spec.trend.filter((k) => allKeys.includes(k));
  const zeroKeys = allKeys.filter((k) => all.every((p) => (p.metrics[k] ?? 0) === 0));

  const pivotColumns: Column<{ metric: string }>[] = [
    {
      key: "metric",
      header: "Metric",
      cell: (r) => (
        <span className={cn(zeroKeys.includes(r.metric) && "text-muted-foreground")}>
          {r.metric}
          {isSnapshotMetric(r.metric) && (
            <span className="ml-1.5 text-[0.625rem] uppercase tracking-wide text-muted-foreground">
              snapshot
            </span>
          )}
        </span>
      ),
      sortValue: (r) => r.metric,
    },
    ...(scoped.length ? scoped : all).map<Column<{ metric: string }>>((p) => ({
      key: p.quarter,
      header: p.short,
      numeric: true,
      cell: (r) => fmtInt(p.metrics[r.metric] ?? 0),
      sortValue: (r) => p.metrics[r.metric] ?? 0,
    })),
  ];

  const sheets = [
    {
      name: spec.title.slice(0, 30),
      rows: [
        ["Metric", ...all.map((p) => p.label)],
        ...allKeys.map((k) => [k, ...all.map((p) => p.metrics[k] ?? 0)] as (string | number)[]),
      ],
    },
  ];

  return (
    <AppShell
      title={spec.title}
      subtitle={spec.subtitle}
      actions={<ExportButton filename={`radiocom-${spec.filenameSlug}`} sheets={sheets} />}
    >
      <SectionRule
        label="Headline metrics"
        note={quarter ? quarter.label : "All quarters combined"}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {spec.headline.map((h, i) => {
          const value = totals[h.key] ?? 0;
          const snapshot = isSnapshotMetric(h.key);
          return (
            <StatTile
              key={h.key}
              accent={i === 0}
              label={h.label}
              value={h.compact ? fmtCompact(value) : fmtInt(value)}
              sub={snapshot ? "Latest reading" : h.compact ? fmtInt(value) : undefined}
              delta={prevTotals ? delta(value, prevTotals[h.key]) : null}
              deltaSuffix={deltaSuffix}
              trend={all.map((p) => p.metrics[h.key] ?? 0)}
              trendColor={SERIES[i % SERIES.length]}
            />
          );
        })}
      </div>

      <Note>
        Follower and library counts are point-in-time readings, so the all-time view carries the
        latest quarter forward rather than adding the quarters together. Everything else is summed.
      </Note>

      <SectionRule label="Quarterly movement" note="All quarters, regardless of the filter above" />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title="Headline metrics by quarter"
          hint="One panel per metric, each on its own scale"
          note="Media views run three orders of magnitude above engagements, so a shared axis would flatten every series but the largest. Each panel keeps its own scale; the totals sit beside the labels."
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              ...trendSeries.map((k) => ({ key: k, header: k, numeric: true })),
            ],
            rows: all.map((p) => {
              const row: Record<string, string | number> = { label: p.label };
              trendSeries.forEach((k) => {
                row[k] = fmtInt(p.metrics[k] ?? 0);
              });
              return row;
            }),
          }}
          empty={trendSeries.length ? undefined : "None of the headline metrics exist in this tab."}
        >
          <SmallMultiples
            periods={all.map((p) => p.short)}
            format={(v) => fmtCompact(v)}
            series={trendSeries.map((k, i) => ({
              name: k,
              color: SERIES[i % SERIES.length],
              values: all.map((p) => p.metrics[k] ?? 0),
            }))}
          />
        </ChartFrame>

        <ChartFrame
          title="Interaction mix"
          hint={quarter ? quarter.label : "All time"}
          legend={mixSlices.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "metric", header: "Interaction" },
              { key: "count", header: "Count", numeric: true },
            ],
            rows: mixSlices.map((s) => ({ metric: s.name, count: fmtInt(s.value) })),
          }}
          empty={mixSlices.length ? undefined : "No interactions recorded for this period."}
        >
          <PartToWhole
            data={mixSlices}
            format={(v) => fmtInt(v)}
            centerValue={fmtCompact(mixSlices.reduce((a, d) => a + d.value, 0))}
            centerLabel="Interactions"
          />
        </ChartFrame>
      </div>

      <div className="mt-3">
        <ChartFrame
          title="Metric explorer"
          hint="Pick any metric in the tab and see it quarter by quarter"
          actions={
            <select
              value={explored}
              onChange={(e) => setExplored(e.target.value)}
              aria-label="Metric to explore"
              className="max-w-[16rem] border border-border bg-surface px-2 py-1 text-xs"
            >
              {allKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                  {zeroKeys.includes(k) ? " (all zero)" : ""}
                </option>
              ))}
            </select>
          }
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "value", header: explored || "Value", numeric: true },
            ],
            rows: all.map((p) => ({ label: p.label, value: fmtInt(p.metrics[explored] ?? 0) })),
          }}
          empty={
            !explored
              ? "This tab reported no metrics."
              : zeroKeys.includes(explored)
                ? `"${explored}" is present in the sheet but reports zero for every quarter.`
                : undefined
          }
        >
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart
                data={all.map((p) => ({ label: p.short, value: p.metrics[explored] ?? 0 }))}
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              >
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => fmtCompact(v)} />
                <ChartTooltip format={(v) => fmtInt(v)} cursor={lineCursor} />
                <Line
                  type="linear"
                  dataKey="value"
                  name={explored}
                  stroke={SERIES[0]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      <SectionRule
        label="Every metric"
        note={`${allKeys.length} metric(s)${zeroKeys.length ? ` · ${zeroKeys.length} report zero throughout` : ""}`}
      />
      <div className="border border-border bg-surface">
        <DataTable
          columns={pivotColumns}
          rows={allKeys.map((metric) => ({ metric }))}
          maxHeight="34rem"
          initialSort={{ key: "metric", dir: "asc" }}
        />
      </div>

      <SectionRule label="Advisory" />
      <AiPanel
        context={`${spec.title.toLowerCase()}`}
        payload={{
          channel: spec.network,
          period: quarter?.label ?? "all time",
          comparedWith: previousQuarter?.label ?? null,
          totals,
          previousTotals: prevTotals,
          byQuarter: all.map((p) => ({ quarter: p.label, ...p.metrics })),
          metricsReportingZeroThroughout: zeroKeys,
        }}
      />
    </AppShell>
  );
}
