import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { ExportButton } from "@/components/export-button";
import { useData } from "@/lib/data-context";
import { filterOrganicByPeriod, fmtInt } from "@/lib/metrics";
import type { OrganicPeriod } from "@/lib/parsers";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function OrganicView({
  title, filenameSlug, network, highlightKeys,
}: {
  title: string;
  filenameSlug: string;
  network: "facebook" | "instagram";
  highlightKeys: string[];
}) {
  const { data, period } = useData();
  const all = data[network];
  const filtered = filterOrganicByPeriod(all, period);

  const allMetricKeys = Array.from(
    new Set(all.flatMap((p) => Object.keys(p.metrics))),
  );

  const totals: Record<string, number> = {};
  filtered.forEach((p) => {
    for (const [k, v] of Object.entries(p.metrics)) {
      totals[k] = (totals[k] ?? 0) + v;
    }
  });

  const highlights = highlightKeys
    .map((k) => ({ key: k, value: totals[k] ?? findFuzzy(totals, k) }))
    .filter((h) => h.value !== undefined);

  const trendKey = highlights[0]?.key ?? allMetricKeys[0];
  const chartData = all.map((p) => ({ label: p.label, value: p.metrics[trendKey] ?? 0 }));

  const sheets = [{
    name: title.slice(0, 30),
    rows: [
      ["Metric", ...all.map((p) => p.label)],
      ...allMetricKeys.map((k) => [k, ...all.map((p) => p.metrics[k] ?? 0)] as (string | number)[]),
    ],
  }];

  return (
    <AppShell title={title} actions={<ExportButton filename={`radiocom-${filenameSlug}`} sheets={sheets} />}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {highlights.slice(0, 8).map((h) => (
          <KpiCard key={h.key} label={h.key} value={fmtInt(h.value ?? 0)} tone="primary" />
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Trend · {trendKey}</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">All metrics · {filtered.length || all.length} period(s)</h2>
        </div>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/70 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                {(filtered.length ? filtered : all).map((p: OrganicPeriod) => (
                  <th key={p.label} className="px-3 py-2 text-right font-medium">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMetricKeys.map((k) => (
                <tr key={k} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{k}</td>
                  {(filtered.length ? filtered : all).map((p) => (
                    <td key={p.label} className="px-3 py-2 text-right font-mono">
                      {fmtInt(p.metrics[k] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function findFuzzy(totals: Record<string, number>, needle: string): number | undefined {
  const n = needle.toLowerCase();
  const hit = Object.keys(totals).find((k) => k.toLowerCase().includes(n));
  return hit ? totals[hit] : undefined;
}
