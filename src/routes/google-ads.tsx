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
  PartToWhole,
  Grid,
  SERIES,
  lineCursor,
  surfaceStroke,
  xAxisProps,
  yAxisProps,
} from "@/components/charts";
import { useData } from "@/lib/data-context";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const rows = filterByQuarter(data.google, quarter?.key ?? null);
  const s = sumGoogle(rows);
  const prev = previousQuarter
    ? sumGoogle(filterByQuarter(data.google, previousQuarter.key))
    : null;
  const deltaSuffix = previousQuarter ? t("h.vs", { q: previousQuarter.short }) : undefined;

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
    {
      key: "period",
      header: t("common.period.label"),
      cell: (r) => r.label,
      sortValue: (r) => r.quarter,
    },
    {
      key: "network",
      header: t("m.network"),
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
      header: t("m.cost"),
      numeric: true,
      cell: (r) => fmtMoney(r.cost),
      sortValue: (r) => r.cost,
    },
    {
      key: "impr",
      header: t("m.impressions"),
      numeric: true,
      cell: (r) => fmtInt(r.impressions),
      sortValue: (r) => r.impressions,
    },
    {
      key: "clicks",
      header: t("m.clicks"),
      numeric: true,
      cell: (r) => fmtInt(r.clicks),
      sortValue: (r) => r.clicks,
    },
    {
      key: "ctr",
      header: t("m.ctr"),
      numeric: true,
      cell: (r) => fmtPct(ctr(r.clicks, r.impressions), 2),
      sortValue: (r) => ctr(r.clicks, r.impressions),
    },
    {
      key: "cpc",
      header: t("m.avgCpc"),
      numeric: true,
      cell: (r) => fmtMoney(cpc(r.cost, r.clicks)),
      sortValue: (r) => cpc(r.cost, r.clicks),
    },
    {
      key: "cpm",
      header: t("m.avgCpm"),
      numeric: true,
      cell: (r) => fmtMoney(cpm(r.cost, r.impressions)),
      sortValue: (r) => cpm(r.cost, r.impressions),
    },
    {
      key: "conv",
      header: t("m.conversions"),
      numeric: true,
      cell: (r) => fmtInt(r.conversions),
      sortValue: (r) => r.conversions,
    },
    {
      key: "calls",
      header: t("m.phoneCalls"),
      numeric: true,
      cell: (r) => fmtInt(r.phoneCalls),
      sortValue: (r) => r.phoneCalls,
    },
    {
      key: "inter",
      header: t("m.interactions"),
      numeric: true,
      cell: (r) => fmtInt(r.interactions),
      sortValue: (r) => r.interactions,
    },
    {
      key: "sis",
      header: t("m.imprShare"),
      numeric: true,
      cell: (r) => (r.searchImpressionSharePct > 0 ? fmtPct(r.searchImpressionSharePct, 1) : "—"),
      sortValue: (r) => r.searchImpressionSharePct,
    },
    {
      key: "video",
      header: t("m.videoViews"),
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
      title={t("gads.title")}
      subtitle={t("gads.subtitle")}
      actions={<ExportButton filename="radiocom-google-ads" sheets={sheets} />}
    >
      <SectionRule
        label={t("gads.accountTotals")}
        note={quarter ? quarter.label : t("common.allQuartersCombined")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4">
        <StatTile
          accent
          label={t("m.cost")}
          value={fmtMoney(s.cost)}
          icon={DollarSign}
          delta={prev ? delta(s.cost, prev.cost) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.cost)}
          trendColor={SERIES[1]}
        />
        <StatTile
          label={t("m.impressions")}
          value={fmtCompact(s.impressions)}
          sub={fmtInt(s.impressions)}
          icon={Eye}
          delta={prev ? delta(s.impressions, prev.impressions) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.impressions)}
          trendColor={SERIES[3]}
        />
        <StatTile
          label={t("m.clicks")}
          value={fmtInt(s.clicks)}
          icon={MousePointerClick}
          delta={prev ? delta(s.clicks, prev.clicks) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.clicks)}
          trendColor={SERIES[2]}
        />
        <StatTile
          label={t("m.ctr")}
          value={fmtPct(ctr(s.clicks, s.impressions), 2)}
          sub={t("h.clicksOverImpressions")}
          delta={
            prev ? delta(ctr(s.clicks, s.impressions), ctr(prev.clicks, prev.impressions)) : null
          }
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.ctr)}
          trendColor={SERIES[4]}
        />
        <StatTile
          label={t("m.avgCpc")}
          value={s.clicks ? fmtMoney(cpc(s.cost, s.clicks)) : "—"}
          lowerIsBetter
          delta={prev ? delta(cpc(s.cost, s.clicks), cpc(prev.cost, prev.clicks)) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label={t("m.avgCpm")}
          value={fmtMoney(cpm(s.cost, s.impressions))}
          sub={t("h.per1000")}
          lowerIsBetter
          delta={prev ? delta(cpm(s.cost, s.impressions), cpm(prev.cost, prev.impressions)) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label={t("m.conversions")}
          value={fmtInt(s.conversions)}
          sub={
            s.conversions
              ? `${t("m.cpl")} ${fmtMoney(cpl(s.cost, s.conversions))}`
              : t("gads.notTracked")
          }
          icon={Target}
          delta={prev ? delta(s.conversions, prev.conversions) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label={t("m.searchImprShare")}
          value={s.searchImpressionSharePct ? fmtPct(s.searchImpressionSharePct, 1) : "—"}
          sub={t("gads.weighted")}
          icon={PhoneCall}
          delta={prev ? delta(s.searchImpressionSharePct, prev.searchImpressionSharePct) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.searchImpressionShare)}
          trendColor={SERIES[5]}
        />
      </div>

      {noConversions && (
        <p className="mt-3 border-l-2 border-caution bg-surface px-3 py-2 text-xs text-muted-foreground">
          {t("gads.zeroConversions")}
        </p>
      )}

      <SectionRule label={t("gads.networkSplit")} note={t("gads.networkSplitHint")} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title={t("gads.costByNetwork")}
          hint={t("h.stackedUsd")}
          legend={NETWORKS.map((n) => ({
            label: n === "Search" ? t("gads.search") : t("gads.displayOther"),
            color: CHANNEL_COLOR[n],
          }))}
          note={t("gads.inferredNote")}
          table={{
            columns: [
              { key: "label", header: t("common.quarter") },
              { key: "search", header: t("gads.search"), numeric: true },
              { key: "other", header: t("gads.displayOther"), numeric: true },
              { key: "total", header: t("common.total"), numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              search: fmtMoney(q.Search),
              other: fmtMoney(q["Display & other"]),
              total: fmtMoney(q.cost),
            })),
          }}
          empty={byQuarter.length ? undefined : t("gads.noRows")}
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
          title={t("gads.costShare")}
          hint={quarter ? quarter.label : t("common.allTime")}
          legend={costSlices.map((s2) => ({ label: s2.name, color: s2.color }))}
          table={{
            columns: [
              { key: "network", header: t("m.network") },
              { key: "cost", header: t("m.cost"), numeric: true },
              { key: "share", header: t("common.share"), numeric: true },
            ],
            rows: costSlices.map((c) => ({
              network: c.name,
              cost: fmtMoney(c.value),
              share: fmtPct(s.cost > 0 ? (c.value / s.cost) * 100 : 0, 1),
            })),
          }}
          empty={costSlices.length ? undefined : t("gads.noCost")}
        >
          <PartToWhole
            data={costSlices}
            format={(v: number) => fmtMoney(v)}
            centerValue={fmtMoney(s.cost)}
            centerLabel={t("m.cost")}
          />
        </ChartFrame>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartFrame
          title={t("gads.imprAndClicks")}
          hint={t("gads.imprAndClicksHint")}
          legend={[
            { label: t("m.impressions"), color: SERIES[3] },
            { label: t("m.clicks"), color: SERIES[2] },
          ]}
          table={{
            columns: [
              { key: "label", header: t("common.quarter") },
              { key: "impressions", header: t("m.impressions"), numeric: true },
              { key: "clicks", header: t("m.clicks"), numeric: true },
              { key: "ctr", header: t("m.ctr"), numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              impressions: fmtInt(q.impressions),
              clicks: fmtInt(q.clicks),
              ctr: fmtPct(q.ctr, 2),
            })),
          }}
          empty={byQuarter.length ? undefined : t("gads.noRows")}
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
                  name={t("m.impressions")}
                  fill={SERIES[3]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="clicks"
                  name={t("m.clicks")}
                  fill={SERIES[2]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title={t("gads.ctrAndShare")}
          hint={t("gads.ctrAndShareHint")}
          legend={[
            { label: t("m.ctr"), color: SERIES[2] },
            { label: t("m.searchImprShare"), color: SERIES[5] },
          ]}
          table={{
            columns: [
              { key: "label", header: t("common.quarter") },
              { key: "ctr", header: t("m.ctr"), numeric: true },
              { key: "sis", header: t("m.imprShare"), numeric: true },
              { key: "cpc", header: t("m.avgCpc"), numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              ctr: fmtPct(q.ctr, 2),
              sis: q.searchImpressionShare ? fmtPct(q.searchImpressionShare, 1) : "—",
              cpc: fmtMoney(q.cpc),
            })),
          }}
          empty={byQuarter.length ? undefined : t("gads.noRows")}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={byQuarter} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <ChartTooltip format={(v) => fmtPct(v, 2)} cursor={lineCursor} />
                <Line
                  type="linear"
                  dataKey="ctr"
                  name={t("m.ctr")}
                  stroke={SERIES[2]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke, fill: SERIES[2] }}
                />
                <Line
                  type="linear"
                  dataKey="searchImpressionShare"
                  name={t("m.searchImprShare")}
                  stroke={SERIES[5]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke, fill: SERIES[5] }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      <SectionRule label={t("gads.everyRow")} note={t("gads.rowsInView", { n: rows.length })} />
      <div className="border border-border bg-surface">
        <DataTable columns={rowColumns} rows={rows} initialSort={{ key: "cost", dir: "desc" }} />
      </div>

      <SectionRule label={t("common.advisory")} />
      <AiPanel
        context={t("gads.aiContext")}
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
