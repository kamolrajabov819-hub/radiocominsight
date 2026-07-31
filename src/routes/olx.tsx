import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Heart, PhoneCall, ShoppingBag, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatTile } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { SectionRule, Note } from "@/components/panel";
import { DataTable, type Column } from "@/components/data-table";
import { FunnelSteps, HBarRanking, PartToWhole, SERIES, StageBars } from "@/components/charts";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/data-context";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  /** The parser emits an English placeholder for blank categories. */
  const catLabel = (c: string) => (c === "Uncategorised" ? t("olx.uncategorised") : c);
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
      .map(([category, v]) => ({ category: catLabel(category), ...v }))
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
        name: t("olx.other", { n: tail.length }),
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
    { label: t("olx.views"), value: totals.views },
    { label: t("olx.favourites"), value: totals.favorites },
    { label: t("olx.phoneClicks"), value: totals.calls },
  ];

  const columns: Column<OlxProduct>[] = [
    {
      key: "name",
      header: t("olx.listing"),
      cell: (p) => <span title={p.name}>{shorten(p.name, 48)}</span>,
      sortValue: (p) => p.name,
    },
    {
      key: "category",
      header: t("olx.category"),
      cell: (p) => <span className="text-muted-foreground">{catLabel(p.category)}</span>,
      sortValue: (p) => p.category,
    },
    {
      key: "price",
      header: t("olx.price"),
      numeric: true,
      cell: (p) => fmtSom(p.price),
      sortValue: (p) => p.price,
    },
    {
      key: "views",
      header: t("olx.views"),
      numeric: true,
      cell: (p) => fmtInt(p.views),
      sortValue: (p) => p.views,
    },
    {
      key: "favorites",
      header: t("olx.favourites"),
      numeric: true,
      cell: (p) => fmtInt(p.favorites),
      sortValue: (p) => p.favorites,
    },
    {
      key: "calls",
      header: t("olx.phoneClicks"),
      numeric: true,
      cell: (p) => fmtInt(p.phoneClicks),
      sortValue: (p) => p.phoneClicks,
    },
    {
      key: "ctr",
      header: t("olx.contactRate"),
      numeric: true,
      cell: (p) => (p.ctrPct ? fmtPct(p.ctrPct, 1) : "—"),
      sortValue: (p) => p.ctrPct,
    },
    {
      key: "adId",
      header: t("olx.adId"),
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
      title={t("olx.title")}
      subtitle={t("olx.subtitle")}
      showFilter={false}
      actions={<ExportButton filename="radiocom-olx" sheets={sheets} />}
    >
      <SectionRule
        label={t("olx.totals")}
        note={q ? t("olx.filteredBy", { q }) : t("olx.allListings")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          accent
          label={t("olx.listings")}
          value={fmtInt(products.length)}
          icon={ShoppingBag}
        />
        <StatTile
          label={t("olx.views")}
          value={fmtCompact(totals.views)}
          sub={fmtInt(totals.views)}
          icon={Eye}
        />
        <StatTile label={t("olx.favourites")} value={fmtInt(totals.favorites)} icon={Heart} />
        <StatTile label={t("olx.phoneClicks")} value={fmtInt(totals.calls)} icon={PhoneCall} />
        <StatTile
          label={t("olx.contactRate")}
          value={fmtPct(contactRate, 2)}
          sub={t("olx.contactRateHint")}
          icon={Target}
        />
        <StatTile
          label={t("olx.catalogueValue")}
          value={fmtCompact(totals.value)}
          sub={t("olx.catalogueValueHint")}
        />
      </div>

      <Note>{t("olx.lifetimeNote")}</Note>

      <SectionRule label={t("olx.attention")} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title={t("olx.mostViewed")}
          hint={t("olx.mostViewedHint")}
          table={{
            columns: [
              { key: "listing", header: t("olx.listing") },
              { key: "views", header: t("olx.views"), numeric: true },
            ],
            rows: topByViews.map((p) => ({ listing: p.label, views: fmtInt(p.value) })),
          }}
          empty={topByViews.length ? undefined : t("olx.noMatch")}
        >
          <HBarRanking
            data={topByViews}
            color={SERIES[2]}
            seriesName={t("olx.views")}
            format={(v) => fmtInt(v)}
            labelWidth={230}
          />
        </ChartFrame>

        <ChartFrame
          title={t("olx.viewsByCategory")}
          hint={
            byCategory.length === 1
              ? t("olx.categoryOne")
              : t("olx.categories", { n: byCategory.length })
          }
          legend={categorySlices.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "category", header: t("olx.category") },
              { key: "listings", header: t("olx.listings"), numeric: true },
              { key: "views", header: t("olx.views"), numeric: true },
              { key: "calls", header: t("olx.phoneClicks"), numeric: true },
              { key: "rate", header: t("olx.contactRate"), numeric: true },
            ],
            rows: byCategory.map((c) => ({
              category: c.category,
              listings: c.count,
              views: fmtInt(c.views),
              calls: fmtInt(c.calls),
              rate: fmtPct(c.views ? (c.calls / c.views) * 100 : 0, 1),
            })),
          }}
          empty={categorySlices.length ? undefined : t("olx.noViews")}
        >
          <PartToWhole
            data={categorySlices}
            format={(v) => fmtInt(v)}
            centerValue={fmtCompact(totals.views)}
            centerLabel={t("olx.views")}
          />
        </ChartFrame>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          className="xl:col-span-2"
          title={t("olx.mostContacted")}
          hint={t("olx.mostContactedHint")}
          table={{
            columns: [
              { key: "listing", header: t("olx.listing") },
              { key: "calls", header: t("olx.phoneClicks"), numeric: true },
            ],
            rows: topByCalls.map((p) => ({ listing: p.label, calls: fmtInt(p.value) })),
          }}
          empty={topByCalls.length ? undefined : t("olx.noMatch")}
        >
          <HBarRanking
            data={topByCalls}
            color={SERIES[0]}
            seriesName={t("olx.phoneClicks")}
            format={(v) => fmtInt(v)}
            labelWidth={230}
          />
        </ChartFrame>

        <ChartFrame
          title={t("olx.engagementPerView")}
          hint={t("olx.engagementPerViewHint")}
          note={t("olx.engagementPerViewNote")}
          table={{
            columns: [
              { key: "stage", header: t("common.stage") },
              { key: "value", header: t("common.count"), numeric: true },
              { key: "rate", header: t("olx.fromViews"), numeric: true },
            ],
            rows: funnel.map((f, i) => ({
              stage: f.label,
              value: fmtInt(f.value),
              rate: i === 0 || !totals.views ? "—" : fmtPct((f.value / totals.views) * 100, 2),
            })),
          }}
          empty={totals.views ? undefined : t("olx.noViews")}
        >
          <FunnelSteps data={funnel} format={(v) => fmtInt(v)} relativeTo="first" />
        </ChartFrame>
      </div>

      <div className="mt-3">
        <ChartFrame
          title={t("olx.spread")}
          hint={t("olx.spreadHint")}
          note={t("olx.spreadNote")}
          table={{
            columns: [
              { key: "band", header: t("olx.band") },
              { key: "count", header: t("olx.listings"), numeric: true },
            ],
            rows: ctrBands.map((b) => ({ band: b.label, count: b.value })),
          }}
          empty={products.length ? undefined : t("olx.noMatch")}
        >
          <StageBars data={ctrBands} format={(v) => fmtInt(v)} height={220} />
        </ChartFrame>
      </div>

      <SectionRule
        label={t("olx.everyListing")}
        note={t("common.nOfTotal", { n: products.length, total: data.olx.length })}
      />
      <div className="border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-[0.9375rem] font-bold">{t("olx.breakdown")}</h2>
          <Input
            placeholder={t("olx.search")}
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
    </AppShell>
  );
}

function shorten(s: string, max = 30) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
