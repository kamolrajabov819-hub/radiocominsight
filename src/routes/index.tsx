import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Eye, MousePointerClick, Target, TrendingDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatTile, StatRow } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { Panel, PanelHeader, SectionRule } from "@/components/panel";
import { AiPanel } from "@/components/ai-panel";
import {
  CHANNEL_COLOR,
  ChartTooltip,
  FunnelSteps,
  Grid,
  HBarRanking,
  PartToWhole,
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
  ctr,
  delta,
  filterByQuarter,
  fmtCompact,
  fmtDecimal,
  fmtInt,
  fmtMoney,
  fmtPct,
  sumGoogle,
  sumMeta,
} from "@/lib/metrics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cross-channel — Radiocom Insight" },
      {
        name: "description",
        content:
          "Blended view of Radiocom marketing performance across Meta Ads, Google Ads, OLX and organic social.",
      },
      { property: "og:title", content: "Cross-channel — Radiocom Insight" },
      {
        property: "og:description",
        content: "Blended cross-channel marketing performance for Radiocom.",
      },
    ],
  }),
  component: Overview,
});

const CHANNELS = ["Meta Ads", "Google Ads", "OLX"] as const;

function Overview() {
  const { data, quarters, quarter, previousQuarter } = useData();

  /** Channel roll-up for an arbitrary quarter (null = all time). */
  const rollup = useMemo(() => {
    return (key: string | null) => {
      const m = sumMeta(filterByQuarter(data.meta, key));
      const g = sumGoogle(filterByQuarter(data.google, key));
      // OLX listing counters are lifetime totals — they are only meaningful
      // in the all-time view, so they stay out of a single-quarter blend.
      const includeOlx = key === null;
      const olxViews = includeOlx ? data.olx.reduce((a, p) => a + p.views, 0) : 0;
      const olxCalls = includeOlx ? data.olx.reduce((a, p) => a + p.phoneClicks, 0) : 0;

      const channels = [
        {
          name: "Meta Ads" as const,
          spend: m.spend,
          conversions: m.leads,
          impressions: m.impressions,
          clicks: m.clicks,
        },
        {
          name: "Google Ads" as const,
          spend: g.cost,
          conversions: g.conversions + g.phoneCalls,
          impressions: g.impressions,
          clicks: g.clicks,
        },
        {
          name: "OLX" as const,
          spend: 0,
          conversions: olxCalls,
          impressions: olxViews,
          clicks: olxCalls,
        },
      ].map((c) => ({
        ...c,
        color: CHANNEL_COLOR[c.name],
        cpl: c.spend > 0 && c.conversions > 0 ? c.spend / c.conversions : 0,
        ctr: ctr(c.clicks, c.impressions),
      }));

      const spend = channels.reduce((a, c) => a + c.spend, 0);
      const conversions = channels.reduce((a, c) => a + c.conversions, 0);
      const impressions = channels.reduce((a, c) => a + c.impressions, 0);
      const clicks = channels.reduce((a, c) => a + c.clicks, 0);

      return { m, g, channels, spend, conversions, impressions, clicks, includeOlx };
    };
  }, [data]);

  const now = rollup(quarter?.key ?? null);
  const prev = previousQuarter ? rollup(previousQuarter.key) : null;
  const blendedCpl = cpl(now.spend, now.conversions);
  const deltaSuffix = previousQuarter ? `vs ${previousQuarter.short}` : undefined;

  /** Per-quarter series drive both the trend charts and the sparklines. */
  const byQuarter = useMemo(
    () =>
      quarters.map((q) => {
        const r = rollup(q.key);
        return {
          label: q.short,
          quarter: q.key,
          "Meta Ads": r.channels[0].spend,
          "Google Ads": r.channels[1].spend,
          metaLeads: r.channels[0].conversions,
          googleLeads: r.channels[1].conversions,
          spend: r.spend,
          leads: r.conversions,
          impressions: r.impressions,
          clicks: r.clicks,
          // A quarter with no conversions has no CPL — a zero here would
          // read as "free leads" instead of "no leads".
          cpl: r.conversions > 0 ? cpl(r.spend, r.conversions) : null,
          ctr: ctr(r.clicks, r.impressions),
        };
      }),
    [quarters, rollup],
  );

  const spendSlices = now.channels
    .filter((c) => c.spend > 0)
    .map((c) => ({ name: c.name, value: c.spend, color: c.color }));
  const leadSlices = now.channels
    .filter((c) => c.conversions > 0)
    .map((c) => ({ name: c.name, value: c.conversions, color: c.color }));

  const paid = now.channels.filter((c) => c.cpl > 0);
  const cheapest = [...paid].sort((a, b) => a.cpl - b.cpl)[0];
  const dearest = [...paid].sort((a, b) => b.cpl - a.cpl)[0];
  const engaged = now.channels.filter((c) => c.impressions > 0);
  const bestCtr = [...engaged].sort((a, b) => b.ctr - a.ctr)[0];
  const worstCtr = [...engaged].sort((a, b) => a.ctr - b.ctr)[0];

  const funnel = [
    { label: "Impressions", value: now.impressions },
    { label: "Clicks", value: now.clicks },
    { label: "Leads", value: now.conversions },
  ];

  const exportSheets = [
    {
      name: "Cross-channel",
      rows: [
        ["Channel", "Spend (USD)", "Leads / conversions", "Impressions", "Clicks", "CPL", "CTR %"],
        ...now.channels.map(
          (c) =>
            [c.name, c.spend, c.conversions, c.impressions, c.clicks, c.cpl, c.ctr] as (
              string | number
            )[],
        ),
        [
          "Blended",
          now.spend,
          now.conversions,
          now.impressions,
          now.clicks,
          blendedCpl,
          ctr(now.clicks, now.impressions),
        ],
      ],
    },
    {
      name: "By quarter",
      rows: [
        ["Quarter", "Spend", "Leads", "Impressions", "Clicks", "CPL", "CTR %"],
        ...byQuarter.map(
          (q) =>
            [q.label, q.spend, q.leads, q.impressions, q.clicks, q.cpl, q.ctr] as (
              string | number
            )[],
        ),
      ],
    },
  ];

  const aiPayload = {
    period: quarter?.label ?? "all time",
    comparedWith: previousQuarter?.label ?? null,
    blended: {
      spend: now.spend,
      leads: now.conversions,
      impressions: now.impressions,
      clicks: now.clicks,
      cpl: blendedCpl,
      ctrPct: ctr(now.clicks, now.impressions),
      cpc: cpc(now.spend, now.clicks),
    },
    previousBlended: prev
      ? { spend: prev.spend, leads: prev.conversions, cpl: cpl(prev.spend, prev.conversions) }
      : null,
    channels: now.channels.map(({ color: _color, ...c }) => c),
    quarterlyTrend: byQuarter,
    organicSnapshot: {
      facebookPeriods: data.facebook.length,
      instagramPeriods: data.instagram.length,
    },
    seo: data.ga.metrics
      .filter((m) => m.value !== null)
      .map((m) => ({ metric: m.metric, value: m.raw, change: m.changeRaw })),
  };

  return (
    <AppShell
      title="Cross-channel"
      subtitle="Meta · Google · OLX"
      actions={<ExportButton filename="radiocom-cross-channel" sheets={exportSheets} />}
    >
      <SectionRule
        label="Blended performance"
        note={quarter ? quarter.label : "All quarters combined"}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          accent
          label="Total spend"
          value={fmtMoney(now.spend)}
          icon={DollarSign}
          delta={prev ? delta(now.spend, prev.spend) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.spend)}
          trendColor={SERIES[0]}
        />
        <StatTile
          label="Leads & conversions"
          value={fmtInt(now.conversions)}
          sub={now.includeOlx ? "incl. OLX phone clicks" : "Meta leads + Google conv."}
          icon={Target}
          delta={prev ? delta(now.conversions, prev.conversions) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.leads)}
          trendColor={SERIES[1]}
        />
        <StatTile
          label="Blended CPL"
          value={blendedCpl > 0 ? fmtMoney(blendedCpl) : "—"}
          sub="Spend ÷ conversions"
          icon={TrendingDown}
          lowerIsBetter
          delta={prev ? delta(blendedCpl, cpl(prev.spend, prev.conversions)) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.flatMap((q) => (q.cpl == null ? [] : [q.cpl]))}
          trendColor={SERIES[2]}
        />
        <StatTile
          label="Impressions"
          value={fmtCompact(now.impressions)}
          sub={fmtInt(now.impressions)}
          icon={Eye}
          delta={prev ? delta(now.impressions, prev.impressions) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.impressions)}
          trendColor={SERIES[3]}
        />
        <StatTile
          label="Clicks"
          value={fmtInt(now.clicks)}
          sub={`CTR ${fmtPct(ctr(now.clicks, now.impressions), 3)}`}
          icon={MousePointerClick}
          delta={prev ? delta(now.clicks, prev.clicks) : null}
          deltaSuffix={deltaSuffix}
          trend={byQuarter.map((q) => q.clicks)}
          trendColor={SERIES[4]}
        />
      </div>

      <SectionRule label="Where the money goes" />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title="Paid spend by channel and quarter"
          hint="Stacked, US dollars"
          legend={[
            { label: "Meta Ads", color: CHANNEL_COLOR["Meta Ads"] },
            { label: "Google Ads", color: CHANNEL_COLOR["Google Ads"] },
          ]}
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "meta", header: "Meta Ads", numeric: true },
              { key: "google", header: "Google Ads", numeric: true },
              { key: "total", header: "Total", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              meta: fmtMoney(q["Meta Ads"]),
              google: fmtMoney(q["Google Ads"]),
              total: fmtMoney(q["Meta Ads"] + q["Google Ads"]),
            })),
          }}
          empty={byQuarter.length ? undefined : "No paid spend found in the workbook."}
        >
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={byQuarter} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => `$${fmtCompact(v)}`} />
                <ChartTooltip format={(v) => fmtMoney(v)} />
                <Bar
                  dataKey="Meta Ads"
                  stackId="spend"
                  fill={CHANNEL_COLOR["Meta Ads"]}
                  stroke={surfaceStroke}
                  strokeWidth={2}
                  maxBarSize={54}
                />
                <Bar
                  dataKey="Google Ads"
                  stackId="spend"
                  fill={CHANNEL_COLOR["Google Ads"]}
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
          title="Spend share"
          hint={quarter ? quarter.label : "All time"}
          legend={spendSlices.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "channel", header: "Channel" },
              { key: "spend", header: "Spend", numeric: true },
              { key: "share", header: "Share", numeric: true },
            ],
            rows: spendSlices.map((s) => ({
              channel: s.name,
              spend: fmtMoney(s.value),
              share: fmtPct(now.spend > 0 ? (s.value / now.spend) * 100 : 0, 1),
            })),
          }}
          empty={spendSlices.length ? undefined : "No spend recorded for this period."}
        >
          <PartToWhole
            data={spendSlices}
            format={(v) => fmtMoney(v)}
            centerValue={fmtMoney(now.spend)}
            centerLabel="Total spend"
          />
        </ChartFrame>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          title="Conversion share"
          hint="Leads, conversions and phone clicks"
          legend={leadSlices.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "channel", header: "Channel" },
              { key: "conv", header: "Conversions", numeric: true },
              { key: "share", header: "Share", numeric: true },
            ],
            rows: leadSlices.map((s) => ({
              channel: s.name,
              conv: fmtInt(s.value),
              share: fmtPct(now.conversions > 0 ? (s.value / now.conversions) * 100 : 0, 1),
            })),
          }}
          empty={leadSlices.length ? undefined : "No conversions recorded for this period."}
        >
          <PartToWhole
            data={leadSlices}
            format={(v) => fmtInt(v)}
            centerValue={fmtInt(now.conversions)}
            centerLabel="Conversions"
          />
        </ChartFrame>

        <ChartFrame
          title="Blended cost per lead"
          hint="US dollars, by quarter"
          table={{
            columns: [
              { key: "label", header: "Quarter" },
              { key: "cpl", header: "Blended CPL", numeric: true },
              { key: "spend", header: "Spend", numeric: true },
              { key: "leads", header: "Conversions", numeric: true },
            ],
            rows: byQuarter.map((q) => ({
              label: q.label,
              cpl: q.cpl != null ? fmtMoney(q.cpl) : "—",
              spend: fmtMoney(q.spend),
              leads: fmtInt(q.leads),
            })),
          }}
          empty={byQuarter.length ? undefined : "No quarters detected."}
        >
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={byQuarter} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <Grid />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <ChartTooltip format={(v) => fmtMoney(v)} cursor={lineCursor} />
                <Line
                  type="linear"
                  dataKey="cpl"
                  name="Blended CPL"
                  stroke={SERIES[0]}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 4, strokeWidth: 2, stroke: surfaceStroke, fill: SERIES[0] }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Funnel"
          hint={quarter ? quarter.label : "All time"}
          note="Stages span three orders of magnitude, so each gets its own track with the step conversion beside it."
          table={{
            columns: [
              { key: "stage", header: "Stage" },
              { key: "value", header: "Count", numeric: true },
              { key: "rate", header: "From previous", numeric: true },
            ],
            rows: funnel.map((f, i) => ({
              stage: f.label,
              value: fmtInt(f.value),
              rate:
                i === 0 || funnel[i - 1].value === 0
                  ? "—"
                  : fmtPct((f.value / funnel[i - 1].value) * 100, 3),
            })),
          }}
          empty={now.impressions ? undefined : "No impressions recorded for this period."}
        >
          <FunnelSteps data={funnel} format={(v) => fmtInt(v)} />
        </ChartFrame>
      </div>

      <SectionRule label="Channel league table" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ChartFrame
          title="Cost per lead by channel"
          hint="Lower is better · paid channels only"
          table={{
            columns: [
              { key: "channel", header: "Channel" },
              { key: "cpl", header: "CPL", numeric: true },
            ],
            rows: paid.map((c) => ({ channel: c.name, cpl: fmtMoney(c.cpl) })),
          }}
          empty={paid.length ? undefined : "No channel reported both spend and conversions."}
          note={
            paid.length === 1
              ? "Only one channel reports both spend and conversions, so there is nothing to rank — the figure is shown on its own."
              : undefined
          }
        >
          {paid.length === 1 ? (
            // A one-bar bar chart is just a number wearing a costume.
            <div className="flex h-full flex-col justify-center py-6">
              <div className="figure text-4xl leading-none">{fmtMoney(paid[0].cpl)}</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2.5 w-2.5" style={{ background: paid[0].color }} aria-hidden />
                {paid[0].name} · {fmtInt(paid[0].conversions)} conversions from{" "}
                {fmtMoney(paid[0].spend)}
              </div>
            </div>
          ) : (
            <HBarRanking
              data={[...paid]
                .sort((a, b) => b.cpl - a.cpl)
                .map((c) => ({ label: c.name, value: c.cpl }))}
              color={SERIES[0]}
              seriesName="CPL"
              format={(v) => fmtMoney(v)}
              labelWidth={92}
            />
          )}
        </ChartFrame>

        <ChartFrame
          title="Click-through rate by channel"
          hint="Clicks ÷ impressions"
          table={{
            columns: [
              { key: "channel", header: "Channel" },
              { key: "ctr", header: "CTR", numeric: true },
              { key: "clicks", header: "Clicks", numeric: true },
            ],
            rows: engaged.map((c) => ({
              channel: c.name,
              ctr: fmtPct(c.ctr, 3),
              clicks: fmtInt(c.clicks),
            })),
          }}
          empty={engaged.length ? undefined : "No impressions recorded for this period."}
        >
          <HBarRanking
            data={[...engaged]
              .sort((a, b) => b.ctr - a.ctr)
              .map((c) => ({ label: c.name, value: c.ctr }))}
            color={SERIES[1]}
            seriesName="CTR"
            format={(v) => `${v.toFixed(2)}%`}
            labelWidth={92}
          />
        </ChartFrame>

        <Panel>
          <PanelHeader title="Read-outs" hint="Best and worst on the two efficiency measures." />
          <ul className="mt-3">
            {cheapest && (
              <StatRow
                label="Cheapest CPL"
                value={`${cheapest.name} · ${fmtMoney(cheapest.cpl)}`}
                swatch={cheapest.color}
              />
            )}
            {dearest && dearest !== cheapest && (
              <StatRow
                label="Dearest CPL"
                value={`${dearest.name} · ${fmtMoney(dearest.cpl)}`}
                swatch={dearest.color}
              />
            )}
            {bestCtr && (
              <StatRow
                label="Highest CTR"
                value={`${bestCtr.name} · ${fmtPct(bestCtr.ctr, 3)}`}
                swatch={bestCtr.color}
              />
            )}
            {worstCtr && worstCtr !== bestCtr && (
              <StatRow
                label="Lowest CTR"
                value={`${worstCtr.name} · ${fmtPct(worstCtr.ctr, 3)}`}
                swatch={worstCtr.color}
              />
            )}
            <StatRow label="Blended CPC" value={fmtDecimal(cpc(now.spend, now.clicks), 4)} />
            <StatRow
              label="Channels reporting"
              value={`${now.channels.filter((c) => c.impressions > 0 || c.spend > 0).length} of ${CHANNELS.length}`}
            />
          </ul>
        </Panel>
      </div>

      <SectionRule label="Advisory" />
      <AiPanel payload={aiPayload} context="the blended cross-channel view" />
    </AppShell>
  );
}
