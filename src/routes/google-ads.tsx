import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { ExportButton } from "@/components/export-button";
import { useData } from "@/lib/data-context";
import { cpc, cpl, ctr, cpm, filterByPeriod, fmtDecimal, fmtInt, fmtMoney, fmtPct, sumGoogle } from "@/lib/metrics";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, PhoneCall, Target } from "lucide-react";

export const Route = createFileRoute("/google-ads")({
  head: () => ({
    meta: [
      { title: "Google Ads — Radiocom Analytics Hub" },
      { name: "description", content: "Google Ads performance: spend, impressions, clicks, conversions, phone calls, CTR, CPC." },
      { property: "og:title", content: "Google Ads — Radiocom" },
      { property: "og:description", content: "Google Ads performance dashboard." },
    ],
  }),
  component: GoogleAdsPage,
});

function GoogleAdsPage() {
  const { data, period } = useData();
  const rows = filterByPeriod(data.google, period);
  const s = sumGoogle(rows);

  const sheets = [{
    name: "Google Ads",
    rows: [
      ["Date Start","Date Stop","Impressions","Clicks","Cost","Conversions","Phone Calls","Interactions","Video Views","Engagements","CTR %","Avg CPC","Avg CPM"],
      ...rows.map((r) => [
        r.dateStart, r.dateStop, r.impressions, r.clicks, r.cost, r.conversions,
        r.phoneCalls, r.interactions, r.videoViews, r.engagements,
        ctr(r.clicks, r.impressions), cpc(r.cost, r.clicks), cpm(r.cost, r.impressions),
      ] as (string | number)[]),
    ],
  }];

  return (
    <AppShell title="Google Ads" actions={<ExportButton filename="radiocom-google-ads" sheets={sheets} />}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Spend" value={fmtMoney(s.cost)} icon={DollarSign} tone="primary" />
        <KpiCard label="Conversions" value={fmtInt(s.conversions)} icon={Target} />
        <KpiCard label="Phone Calls" value={fmtInt(s.phoneCalls)} icon={PhoneCall} />
        <KpiCard label="CPL" value={s.conversions ? fmtMoney(cpl(s.cost, s.conversions)) : "—"} />
        <KpiCard label="Impressions" value={fmtInt(s.impressions)} />
        <KpiCard label="Clicks" value={fmtInt(s.clicks)} />
        <KpiCard label="CTR" value={fmtPct(ctr(s.clicks, s.impressions))} />
        <KpiCard label="Avg CPC / CPM" value={s.clicks ? fmtMoney(cpc(s.cost, s.clicks)) : "—"} sub={`CPM ${fmtDecimal(cpm(s.cost, s.impressions))}`} />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Spend vs Conversions by period</h2>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={rows.map((r) => ({ label: r.dateStart, spend: r.cost, conv: r.conversions, calls: r.phoneCalls }))}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="spend" fill="var(--chart-1)" radius={[4,4,0,0]} />
              <Bar dataKey="conv" fill="var(--chart-2)" radius={[4,4,0,0]} />
              <Bar dataKey="calls" fill="var(--chart-3)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>{["Period","Spend","Impr","Clicks","CTR","CPC","Conv","Calls","Interactions","Video views"].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{r.dateStart} → {r.dateStop}</td>
                <td className="px-3 py-2 font-mono">{fmtMoney(r.cost)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.impressions)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.clicks)}</td>
                <td className="px-3 py-2 font-mono">{fmtPct(ctr(r.clicks, r.impressions))}</td>
                <td className="px-3 py-2 font-mono">{r.clicks ? fmtMoney(cpc(r.cost, r.clicks)) : "—"}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.conversions)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.phoneCalls)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.interactions)}</td>
                <td className="px-3 py-2 font-mono">{fmtInt(r.videoViews)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
