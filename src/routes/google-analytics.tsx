import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/export-button";
import { useData } from "@/lib/data-context";

export const Route = createFileRoute("/google-analytics")({
  head: () => ({
    meta: [
      { title: "Google Analytics — Radiocom Analytics Hub" },
      { name: "description", content: "Organic rankings, keyword positions, and visibility trends." },
      { property: "og:title", content: "Google Analytics — Radiocom" },
      { property: "og:description", content: "Organic search analytics dashboard." },
    ],
  }),
  component: GAPage,
});

function GAPage() {
  const { data } = useData();
  const { ranks, keywords } = data.ga;

  const sheets = [
    { name: "Rankings", rows: [["Source","Metric","Value","Change","Note","Display"], ...ranks.map((r) => [r.source, r.metric, r.value, r.change, r.note, r.display] as (string|number)[])] },
    { name: "Keywords", rows: [["Keyword","KD","Position","Volume","Intent","CPC","URL","Traffic","Traffic Share"], ...keywords.map((k) => [k.keyword, k.kd, k.position, k.volume, k.intent, k.cpc, k.url, k.traffic, k.trafficShare] as (string|number)[])] },
  ];

  return (
    <AppShell title="Google Analytics & SEO" actions={<ExportButton filename="radiocom-google-analytics" sheets={sheets} />}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Domain rankings & visibility</h2>
            <p className="text-xs text-muted-foreground">Values direct from the Google Analytics tab.</p>
          </div>
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>{["Source","Metric","Value","Change","Note"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {ranks.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.source}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.metric}</td>
                    <td className="px-3 py-2 font-mono">{r.display || r.value}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.change}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Top keywords</h2>
            <p className="text-xs text-muted-foreground">{keywords.length} tracked queries.</p>
          </div>
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>{["Keyword","Pos","Vol","Intent","CPC","Traffic %"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {keywords.map((k, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{k.keyword}</td>
                    <td className="px-3 py-2 font-mono">{k.position}</td>
                    <td className="px-3 py-2 font-mono">{k.volume}</td>
                    <td className="px-3 py-2 text-xs">{k.intent}</td>
                    <td className="px-3 py-2 font-mono">{k.cpc}</td>
                    <td className="px-3 py-2 font-mono">{k.trafficShare}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
