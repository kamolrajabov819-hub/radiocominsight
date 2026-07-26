import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Heart, PhoneCall, ShoppingBag, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatTile } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { SectionRule, Note } from "@/components/panel";
import { DataTable, type Column } from "@/components/data-table";
import { AiPanel } from "@/components/ai-panel";
import { FunnelSteps, HBarRanking, PartToWhole, SERIES, StageBars } from "@/components/charts";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/data-context";
import { fmtCompact, fmtInt, fmtPct, fmtSom } from "@/lib/metrics";
import type { OlxProduct } from "@/lib/parsers";

export const Route = createFileRoute("/olx")({
  head: () => ({
    meta: [
      { title: "OLX listings — Radiocom Insight" },
      {
        name: "description",
        content:
          "Listing-level OLX performance: views, favourites, phone clicks, contact rate and category mix.",
      },
      { property: "og:title", content: "OLX listings — Radiocom Insight" },
      { property: "og:description", content: "Listing-level OLX analytics." },
    ],
  }),
  component: OlxPage,
});

/** Part-to-whole charts stay readable at five slices plus an "Other" bucket. */
const MAX_SLICES = 5;

function OlxPage() {
  const { data } = useData();
  const [q, setQ] = useState("");

  const products = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return data.olx;
    return data.olx.filter(
      (p) => p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t),
    );
  }, [data.olx, q]);

  const totals = products.reduce(
    (a, p) => ({
      views: a.views + p.views,
      favorites: a.favorites + p.favorites,
      calls: a.calls + p.phoneClicks,
      value: a.value + p.price,
    }),
    { views: 0, favorites: 0, calls: 0, value: 0 },
  );
  const contactRate = totals.views > 0 ? (totals.calls / totals.views) * 100 : 0;

  const byCategory = useMemo(() => {
    const map = new Map<
      string,
      { views: number; calls: number; favorites: number; count: number }
    >();
    products.forEach((p) => {
      const cur = map.get(p.category) ?? { views: 0, calls: 0, favorites: 0, count: 0 };
      map.set(p.category, {
        views: cur.views + p.views,
        calls: cur.calls + p.phoneClicks,
        favorites: cur.favorites + p.favorites,
        count: cur.count + 1,
      });
    });
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.views - a.views);
  }, [products]);

  const categorySlices = useMemo(() => {
    const head = byCategory.slice(0, MAX_SLICES);
    const tail = byCategory.slice(MAX_SLICES);
    const slices = head.map((c, i) => ({
      name: c.category,
      value: c.views,
      color: SERIES[i % SERIES.length] as string,
    }));
    if (tail.length) {
      slices.push({
        name: `Other (${tail.length})`,
        value: tail.reduce((a, c) => a + c.views, 0),
        color: SERIES[MAX_SLICES] as string,
      });
    }
    return slices.filter((s) => s.value > 0);
  }, [byCategory]);

  const topByViews = [...products]
    .sort((a, b) => b.views - a.views)
    .slice(0, 12)
    .map((p) => ({ label: shorten(p.name), value: p.views }));

  const topByCalls = [...products]
    .sort((a, b) => b.phoneClicks - a.phoneClicks)
    .slice(0, 12)
    .map((p) => ({ label: shorten(p.name), value: p.phoneClicks }));

  /** Contact-rate spread — ordered bands, so a sequential ramp fits. */
  const ctrBands = useMemo(() => {
    const bands = [
      { label: "0–2%", min: 0, max: 2 },
      { label: "2–4%", min: 2, max: 4 },
      { label: "4–6%", min: 4, max: 6 },
      { label: "6–8%", min: 6, max: 8 },
      { label: "8%+", min: 8, max: Infinity },
    ];
    return bands.map((b) => ({
      label: b.label,
      value: products.filter((p) => p.ctrPct >= b.min && p.ctrPct < b.max).length,
    }));
  }, [products]);

  const funnel = [
    { label: "Views", value: totals.views },
    { label: "Favourites", value: totals.favorites },
    { label: "Phone clicks", value: totals.calls },
  ];

  const columns: Column<OlxProduct>[] = [
    {
      key: "name",
      header: "Listing",
      cell: (p) => <span title={p.name}>{shorten(p.name, 48)}</span>,
      sortValue: (p) => p.name,
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => <span className="text-muted-foreground">{p.category}</span>,
      sortValue: (p) => p.category,
    },
    {
      key: "price",
      header: "Price",
      numeric: true,
      cell: (p) => fmtSom(p.price),
      sortValue: (p) => p.price,
    },
    {
      key: "views",
      header: "Views",
      numeric: true,
      cell: (p) => fmtInt(p.views),
      sortValue: (p) => p.views,
    },
    {
      key: "favorites",
      header: "Favourites",
      numeric: true,
      cell: (p) => fmtInt(p.favorites),
      sortValue: (p) => p.favorites,
    },
    {
      key: "calls",
      header: "Phone clicks",
      numeric: true,
      cell: (p) => fmtInt(p.phoneClicks),
      sortValue: (p) => p.phoneClicks,
    },
    {
      key: "ctr",
      header: "Contact rate",
      numeric: true,
      cell: (p) => (p.ctrPct ? fmtPct(p.ctrPct, 1) : "—"),
      sortValue: (p) => p.ctrPct,
    },
    {
      key: "adId",
      header: "Ad ID",
      numeric: true,
      cell: (p) => p.adId || "—",
      sortValue: (p) => p.adId,
    },
  ];

  const sheets = [
    {
      name: "OLX listings",
      rows: [
        [
          "Listing",
          "Category",
          "Price (so'm)",
          "Ad ID",
          "Views",
          "Favourites",
          "Phone clicks",
          "Contact rate %",
        ],
        ...products.map(
          (p) =>
            [
              p.name,
              p.category,
              p.price,
              p.adId,
              p.views,
              p.favorites,
              p.phoneClicks,
              p.ctrPct,
            ] as (string | number)[],
        ),
      ],
    },
    {
      name: "By category",
      rows: [
        ["Category", "Listings", "Views", "Favourites", "Phone clicks", "Contact rate %"],
        ...byCategory.map(
          (c) =>
            [
              c.category,
              c.count,
              c.views,
              c.favorites,
              c.calls,
              c.views ? (c.calls / c.views) * 100 : 0,
            ] as (string | number)[],
        ),
      ],
    },
  ];

  return (
    <AppShell
      title="OLX listings"
      subtitle="Marketplace performance"
      showFilter={false}
      actions={<ExportButton filename="radiocom-olx" sheets={sheets} />}
    >
      <SectionRule label="Marketplace totals" note={q ? `Filtered by “${q}”` : "All listings"} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile accent label="Listings" value={fmtInt(products.length)} icon={ShoppingBag} />
        <StatTile
          label="Views"
          value={fmtCompact(totals.views)}
          sub={fmtInt(totals.views)}
          icon={Eye}
        />
        <StatTile label="Favourites" value={fmtInt(totals.favorites)} icon={Heart} />
        <StatTile label="Phone clicks" value={fmtInt(totals.calls)} icon={PhoneCall} />
        <StatTile
          label="Contact rate"
          value={fmtPct(contactRate, 2)}
          sub="Phone clicks ÷ views"
          icon={Target}
        />
        <StatTile
          label="Catalogue value"
          value={fmtCompact(totals.value)}
          sub="Sum of listed prices, so'm"
        />
      </div>

      <Note>
        OLX counters in the workbook are lifetime totals per listing rather than quarterly figures,
        so this page ignores the period filter in the header.
      </Note>

      <SectionRule label="Where the attention goes" />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title="Most viewed listings"
          hint="Top 12 by lifetime views"
          table={{
            columns: [
              { key: "listing", header: "Listing" },
              { key: "views", header: "Views", numeric: true },
            ],
            rows: topByViews.map((p) => ({ listing: p.label, views: fmtInt(p.value) })),
          }}
          empty={topByViews.length ? undefined : "No listings match this search."}
        >
          <HBarRanking
            data={topByViews}
            color={SERIES[2]}
            seriesName="Views"
            format={(v) => fmtInt(v)}
            labelWidth={230}
          />
        </ChartFrame>

        <ChartFrame
          title="Views by category"
          hint={`${byCategory.length} categor${byCategory.length === 1 ? "y" : "ies"}`}
          legend={categorySlices.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "category", header: "Category" },
              { key: "listings", header: "Listings", numeric: true },
              { key: "views", header: "Views", numeric: true },
              { key: "calls", header: "Phone clicks", numeric: true },
              { key: "rate", header: "Contact rate", numeric: true },
            ],
            rows: byCategory.map((c) => ({
              category: c.category,
              listings: c.count,
              views: fmtInt(c.views),
              calls: fmtInt(c.calls),
              rate: fmtPct(c.views ? (c.calls / c.views) * 100 : 0, 1),
            })),
          }}
          empty={categorySlices.length ? undefined : "No views recorded."}
        >
          <PartToWhole
            data={categorySlices}
            format={(v) => fmtInt(v)}
            centerValue={fmtCompact(totals.views)}
            centerLabel="Total views"
          />
        </ChartFrame>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title="Most contacted listings"
          hint="Top 12 by phone clicks"
          table={{
            columns: [
              { key: "listing", header: "Listing" },
              { key: "calls", header: "Phone clicks", numeric: true },
            ],
            rows: topByCalls.map((p) => ({ listing: p.label, calls: fmtInt(p.value) })),
          }}
          empty={topByCalls.length ? undefined : "No listings match this search."}
        >
          <HBarRanking
            data={topByCalls}
            color={SERIES[0]}
            seriesName="Phone clicks"
            format={(v) => fmtInt(v)}
            labelWidth={230}
          />
        </ChartFrame>

        <ChartFrame
          title="Engagement per listing view"
          hint="Lifetime, across listings in view"
          note="Favourites and phone clicks are parallel actions off the same views, not sequential stages, so both are shown as a share of views."
          table={{
            columns: [
              { key: "stage", header: "Stage" },
              { key: "value", header: "Count", numeric: true },
              { key: "rate", header: "From views", numeric: true },
            ],
            rows: funnel.map((f, i) => ({
              stage: f.label,
              value: fmtInt(f.value),
              rate: i === 0 || !totals.views ? "—" : fmtPct((f.value / totals.views) * 100, 2),
            })),
          }}
          empty={totals.views ? undefined : "No views recorded."}
        >
          <FunnelSteps data={funnel} format={(v) => fmtInt(v)} relativeTo="first" />
        </ChartFrame>
      </div>

      <div className="mt-3">
        <ChartFrame
          title="Contact-rate spread"
          hint="How many listings fall in each contact-rate band"
          note="Bands are ordered, so they use the sequential ramp rather than category colours."
          table={{
            columns: [
              { key: "band", header: "Contact rate" },
              { key: "count", header: "Listings", numeric: true },
            ],
            rows: ctrBands.map((b) => ({ band: b.label, count: b.value })),
          }}
          empty={products.length ? undefined : "No listings match this search."}
        >
          <StageBars data={ctrBands} format={(v) => fmtInt(v)} height={220} />
        </ChartFrame>
      </div>

      <SectionRule label="Every listing" note={`${products.length} of ${data.olx.length}`} />
      <div className="border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-[0.9375rem] font-bold">Listing breakdown</h2>
          <Input
            placeholder="Search listing or category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <DataTable
          columns={columns}
          rows={products}
          initialSort={{ key: "views", dir: "desc" }}
          maxHeight="40rem"
        />
      </div>

      <SectionRule label="Advisory" />
      <AiPanel
        context="the OLX marketplace listings"
        payload={{
          scope: q ? `filtered by "${q}"` : "all listings",
          totals: { ...totals, contactRatePct: contactRate, listings: products.length },
          byCategory,
          topByViews: products
            .slice()
            .sort((a, b) => b.views - a.views)
            .slice(0, 15)
            .map((p) => ({
              name: p.name,
              category: p.category,
              price: p.price,
              views: p.views,
              favorites: p.favorites,
              phoneClicks: p.phoneClicks,
              contactRatePct: p.ctrPct,
            })),
        }}
      />
    </AppShell>
  );
}

function shorten(s: string, max = 30) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
