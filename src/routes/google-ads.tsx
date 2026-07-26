import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { DollarSign, Eye, MousePointerClick, PhoneCall, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatTile } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { SectionRule } from "@/components/panel";
import { DataTable, type Column } from "@/components/data-table";
import { AiPanel } from "@/components/ai-panel";
import {
  CHANNEL_COLOR,
  ChartTooltip,
  Donut,
  Grid,
  SERIES,
  lineCursor,
  surfaceStroke,
  xAxisProps,
  yAxisProps,
} from "@/components/charts";
import { useData } from "@/lib/data-context";
import {
  cpc,
  cpl,
  cpm,
  ctr,
  delta,
  filterByQuarter,
  fmtCompact,
  fmtInt,
  fmtMoney,
  fmtPct,
  sumGoogle,
} from "@/lib/metrics";
import type { GoogleAdsRow } from "@/lib/parsers";

export const Route = createFileRoute("/google-ads")({
  head: () => ({
    meta: [
      { title: "Google Ads — Radiocom Insight" },
      {
        name: "description",
        content:
          "Google Ads performance by network: cost, impressions, clicks, conversions, phone calls, CTR, CPC, CPM and search impression share.",
      },
      { property: "og:title", content: "Google Ads — Radiocom Insight" },
      { property: "og:description", content: "Google Ads performance dashboard." },
    ],
  }),
  component: GoogleAdsPage,
});

const NETWORKS = ["Search", "Display & other"] as const;

function GoogleAdsPage() {
  const { data, quarters, quarter, previousQuarter } = useData();
  const rows = filterByQuarter(data.google, quarter?.key ?? null);
  const s = sumGoogle(rows);
  const prev = previousQuarter
    ? sumGoogle(filterByQuarter(data.google, previousQuarter.key))
    : null;
  const deltaSuffix = previousQuarter ? `vs ${previousQuarter.short}` : undefined;

  const byQuarter = useMemo(
    () =>
      quarters
        .map((q) => {
          const slice = filterByQuarter(data.google, q.key);
          const t = sumGoogle(slice);
          const search = sumGoogle(slice.filter((r) => r.network === "Search"));
          const other = sumGoogle(slice.filter((r) => r.network !== "Search"));
          return { q, t, search, other, has: slice.length > 0 };
        })
        .filter((x) => x.has)
        .map(({ q, t, search, other }) => ({
          label: q.short,
          Search: search.cost,
          "Display & other": other.cost,
          cost: t.cost,
          impressions: t.impressions,
          clicks: t.clicks,
          conversions: t.conversions,
          phoneCalls: t.phoneCalls,
          ctr: ctr(t.clicks, t.impressions),
          cpc: cpc(t.cost, t.clicks),
          cpm: cpm(t.cost, t.impressions),
          searchImpressionShare: t.searchImpressionSharePct,
        })),
    [quarters, data.google],
  );

  const networkTotals = NETWORKS.map((n) => {
    const t = sumGoogle(rows.filter((r) => r.network === n));
    return {
      network: n,
      color: CHANNEL_COLOR[n],
      ...t,
      ctr: ctr(t.clicks, t.impressions),
      cpc: cpc(t.cost, t.clicks),
      cpm: cpm(t.cost, t.impressions),
    };
  }).filter((t) => t.impressions > 0 || t.cost > 0);

  const costSlices = networkTotals
    .filter((t) => t.cost > 0)
    .map((t) => ({ name: t.network, value: t.cost, color: t.color }));

  const rowColumns: Column<GoogleAdsRow>[] = [
    { key: "period", header: "Period", cell: (r) => r.label, sortValue: (r) => r.quarter },
    {
      key: "network",
      header: "Network",
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0"
            style={{ background: CHANNEL_COLOR[r.network] }}
            aria-hidden
          />
          {r.network}
        </span>
      ),
      sortValue: (r) => r.network,
    },
    {
      key: "cost",
      header: "Cost",
      numeric: true,
      cell: (r) => fmtMoney(r.cost),
      sortValue: (r) => r.cost,
    },
    {
      key: "impr",
      header: "Impressions",
      numeric: true,
      cell: (r) => fmtInt(r.impressions),
      sortValue: (r) => r.impressions,
    },
    {
      key: "clicks",
      header: "Clicks",
      numeric: true,
      cell: (r) => fmtInt(r.clicks),
      sortValue: (r) => r.clicks,
    },
    {
      key: "ctr",
      header: "CTR",
      numeric: true,
      cell: (r) => fmtPct(ctr(r.clicks, r.impressions), 2),
      sortValue: (r) => ctr(r.clicks, r.impressions),
    },
    {
      key: "cpc",
      header: "Avg CPC",
      numeric: true,
      cell: (r) => fmtMoney(cpc(r.cost, r.clicks)),
      sortValue: (r) => cpc(r.cost, r.clicks),
    },
    {
      key: "cpm",
      header: "Avg CPM",
      numeric: true,
      cell: (r) => fmtMoney(cpm(r.cost, r.impressions)),
      sortValue: (r) => cpm(r.cost, r.impressions),
    },
    {
      key: "conv",
      header: "Conversions",
      numeric: true,
      cell: (r) => fmtInt(r.conversions),
      sortValue: (r) => r.conversions,
    },
    {
      key: "calls",
      header: "Phone calls",
      numeric: true,
      cell: (r) => fmtInt(r.phoneCalls),
      sortValue: (r) => r.phoneCalls,
    },
    {
      key: "inter",
      header: "Interactions",
      numeric: true,
      cell: (r) => fmtInt(r.interactions),
      sortValue: (r) => r.interactions,
    },
    {
      key: "sis",
      header: "Impr. share",
      numeric: true,
      cell: (r) => (r.searchImpressionSharePct > 0 ? fmtPct(r.searchImpressionSharePct, 1) : "—"),
      sortValue: (r) => r.searchImpressionSharePct,
    },
    {
      key: "video",
      header: "Video views",
      numeric: true,
      cell: (r) => fmtInt(r.videoViews),
      sortValue: (r) => r.videoViews,
    },
  ];

  const sheets = [
    {
      name: "Google Ads rows",
      rows: [
        [
          "Period",
          "Network",
          "Cost",
          "Impressions",
          "Clicks",
          "CTR %",
          "Avg CPC",
          "Avg CPM",
          "Conversions",
          "Phone calls",
          "Interactions",
          "Search impression share %",
          "Video views",
          "Engagements",
        ],
        ...rows.map(
          (r) =>
            [
              r.label,
              r.network,
              r.cost,
              r.impressions,
              r.clicks,
              ctr(r.clicks, r.impressions),
              cpc(r.cost, r.clicks),
              cpm(r.cost, r.impressions),
              r.conversions,
              r.phoneCalls,
              r.interactions,
              r.searchImpressionSharePct,
              r.videoViews,
              r.engagements,
            ] as (string | number)[],
        ),
      ],
    },
    {
      name: "By quarter",
      rows: [
        [
          "Quarter",
          "Cost",
          "Impressions",
          "Clicks",
          "CTR %",
          "Avg CPC",
          "Conversions",
          "Phone calls",
          "Search impression share %",
        ],
        ...byQuarter.map(
          (q) =>
            [
              q.label,
              q.cost,
              q.impressions,
              q.clicks,
              q.ctr,
              q.cpc,
              q.conversions,
              q.phoneCalls,
              q.searchImpressionShare,
            ] as (string | number)[],
        ),
      ],
    },
  ];

  const noConversions = s.conversions === 0 && s.phoneCalls === 0;

  return (
    <AppShell
      title="Google Ads"
      subtitle="Search, display and video"
      actions={<ExportButton filename="radiocom-google-ads" sheets={sheets} />}
    >
      <SectionRule
        label="Account totals"
        note={quarter ? quarter.label : "All quarters combined"}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4">
        <StatTile
          accent
          label="Cost"
          value={fmtMoney(s.cost)}
          icon={DollarSign}
          delta={prev ? delta(s.cost, prev.cost) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.cost)}
          trendColor={SERIES[1]}
        />
        <StatTile
          label="Impressions"
          value={fmtCompact(s.impressions)}
          sub={fmtInt(s.impressions)}
          icon={Eye}
          delta={prev ? delta(s.impressions, prev.impressions) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.impressions)}
          trendColor={SERIES[3]}
        />
        <StatTile
          label="Clicks"
          value={fmtInt(s.clicks)}
          icon={MousePointerClick}
          delta={prev ? delta(s.clicks, prev.clicks) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.clicks)}
          trendColor={SERIES[2]}
        />
        <StatTile
          label="CTR"
          value={fmtPct(ctr(s.clicks, s.impressions), 2)}
          sub="Clicks ÷ impressions"
          delta={
            prev ? delta(ctr(s.clicks, s.impressions), ctr(prev.clicks, prev.impressions)) : null
          }
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.ctr)}
          trendColor={SERIES[4]}
        />
        <StatTile
          label="Avg CPC"
          value={s.clicks ? fmtMoney(cpc(s.cost, s.clicks)) : "—"}
          lowerIsBetter
          delta={prev ? delta(cpc(s.cost, s.clicks), cpc(prev.cost, prev.clicks)) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label="Avg CPM"
          value={fmtMoney(cpm(s.cost, s.impressions))}
          sub="Per 1,000 impressions"
          lowerIsBetter
          delta={prev ? delta(cpm(s.cost, s.impressions), cpm(prev.cost, prev.impressions)) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label="Conversions"
          value={fmtInt(s.conversions)}
          sub={
            s.conversions
              ? `CPL ${fmtMoney(cpl(s.cost, s.conversions))}`
              : "Not tracked in the sheet"
          }
          icon={Target}
          delta={prev ? delta(s.conversions, prev.conversions) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label="Search impression share"
          value={s.searchImpressionSharePct ? fmtPct(s.searchImpressionSharePct, 1) : "—"}
          sub="Search network, impression-weighted"
          icon={PhoneCall}
          delta={prev ? delta(s.searchImpressionSharePct, prev.searchImpressionSharePct) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.searchImpressionShare)}
          trendColor={SERIES[5]}
        />
      </div>

      {noConversions && (
        <p className="mt-3 border-l-2 border-caution bg-surface px-3 py-2 text-xs text-muted-foreground">
          The Google Ads tab reports <strong className="text-foreground">0</strong> for both
          conversions and phone calls across every quarter. That is what the sheet contains, not a
          rendering fault — conversion tracking is most likely not exported into this workbook.
        </p>
      )}

      <SectionRule label="Network split" note="Search vs everything else" />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title="Cost by network and quarter"
          hint="Stacked, US dollars"
          legend={NETWORKS.map((n) => ({ label: n, color: CHANNEL_COLOR[n] }))}
          note="The workbook does not name its campaign rows. Rows reporting a search impression share are treated as Search; the rest are grouped as Display & other."
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "search", header: "Search", numeric: true },
              { key: "other", header: "Display & other", numeric: true },
              { key: "total", header: "Total", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              search: fmtMoney(q.Search),
              other: fmtMoney(q["Display & other"]),
              total: fmtMoney(q.cost),
            })),
          }}
          empty={byQuarter.length ? undefined : "No Google Ads rows found in the workbook."}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={byQuarter} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => `$${fmtCompact(v)}`} />
                <ChartTooltip format={(v) => fmtMoney(v)} />
                <Bar
                  dataKey="Search"
                  stackId="cost"
                  fill={CHANNEL_COLOR.Search}
                  stroke={surfaceStroke}
                  strokeWidth={2}
                  maxBarSize={54}
                />
                <Bar
                  dataKey="Display & other"
                  stackId="cost"
                  fill={CHANNEL_COLOR["Display & other"]}
                  stroke={surfaceStroke}
                  strokeWidth={2}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={54}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Cost share by network"
          hint={quarter ? quarter.label : "All time"}
          legend={costSlices.map((s2) => ({ label: s2.name, color: s2.color }))}
          table={{
            columns: [
              { key: "network", header: "Network" },
              { key: "cost", header: "Cost", numeric: true },
              { key: "share", header: "Share", numeric: true },
            ],
            rows: costSlices.map((c) => ({
              network: c.name,
              cost: fmtMoney(c.value),
              share: fmtPct(s.cost > 0 ? (c.value / s.cost) * 100 : 0, 1),
            })),
          }}
          empty={costSlices.length ? undefined : "No cost recorded for this period."}
        >
          <Donut
            data={costSlices}
            format={(v) => fmtMoney(v)}
            centerValue={fmtMoney(s.cost)}
            centerLabel="Total cost"
          />
        </ChartFrame>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartFrame
          title="Impressions and clicks"
          hint="By quarter — two separate marks on one count axis"
          legend={[
            { label: "Impressions", color: SERIES[3] },
            { label: "Clicks", color: SERIES[2] },
          ]}
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "impressions", header: "Impressions", numeric: true },
              { key: "clicks", header: "Clicks", numeric: true },
              { key: "ctr", header: "CTR", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              impressions: fmtInt(q.impressions),
              clicks: fmtInt(q.clicks),
              ctr: fmtPct(q.ctr, 2),
            })),
          }}
          empty={byQuarter.length ? undefined : "No Google Ads rows found in the workbook."}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={byQuarter}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                barGap={2}
              >
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => fmtCompact(v)} />
                <ChartTooltip format={(v) => fmtInt(v)} />
                <Bar
                  dataKey="impressions"
                  name="Impressions"
                  fill={SERIES[3]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="clicks"
                  name="Clicks"
                  fill={SERIES[2]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="CTR and search impression share"
          hint="Both percentages, so they share one axis honestly"
          legend={[
            { label: "CTR", color: SERIES[2] },
            { label: "Search impression share", color: SERIES[5] },
          ]}
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "ctr", header: "CTR", numeric: true },
              { key: "sis", header: "Impr. share", numeric: true },
              { key: "cpc", header: "Avg CPC", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              ctr: fmtPct(q.ctr, 2),
              sis: q.searchImpressionShare ? fmtPct(q.searchImpressionShare, 1) : "—",
              cpc: fmtMoney(q.cpc),
            })),
          }}
          empty={byQuarter.length ? undefined : "No Google Ads rows found in the workbook."}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={byQuarter} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <ChartTooltip format={(v) => fmtPct(v, 2)} cursor={lineCursor} />
                <Line
                  type="monotone"
                  dataKey="ctr"
                  name="CTR"
                  stroke={SERIES[2]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke }}
                />
                <Line
                  type="monotone"
                  dataKey="searchImpressionShare"
                  name="Search impression share"
                  stroke={SERIES[5]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      <SectionRule label="Every row" note={`${rows.length} campaign row(s) in view`} />
      <div className="border border-border bg-surface">
        <DataTable columns={rowColumns} rows={rows} initialSort={{ key: "cost", dir: "desc" }} />
      </div>

      <SectionRule label="Advisory" />
      <AiPanel
        context="Google Ads performance"
        payload={{
          period: quarter?.label ?? "all time",
          comparedWith: previousQuarter?.label ?? null,
          totals: {
            ...s,
            ctrPct: ctr(s.clicks, s.impressions),
            cpc: cpc(s.cost, s.clicks),
            cpm: cpm(s.cost, s.impressions),
          },
          previousTotals: prev,
          byNetwork: networkTotals.map(({ color: _c, ...t }) => t),
          byQuarter,
          note: "Conversions and phone calls are reported as zero in the source workbook.",
        }}
      />
    </AppShell>
  );
}
