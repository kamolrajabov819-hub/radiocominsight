import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { ExportButton } from "@/components/export-button";
import { useData } from "@/lib/data-context";
import { cpc, cpl, ctr, filterByPeriod, fmtDecimal, fmtInt, fmtMoney, fmtPct, sumGoogle, sumMeta } from "@/lib/metrics";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { DollarSign, Target, TrendingDown, TrendingUp, Users, Sparkles } from "lucide-react";
import { analyzeInsights } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Radiocom Analytics Hub" },
      { name: "description", content: "Blended cross-channel view of Radiocom marketing performance across Meta, Google, and OLX." },
      { property: "og:title", content: "Overview — Radiocom Analytics Hub" },
      { property: "og:description", content: "Blended cross-channel marketing view for Radiocom." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data, period } = useData();
  const meta = filterByPeriod(data.meta, period);
  const google = filterByPeriod(data.google, period);
  const m = sumMeta(meta);
  const g = sumGoogle(google);
  const olxLeads = data.olx.reduce((a, r) => a + r.phoneClicks, 0);
  const olxImp = data.olx.reduce((a, r) => a + r.views, 0);

  const totalSpend = m.spend + g.cost;
  const totalLeads = m.leads + g.conversions + olxLeads;
  const totalImp = m.impressions + g.impressions + olxImp;
  const blendedCpl = cpl(totalSpend, totalLeads);

  const channels = [
    { name: "Meta Ads", spend: m.spend, conversions: m.leads, impressions: m.impressions, clicks: m.clicks },
    { name: "Google Ads", spend: g.cost, conversions: g.conversions, impressions: g.impressions, clicks: g.clicks },
    { name: "OLX", spend: 0, conversions: olxLeads, impressions: olxImp, clicks: olxLeads },
  ];

  const ranked = channels
    .map((c) => ({
      ...c,
      cpl: c.spend > 0 && c.conversions > 0 ? c.spend / c.conversions : 0,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    }));

  const withCpl = ranked.filter((c) => c.cpl > 0);
  const cheapestCpl = withCpl.slice().sort((a, b) => a.cpl - b.cpl)[0];
  const worstCpl = withCpl.slice().sort((a, b) => b.cpl - a.cpl)[0];
  const bestCtr = ranked.slice().sort((a, b) => b.ctr - a.ctr)[0];
  const worstCtr = ranked.filter((c) => c.impressions > 0).slice().sort((a, b) => a.ctr - b.ctr)[0];

  const exportSheets = [
    {
      name: "Overview",
      rows: [
        ["Channel", "Spend (USD)", "Leads/Conv", "Impressions", "Clicks", "CPL", "CTR %"],
        ...ranked.map((c) => [c.name, c.spend, c.conversions, c.impressions, c.clicks, c.cpl, c.ctr] as (string | number)[]),
        ["Blended Total", totalSpend, totalLeads, totalImp, m.clicks + g.clicks, blendedCpl, ctr(m.clicks + g.clicks, totalImp)],
      ],
    },
  ];

  const aiFn = useServerFn(analyzeInsights);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const summary = useMemo(
    () =>
      JSON.stringify({
        period: period ? period : "all-time",
        blended: { totalSpend, totalLeads, blendedCpl, totalImpressions: totalImp },
        channels: ranked,
      }, null, 2),
    [period, totalSpend, totalLeads, blendedCpl, totalImp, ranked],
  );
  const gen = useMutation({
    mutationFn: () => aiFn({ data: { summary } }),
    onSuccess: (r) => { setAiText(r.text); setAiErr(null); },
    onError: (e) => setAiErr(e instanceof Error ? e.message : "AI failed"),
  });

  return (
    <AppShell title="Overview" actions={<ExportButton filename="radiocom-overview" sheets={exportSheets} />}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Spend" value={fmtMoney(totalSpend)} sub={period?.label ?? "All time"} icon={DollarSign} tone="primary" />
        <KpiCard label="Total Leads / Conversions" value={fmtInt(totalLeads)} sub="Meta + Google + OLX calls" icon={Target} />
        <KpiCard label="Blended CPL" value={blendedCpl > 0 ? fmtMoney(blendedCpl) : "—"} sub="Spend / Leads" icon={TrendingDown} />
        <KpiCard label="Total Impressions" value={fmtInt(totalImp)} sub="Across all channels" icon={Users} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Spend vs Conversions by channel</h2>
            <div className="text-xs text-muted-foreground">USD / count</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={ranked} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="spend" fill="var(--chart-1)" name="Spend" radius={[4,4,0,0]} />
                <Bar dataKey="conversions" fill="var(--chart-2)" name="Conversions" radius={[4,4,0,0]}>
                  {ranked.map((_, i) => <Cell key={i} fill="var(--chart-2)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-500">
              <TrendingUp className="h-4 w-4" /> Top performers
            </div>
            <ul className="space-y-2 text-sm">
              {cheapestCpl && <li className="flex justify-between"><span className="text-muted-foreground">Cheapest CPL</span><span className="font-mono">{cheapestCpl.name} · {fmtMoney(cheapestCpl.cpl)}</span></li>}
              {bestCtr && <li className="flex justify-between"><span className="text-muted-foreground">Highest CTR</span><span className="font-mono">{bestCtr.name} · {fmtPct(bestCtr.ctr)}</span></li>}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <TrendingDown className="h-4 w-4" /> Underperformers
            </div>
            <ul className="space-y-2 text-sm">
              {worstCpl && <li className="flex justify-between"><span className="text-muted-foreground">Highest CPL</span><span className="font-mono">{worstCpl.name} · {fmtMoney(worstCpl.cpl)}</span></li>}
              {worstCtr && <li className="flex justify-between"><span className="text-muted-foreground">Lowest CTR</span><span className="font-mono">{worstCtr.name} · {fmtPct(worstCtr.ctr)}</span></li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> AI Strategic Helper
          </div>
          <Button size="sm" variant="outline" onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? "Analyzing…" : aiText ? "Regenerate" : "Analyze current view"}
          </Button>
        </div>
        {aiErr && <div className="mb-3 rounded-md bg-primary/10 p-3 text-sm text-primary">{aiErr}</div>}
        {aiText ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{aiText}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click "Analyze current view" to get an executive summary and recommendations based on the filtered KPIs above.
          </p>
        )}
        <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          Blended CTR: {fmtPct(ctr(m.clicks + g.clicks, totalImp))} · Blended CPC: {fmtDecimal(cpc(totalSpend, m.clicks + g.clicks), 3)}
        </div>
      </div>
    </AppShell>
  );
}
