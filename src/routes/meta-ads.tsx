import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Eye, MousePointerClick, Repeat, Target, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatTile } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { SectionRule } from "@/components/panel";
import { DataTable, type Column } from "@/components/data-table";
import { AiPanel } from "@/components/ai-panel";
import {
  ChartTooltip,
  Donut,
  Grid,
  SERIES,
  StageBars,
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
  fmtDecimal,
  fmtInt,
  fmtMoney,
  fmtPct,
  frequency,
  sumMeta,
} from "@/lib/metrics";
import type { MetaRow } from "@/lib/parsers";

export const Route = createFileRoute("/meta-ads")({
  head: () => ({
    meta: [
      { title: "Meta Ads — Radiocom Insight" },
      {
        name: "description",
        content:
          "Paid Meta Ads performance: spend, reach, impressions, leads, CPL, CTR, CPC, CPM, engagement mix and video watch-through.",
      },
      { property: "og:title", content: "Meta Ads — Radiocom Insight" },
      { property: "og:description", content: "Meta Ads paid performance dashboard." },
    ],
  }),
  component: MetaAdsPage,
});

function MetaAdsPage() {
  const { data, quarters, quarter, previousQuarter } = useData();
  const rows = filterByQuarter(data.meta, quarter?.key ?? null);
  const s = sumMeta(rows);
  const prev = previousQuarter ? sumMeta(filterByQuarter(data.meta, previousQuarter.key)) : null;
  const deltaSuffix = previousQuarter ? `vs ${previousQuarter.short}` : undefined;

  const byQuarter = useMemo(
    () =>
      quarters
        .map((q) => ({ q, t: sumMeta(filterByQuarter(data.meta, q.key)) }))
        .filter(({ t }) => t.impressions > 0 || t.spend > 0)
        .map(({ q, t }) => ({
          label: q.short,
          spend: t.spend,
          leads: t.leads,
          reach: t.reach,
          impressions: t.impressions,
          clicks: t.clicks,
          cpl: cpl(t.spend, t.leads),
          ctr: ctr(t.clicks, t.impressions),
          cpc: cpc(t.spend, t.clicks),
          cpm: cpm(t.spend, t.impressions),
          frequency: frequency(t.impressions, t.reach),
        })),
    [quarters, data.meta],
  );

  const engagementSlices = [
    { name: "Leads", value: s.leads, color: SERIES[0] },
    { name: "Post engagement", value: s.postEngagement, color: SERIES[1] },
    { name: "Messaging started", value: s.messagingConversations, color: SERIES[2] },
    { name: "Page likes", value: s.pageLikes, color: SERIES[3] },
    { name: "Content views", value: s.contentViews, color: SERIES[4] },
  ].filter((d) => d.value > 0);

  const watchThrough = [
    { label: "25%", value: s.videoWatches25 },
    { label: "50%", value: s.videoWatches50 },
    { label: "75%", value: s.videoWatches75 },
    { label: "100%", value: s.videoWatches100 },
  ];
  const hasVideo = watchThrough.some((w) => w.value > 0);

  const tableColumns: Column<MetaRow>[] = [
    { key: "period", header: "Period", cell: (r) => r.label, sortValue: (r) => r.quarter },
    {
      key: "spend",
      header: "Spend",
      numeric: true,
      cell: (r) => fmtMoney(r.spend),
      sortValue: (r) => r.spend,
    },
    {
      key: "impr",
      header: "Impressions",
      numeric: true,
      cell: (r) => fmtInt(r.impressions),
      sortValue: (r) => r.impressions,
    },
    {
      key: "reach",
      header: "Reach",
      numeric: true,
      cell: (r) => fmtInt(r.reach),
      sortValue: (r) => r.reach,
    },
    {
      key: "freq",
      header: "Frequency",
      numeric: true,
      cell: (r) => fmtDecimal(frequency(r.impressions, r.reach)),
      sortValue: (r) => frequency(r.impressions, r.reach),
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
      cell: (r) => fmtPct(ctr(r.clicks, r.impressions), 3),
      sortValue: (r) => ctr(r.clicks, r.impressions),
    },
    {
      key: "cpc",
      header: "CPC",
      numeric: true,
      cell: (r) => (r.clicks ? fmtMoney(cpc(r.spend, r.clicks)) : "—"),
      sortValue: (r) => cpc(r.spend, r.clicks),
    },
    {
      key: "cpm",
      header: "CPM",
      numeric: true,
      cell: (r) => fmtMoney(cpm(r.spend, r.impressions)),
      sortValue: (r) => cpm(r.spend, r.impressions),
    },
    {
      key: "leads",
      header: "Leads",
      numeric: true,
      cell: (r) => fmtInt(r.leads),
      sortValue: (r) => r.leads,
    },
    {
      key: "cpl",
      header: "CPL",
      numeric: true,
      cell: (r) => (r.leads ? fmtMoney(cpl(r.spend, r.leads)) : "—"),
      sortValue: (r) => cpl(r.spend, r.leads),
    },
    {
      key: "eng",
      header: "Post eng.",
      numeric: true,
      cell: (r) => fmtInt(r.postEngagement),
      sortValue: (r) => r.postEngagement,
    },
    {
      key: "msg",
      header: "Messages",
      numeric: true,
      cell: (r) => fmtInt(r.messagingConversations),
      sortValue: (r) => r.messagingConversations,
    },
  ];

  const sheets = [
    {
      name: "Meta Ads",
      rows: [
        [
          "Period",
          "Date start",
          "Date stop",
          "Spend",
          "Impressions",
          "Reach",
          "Frequency",
          "Clicks",
          "CTR %",
          "CPC",
          "CPM",
          "Leads",
          "CPL",
          "Page likes",
          "Content views",
          "Video 25%",
          "Video 50%",
          "Video 75%",
          "Video 100%",
          "Post engagement",
          "Messaging started",
        ],
        ...rows.map(
          (r) =>
            [
              r.label,
              r.dateStart,
              r.dateStop,
              r.spend,
              r.impressions,
              r.reach,
              frequency(r.impressions, r.reach),
              r.clicks,
              ctr(r.clicks, r.impressions),
              cpc(r.spend, r.clicks),
              cpm(r.spend, r.impressions),
              r.leads,
              cpl(r.spend, r.leads),
              r.pageLikes,
              r.contentViews,
              r.videoWatches25,
              r.videoWatches50,
              r.videoWatches75,
              r.videoWatches100,
              r.postEngagement,
              r.messagingConversations,
            ] as (string | number)[],
        ),
      ],
    },
  ];

  return (
    <AppShell
      title="Meta Ads"
      subtitle="Paid — Facebook & Instagram"
      actions={<ExportButton filename="radiocom-meta-ads" sheets={sheets} />}
    >
      <SectionRule
        label="Spend & efficiency"
        note={quarter ? quarter.label : "All quarters combined"}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile
          accent
          label="Spend"
          value={fmtMoney(s.spend)}
          icon={DollarSign}
          delta={prev ? delta(s.spend, prev.spend) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.spend)}
          trendColor={SERIES[0]}
        />
        <StatTile
          label="Leads"
          value={fmtInt(s.leads)}
          icon={Target}
          delta={prev ? delta(s.leads, prev.leads) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.leads)}
          trendColor={SERIES[1]}
        />
        <StatTile
          label="Cost per lead"
          value={s.leads ? fmtMoney(cpl(s.spend, s.leads)) : "—"}
          sub="Spend ÷ leads"
          lowerIsBetter
          delta={prev ? delta(cpl(s.spend, s.leads), cpl(prev.spend, prev.leads)) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.cpl)}
          trendColor={SERIES[2]}
        />
        <StatTile
          label="Reach"
          value={fmtCompact(s.reach)}
          sub={fmtInt(s.reach)}
          icon={Users}
          delta={prev ? delta(s.reach, prev.reach) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.reach)}
          trendColor={SERIES[3]}
        />
        <StatTile
          label="Impressions"
          value={fmtCompact(s.impressions)}
          sub={fmtInt(s.impressions)}
          icon={Eye}
          delta={prev ? delta(s.impressions, prev.impressions) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.impressions)}
          trendColor={SERIES[4]}
        />
        <StatTile
          label="Clicks"
          value={fmtInt(s.clicks)}
          icon={MousePointerClick}
          delta={prev ? delta(s.clicks, prev.clicks) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label="CTR"
          value={fmtPct(ctr(s.clicks, s.impressions), 3)}
          sub="Clicks ÷ impressions"
          delta={
            prev ? delta(ctr(s.clicks, s.impressions), ctr(prev.clicks, prev.impressions)) : null
          }
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label="Cost per click"
          value={s.clicks ? fmtMoney(cpc(s.spend, s.clicks)) : "—"}
          lowerIsBetter
          delta={prev ? delta(cpc(s.spend, s.clicks), cpc(prev.spend, prev.clicks)) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label="CPM"
          value={fmtMoney(cpm(s.spend, s.impressions))}
          sub="Per 1,000 impressions"
          lowerIsBetter
          delta={
            prev ? delta(cpm(s.spend, s.impressions), cpm(prev.spend, prev.impressions)) : null
          }
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label="Frequency"
          value={fmtDecimal(frequency(s.impressions, s.reach))}
          sub="Impressions ÷ reach"
          icon={Repeat}
          delta={
            prev
              ? delta(frequency(s.impressions, s.reach), frequency(prev.impressions, prev.reach))
              : null
          }
          deltaSuffix={deltaSuffix}
        />
      </div>

      <SectionRule
        label="Trends"
        note="Every quarter in the workbook, regardless of the filter above"
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartFrame
          title="Spend against leads"
          hint="Grouped bars, by quarter"
          legend={[
            { label: "Spend (USD)", color: SERIES[0] },
            { label: "Leads", color: SERIES[1] },
          ]}
          note="Two measures on different scales share one axis here because both are small counts; the table view carries the exact figures."
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "spend", header: "Spend", numeric: true },
              { key: "leads", header: "Leads", numeric: true },
              { key: "cpl", header: "CPL", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              spend: fmtMoney(q.spend),
              leads: fmtInt(q.leads),
              cpl: q.cpl ? fmtMoney(q.cpl) : "—",
            })),
          }}
          empty={byQuarter.length ? undefined : "No Meta Ads rows found in the workbook."}
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
                <ChartTooltip format={(v, k) => (k === "spend" ? fmtMoney(v) : fmtInt(v))} />
                <Bar
                  dataKey="spend"
                  name="Spend (USD)"
                  fill={SERIES[0]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="leads"
                  name="Leads"
                  fill={SERIES[1]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Cost per lead"
          hint="US dollars, by quarter — lower is better"
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "cpl", header: "CPL", numeric: true },
              { key: "cpc", header: "CPC", numeric: true },
              { key: "cpm", header: "CPM", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              cpl: q.cpl ? fmtMoney(q.cpl) : "—",
              cpc: q.cpc ? fmtMoney(q.cpc) : "—",
              cpm: fmtMoney(q.cpm),
            })),
          }}
          empty={byQuarter.length ? undefined : "No Meta Ads rows found in the workbook."}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={byQuarter} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <ChartTooltip format={(v) => fmtMoney(v)} cursor={lineCursor} />
                <Line
                  type="monotone"
                  dataKey="cpl"
                  name="Cost per lead"
                  stroke={SERIES[2]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title="Reach against impressions"
          hint="People reached versus times shown, by quarter"
          legend={[
            { label: "Impressions", color: SERIES[3] },
            { label: "Reach", color: SERIES[4] },
          ]}
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "impressions", header: "Impressions", numeric: true },
              { key: "reach", header: "Reach", numeric: true },
              { key: "frequency", header: "Frequency", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              impressions: fmtInt(q.impressions),
              reach: fmtInt(q.reach),
              frequency: fmtDecimal(q.frequency),
            })),
          }}
          empty={byQuarter.length ? undefined : "No Meta Ads rows found in the workbook."}
        >
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={byQuarter} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => fmtCompact(v)} />
                <ChartTooltip format={(v) => fmtInt(v)} cursor={lineCursor} />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  name="Impressions"
                  stroke={SERIES[3]}
                  strokeWidth={2}
                  fill={SERIES[3]}
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="reach"
                  name="Reach"
                  stroke={SERIES[4]}
                  strokeWidth={2}
                  fill={SERIES[4]}
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Engagement mix"
          hint={quarter ? quarter.label : "All time"}
          legend={engagementSlices.map((d) => ({ label: d.name, color: d.color }))}
          table={{
            columns: [
              { key: "type", header: "Interaction" },
              { key: "count", header: "Count", numeric: true },
            ],
            rows: engagementSlices.map((d) => ({ type: d.name, count: fmtInt(d.value) })),
          }}
          empty={engagementSlices.length ? undefined : "No engagement recorded for this period."}
        >
          <Donut
            data={engagementSlices}
            format={(v) => fmtInt(v)}
            centerValue={fmtCompact(engagementSlices.reduce((a, d) => a + d.value, 0))}
            centerLabel="Interactions"
          />
        </ChartFrame>
      </div>

      <div className="mt-3">
        <ChartFrame
          title="Video watch-through"
          hint="Viewers reaching each quartile"
          note="Quartiles are an ordered scale, so they use the sequential ramp instead of category colours."
          table={{
            columns: [
              { key: "stage", header: "Quartile" },
              { key: "views", header: "Views", numeric: true },
            ],
            rows: watchThrough.map((w) => ({ stage: w.label, views: fmtInt(w.value) })),
          }}
          empty={
            hasVideo ? undefined : "The Meta Ads tab reports zero video watches for this period."
          }
        >
          <StageBars data={watchThrough} format={(v) => fmtInt(v)} height={220} />
        </ChartFrame>
      </div>

      <SectionRule label="Full detail" note={`${rows.length} row(s)`} />
      <div className="border border-border bg-surface">
        <DataTable
          columns={tableColumns}
          rows={rows}
          initialSort={{ key: "period", dir: "desc" }}
        />
      </div>

      <SectionRule label="Advisory" />
      <AiPanel
        context="Meta Ads paid performance"
        payload={{
          period: quarter?.label ?? "all time",
          comparedWith: previousQuarter?.label ?? null,
          totals: {
            ...s,
            cpl: cpl(s.spend, s.leads),
            ctrPct: ctr(s.clicks, s.impressions),
            cpc: cpc(s.spend, s.clicks),
            cpm: cpm(s.spend, s.impressions),
            frequency: frequency(s.impressions, s.reach),
          },
          previousTotals: prev,
          byQuarter,
        }}
      />
    </AppShell>
  );
}
