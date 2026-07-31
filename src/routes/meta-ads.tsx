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
import {
  ChartTooltip,
  PartToWhole,
  Grid,
  SERIES,
  StageBars,
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
  const { t } = useI18n();
  const rows = filterByQuarter(data.meta, quarter?.key ?? null);
  const s = sumMeta(rows);
  const prev = previousQuarter ? sumMeta(filterByQuarter(data.meta, previousQuarter.key)) : null;
  const deltaSuffix = previousQuarter ? t("h.vs", { q: previousQuarter.short }) : undefined;

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
          // No leads means no cost per lead — a zero would read as "free".
          cpl: t.leads > 0 ? cpl(t.spend, t.leads) : null,
          ctr: ctr(t.clicks, t.impressions),
          cpc: cpc(t.spend, t.clicks),
          cpm: cpm(t.spend, t.impressions),
          frequency: frequency(t.impressions, t.reach),
        })),
    [quarters, data.meta],
  );

  const engagementSlices = [
    { name: t("m.leads"), value: s.leads, color: SERIES[0] },
    { name: t("meta.postEngagement"), value: s.postEngagement, color: SERIES[1] },
    { name: t("meta.messagingStarted"), value: s.messagingConversations, color: SERIES[2] },
    { name: t("meta.pageLikes"), value: s.pageLikes, color: SERIES[3] },
    { name: t("meta.contentViews"), value: s.contentViews, color: SERIES[4] },
  ].filter((d) => d.value > 0);

  const watchThrough = [
    { label: "25%", value: s.videoWatches25 },
    { label: "50%", value: s.videoWatches50 },
    { label: "75%", value: s.videoWatches75 },
    { label: "100%", value: s.videoWatches100 },
  ];
  const hasVideo = watchThrough.some((w) => w.value > 0);

  const tableColumns: Column<MetaRow>[] = [
    {
      key: "period",
      header: t("common.period.label"),
      cell: (r) => r.label,
      sortValue: (r) => r.quarter,
    },
    {
      key: "spend",
      header: t("m.spend"),
      numeric: true,
      cell: (r) => fmtMoney(r.spend),
      sortValue: (r) => r.spend,
    },
    {
      key: "impr",
      header: t("m.impressions"),
      numeric: true,
      cell: (r) => fmtInt(r.impressions),
      sortValue: (r) => r.impressions,
    },
    {
      key: "reach",
      header: t("m.reach"),
      numeric: true,
      cell: (r) => fmtInt(r.reach),
      sortValue: (r) => r.reach,
    },
    {
      key: "freq",
      header: t("m.frequency"),
      numeric: true,
      cell: (r) => fmtDecimal(frequency(r.impressions, r.reach)),
      sortValue: (r) => frequency(r.impressions, r.reach),
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
      cell: (r) => fmtPct(ctr(r.clicks, r.impressions), 3),
      sortValue: (r) => ctr(r.clicks, r.impressions),
    },
    {
      key: "cpc",
      header: t("m.cpc"),
      numeric: true,
      cell: (r) => (r.clicks ? fmtMoney(cpc(r.spend, r.clicks)) : "—"),
      sortValue: (r) => cpc(r.spend, r.clicks),
    },
    {
      key: "cpm",
      header: t("m.cpm"),
      numeric: true,
      cell: (r) => fmtMoney(cpm(r.spend, r.impressions)),
      sortValue: (r) => cpm(r.spend, r.impressions),
    },
    {
      key: "leads",
      header: t("m.leads"),
      numeric: true,
      cell: (r) => fmtInt(r.leads),
      sortValue: (r) => r.leads,
    },
    {
      key: "cpl",
      header: t("m.cpl"),
      numeric: true,
      cell: (r) => (r.leads ? fmtMoney(cpl(r.spend, r.leads)) : "—"),
      sortValue: (r) => cpl(r.spend, r.leads),
    },
    {
      key: "eng",
      header: t("meta.postEng"),
      numeric: true,
      cell: (r) => fmtInt(r.postEngagement),
      sortValue: (r) => r.postEngagement,
    },
    {
      key: "msg",
      header: t("meta.messages"),
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
      title={t("meta.title")}
      subtitle={t("meta.subtitle")}
      actions={<ExportButton filename="radiocom-meta-ads" sheets={sheets} />}
    >
      <SectionRule
        label={t("meta.spendEfficiency")}
        note={quarter ? quarter.label : t("common.allQuartersCombined")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile
          accent
          label={t("m.spend")}
          value={fmtMoney(s.spend)}
          icon={DollarSign}
          delta={prev ? delta(s.spend, prev.spend) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.spend)}
          trendColor={SERIES[0]}
        />
        <StatTile
          label={t("m.leads")}
          value={fmtInt(s.leads)}
          icon={Target}
          delta={prev ? delta(s.leads, prev.leads) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.leads)}
          trendColor={SERIES[1]}
        />
        <StatTile
          label={t("m.cpl")}
          value={s.leads ? fmtMoney(cpl(s.spend, s.leads)) : "—"}
          sub={t("h.spendOverLeads")}
          lowerIsBetter
          delta={prev ? delta(cpl(s.spend, s.leads), cpl(prev.spend, prev.leads)) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.flatMap((q) => (q.cpl == null ? [] : [q.cpl]))}
          trendColor={SERIES[2]}
        />
        <StatTile
          label={t("m.reach")}
          value={fmtCompact(s.reach)}
          sub={fmtInt(s.reach)}
          icon={Users}
          delta={prev ? delta(s.reach, prev.reach) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.reach)}
          trendColor={SERIES[3]}
        />
        <StatTile
          label={t("m.impressions")}
          value={fmtCompact(s.impressions)}
          sub={fmtInt(s.impressions)}
          icon={Eye}
          delta={prev ? delta(s.impressions, prev.impressions) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.impressions)}
          trendColor={SERIES[4]}
        />
        <StatTile
          label={t("m.clicks")}
          value={fmtInt(s.clicks)}
          icon={MousePointerClick}
          delta={prev ? delta(s.clicks, prev.clicks) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label={t("m.ctr")}
          value={fmtPct(ctr(s.clicks, s.impressions), 3)}
          sub={t("h.clicksOverImpressions")}
          delta={
            prev ? delta(ctr(s.clicks, s.impressions), ctr(prev.clicks, prev.impressions)) : null
          }
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label={t("m.cpc")}
          value={s.clicks ? fmtMoney(cpc(s.spend, s.clicks)) : "—"}
          lowerIsBetter
          delta={prev ? delta(cpc(s.spend, s.clicks), cpc(prev.spend, prev.clicks)) : null}
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label={t("m.cpm")}
          value={fmtMoney(cpm(s.spend, s.impressions))}
          sub={t("h.per1000")}
          lowerIsBetter
          delta={
            prev ? delta(cpm(s.spend, s.impressions), cpm(prev.spend, prev.impressions)) : null
          }
          deltaSuffix={deltaSuffix}
        />
        <StatTile
          label={t("m.frequency")}
          value={fmtDecimal(frequency(s.impressions, s.reach))}
          sub={t("h.imprOverReach")}
          icon={Repeat}
          delta={
            prev
              ? delta(frequency(s.impressions, s.reach), frequency(prev.impressions, prev.reach))
              : null
          }
          deltaSuffix={deltaSuffix}
        />
      </div>

      <SectionRule label={t("meta.trends")} note={t("common.allQuartersNote")} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartFrame
          title={t("meta.spendVsLeads")}
          hint={t("meta.spendVsLeadsHint")}
          legend={[
            { label: t("m.spend"), color: SERIES[0] },
            { label: t("m.leads"), color: SERIES[1] },
          ]}
          note={t("meta.spendVsLeadsNote")}
          table={{
            columns: [
              { key: "label", header: t("common.quarter") },
              { key: "spend", header: t("m.spend"), numeric: true },
              { key: "leads", header: t("m.leads"), numeric: true },
              { key: "cpl", header: t("m.cpl"), numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              spend: fmtMoney(q.spend),
              leads: fmtInt(q.leads),
              cpl: q.cpl != null ? fmtMoney(q.cpl) : "—",
            })),
          }}
          empty={byQuarter.length ? undefined : t("meta.noRows")}
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
                  name={t("m.spend")}
                  fill={SERIES[0]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="leads"
                  name={t("m.leads")}
                  fill={SERIES[1]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title={t("meta.cplTitle")}
          hint={t("meta.cplHint")}
          table={{
            columns: [
              { key: "label", header: t("common.quarter") },
              { key: "cpl", header: t("m.cpl"), numeric: true },
              { key: "cpc", header: t("m.cpc"), numeric: true },
              { key: "cpm", header: t("m.cpm"), numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              cpl: q.cpl != null ? fmtMoney(q.cpl) : "—",
              cpc: q.cpc ? fmtMoney(q.cpc) : "—",
              cpm: fmtMoney(q.cpm),
            })),
          }}
          empty={byQuarter.length ? undefined : t("meta.noRows")}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={byQuarter} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <ChartTooltip format={(v) => fmtMoney(v)} cursor={lineCursor} />
                <Line
                  type="linear"
                  dataKey="cpl"
                  name={t("m.cpl")}
                  stroke={SERIES[2]}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke, fill: SERIES[2] }}
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
          title={t("meta.reachVsImpressions")}
          hint={t("meta.reachVsImpressionsHint")}
          legend={[
            { label: t("m.impressions"), color: SERIES[3] },
            { label: t("m.reach"), color: SERIES[4] },
          ]}
          table={{
            columns: [
              { key: "label", header: t("common.quarter") },
              { key: "impressions", header: t("m.impressions"), numeric: true },
              { key: "reach", header: t("m.reach"), numeric: true },
              { key: "frequency", header: t("m.frequency"), numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              impressions: fmtInt(q.impressions),
              reach: fmtInt(q.reach),
              frequency: fmtDecimal(q.frequency),
            })),
          }}
          empty={byQuarter.length ? undefined : t("meta.noRows")}
        >
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={byQuarter} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => fmtCompact(v)} />
                <ChartTooltip format={(v) => fmtInt(v)} cursor={lineCursor} />
                <Area
                  type="linear"
                  dataKey="impressions"
                  name={t("m.impressions")}
                  stroke={SERIES[3]}
                  strokeWidth={2}
                  fill={SERIES[3]}
                  fillOpacity={0.12}
                />
                <Area
                  type="linear"
                  dataKey="reach"
                  name={t("m.reach")}
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
          title={t("meta.engagementMix")}
          hint={quarter ? quarter.label : t("common.allTime")}
          legend={engagementSlices.map((d) => ({ label: d.name, color: d.color }))}
          table={{
            columns: [
              { key: "type", header: t("meta.interaction") },
              { key: "count", header: t("common.count"), numeric: true },
            ],
            rows: engagementSlices.map((d) => ({ type: d.name, count: fmtInt(d.value) })),
          }}
          empty={engagementSlices.length ? undefined : t("org.noInteractions")}
        >
          <PartToWhole
            data={engagementSlices}
            format={(v) => fmtInt(v)}
            centerValue={fmtCompact(engagementSlices.reduce((a, d) => a + d.value, 0))}
            centerLabel={t("m.interactions")}
          />
        </ChartFrame>
      </div>

      <div className="mt-3">
        <ChartFrame
          title={t("meta.watchThrough")}
          hint={t("meta.watchThroughHint")}
          note={t("meta.watchThroughNote")}
          table={{
            columns: [
              { key: "stage", header: t("meta.quartile") },
              { key: "views", header: t("olx.views"), numeric: true },
            ],
            rows: watchThrough.map((w) => ({ stage: w.label, views: fmtInt(w.value) })),
          }}
          empty={hasVideo ? undefined : t("meta.noVideo")}
        >
          <StageBars data={watchThrough} format={(v) => fmtInt(v)} height={220} />
        </ChartFrame>
      </div>

      <SectionRule label={t("meta.fullDetail")} note={t("common.rows", { n: rows.length })} />
      <div className="border border-border bg-surface">
        <DataTable
          columns={tableColumns}
          rows={rows}
          initialSort={{ key: "period", dir: "desc" }}
        />
      </div>
    </AppShell>
  );
}
