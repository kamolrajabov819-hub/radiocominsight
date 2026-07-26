import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { ExportButton } from "@/components/export-button";
import { useData } from "@/lib/data-context";
import { cpc, cpl, ctr, cpm, filterByPeriod, fmtDecimal, fmtInt, fmtMoney, fmtPct, sumMeta } from "@/lib/metrics";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import { DollarSign, MousePointerClick, Target, Users } from "lucide-react";

export const Route = createFileRoute("/meta-ads")({
  head: () => ({
    meta: [
      { title: "Meta Ads — Radiocom Analytics Hub" },
      { name: "description", content: "Paid Meta Ads performance: spend, reach, impressions, CPL, CTR, CPC." },
      { property: "og:title", content: "Meta Ads — Radiocom" },
      { property: "og:description", content: "Meta Ads paid performance dashboard." },
    ],
  }),
  component: MetaAdsPage,
});

function MetaAdsPage() {
  const { data, period } = useData();
  const rows = filterByPeriod(data.meta, period);
  const s = sumMeta(rows);

  const chart = rows.map((r) => ({
    label: `${r.dateStart}`,
    spend: r.spend,
    leads: r.leads,
    ctr: ctr(r.clicks, r.impressions),
  }));

  const sheets = [{
    name: "Meta Ads",
    rows: [
      ["Date Start","Date Stop","Clicks","Impressions","Reach","Spend","Leads","CPL","CTR %","CPC"],
      ...rows.map((r) => [
        r.dateStart, r.dateStop, r.clicks, r.impressions, r.reach, r.spend, r.leads,
        cpl(r.spend, r.leads), ctr(r.clicks, r.impressions), cpc(r.spend, r.clicks),
      ] as (string | number)[]),
    ],
  }];

  return (
    <AppShell title="Meta Ads (Paid)" actions={<ExportButton filename="radiocom-meta-ads" sheets={sheets} />}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Spend" value={fmtMoney(s.spend)} icon={DollarSign} tone="primary" />
        <KpiCard label="Leads" value={fmtInt(s.leads)} icon={Target} />
        <KpiCard label="CPL" value={s.leads ? fmtMoney(cpl(s.spend, s.leads)) : "—"} sub="Spend / Leads" />
        <KpiCard label="Reach" value={fmtInt(s.reach)} icon={Users} />
        <KpiCard label="Impressions" value={fmtInt(s.impressions)} />
        <KpiCard label="Clicks" value={fmtInt(s.clicks)} icon={MousePointerClick} />
        <KpiCard label="CTR" value={fmtPct(ctr(s.clicks, s.impressions))} />
        <KpiCard label="CPC" value={s.clicks ? fmtMoney(cpc(s.spend, s.clicks)) : "—"} sub={`CPM ${fmtDecimal(cpm(s.spend, s.impressions))}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Spend vs Leads</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="spend" fill="var(--chart-1)" radius={[4,4,0,0]} />
                <Bar dataKey="leads" fill="var(--chart-2)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">CTR trend (%)</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="ctr" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              {["Period","Spend","Impr","Reach","Clicks","CTR","CPC","Leads","CPL"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{r.dateStart} → {r.dateStop}</td>
                <td className="px-3 py-2 font-mono">{fmtMoney(r.spend)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.impressions)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.reach)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.clicks)}</td>
                <td className="px-3 py-2 font-mono">{fmtPct(ctr(r.clicks, r.impressions))}</td>
                <td className="px-3 py-2 font-mono">{r.clicks ? fmtMoney(cpc(r.spend, r.clicks)) : "—"}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.leads)}</td>
                <td className="px-3 py-2 font-mono">{r.leads ? fmtMoney(cpl(r.spend, r.leads)) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
