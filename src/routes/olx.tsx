import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { KpiCard } from "@/components/kpi-card";
import { ExportButton } from "@/components/export-button";
import { useData } from "@/lib/data-context";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/metrics";
import { Input } from "@/components/ui/input";
import { Eye, Heart, PhoneCall, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/olx")({
  head: () => ({
    meta: [
      { title: "OLX Performance — Radiocom Analytics Hub" },
      { name: "description", content: "Product-level OLX performance: views, favorites, phone clicks, CTR." },
      { property: "og:title", content: "OLX — Radiocom" },
      { property: "og:description", content: "Product-level OLX analytics." },
    ],
  }),
  component: OlxPage,
});

function OlxPage() {
  const { data } = useData();
  const [q, setQ] = useState("");

  const products = useMemo(() => {
    const t = q.toLowerCase().trim();
    return data.olx.filter((p) => !t || p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t));
  }, [data.olx, q]);

  const totals = products.reduce(
    (a, p) => ({ views: a.views + p.views, fav: a.fav + p.favorites, calls: a.calls + p.phoneClicks }),
    { views: 0, fav: 0, calls: 0 },
  );

  const sheets = [{
    name: "OLX Products",
    rows: [
      ["Name","Category","Price","Ad ID","Views","Favorites","Phone Clicks","CTR"],
      ...products.map((p) => [p.name, p.category, p.price, p.adId, p.views, p.favorites, p.phoneClicks, p.ctr] as (string|number)[]),
    ],
  }];

  return (
    <AppShell title="OLX Performance" actions={<ExportButton filename="radiocom-olx" sheets={sheets} />}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Listings" value={fmtInt(products.length)} icon={ShoppingBag} tone="primary" />
        <KpiCard label="Total Views" value={fmtInt(totals.views)} icon={Eye} />
        <KpiCard label="Favorites" value={fmtInt(totals.fav)} icon={Heart} />
        <KpiCard label="Phone Clicks" value={fmtInt(totals.calls)} icon={PhoneCall} />
      </div>

      <div className="mt-6 rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Product breakdown</h2>
          <Input placeholder="Search product or category…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        </div>
        <div className="max-h-[720px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/70 text-xs uppercase text-muted-foreground">
              <tr>{["Product","Category","Price","Views","Favorites","Phone Clicks","CTR"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 max-w-xs truncate" title={p.name}>{p.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.category}</td>
                  <td className="px-3 py-2 font-mono">{p.price ? fmtMoney(p.price) : "—"}</td>
                  <td className="px-3 py-2 font-mono">{fmtInt(p.views)}</td>
                  <td className="px-3 py-2 font-mono">{fmtInt(p.favorites)}</td>
                  <td className="px-3 py-2 font-mono">{fmtInt(p.phoneClicks)}</td>
                  <td className="px-3 py-2 font-mono">{p.ctr ? fmtPct(p.ctr) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
