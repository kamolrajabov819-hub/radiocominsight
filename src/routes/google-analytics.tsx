import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Clock, Globe2, MapPin, MousePointerClick, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatTile } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { SectionRule, Note } from "@/components/panel";
import { DataTable, type Column } from "@/components/data-table";
import { HBarRanking, PartToWhole, SERIES } from "@/components/charts";
import { useData } from "@/lib/data-context";
import { useI18n, type Translate } from "@/lib/i18n";
import { fmtDuration, fmtInt, fmtPct, fmtRank, type Delta } from "@/lib/metrics";
import type { GaKeyword, GaMetric } from "@/lib/parsers";

export const Route = createFileRoute("/google-analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & SEO — Radiocom Insight" },
      {
        name: "description",
        content:
          "Site visits, engagement, domain rankings, keyword positions, search volume and traffic share for radiocom.uz.",
      },
      { property: "og:title", content: "Analytics & SEO — Radiocom Insight" },
      { property: "og:description", content: "Organic search analytics dashboard." },
    ],
  }),
  component: GAPage,
});

/**
 * Finds a metric row by a loose name match. The tab carries two measurement
 * sources ("ранги + визиты" and "поведение") which both report a bounce rate
 * and a pages-per-visit, so `sourceHint` disambiguates them.
 */
function pick(metrics: GaMetric[], needles: string[], sourceHint?: string): GaMetric | undefined {
  const pool = sourceHint
    ? metrics.filter((m) => m.source.toLowerCase().includes(sourceHint.toLowerCase()))
    : metrics;
  const search = pool.length ? pool : metrics;
  for (const n of needles) {
    const hit = search.find((m) => m.metric.toLowerCase() === n.toLowerCase());
    if (hit) return hit;
  }
  for (const n of needles) {
    const hit = search.find((m) => m.metric.toLowerCase().includes(n.toLowerCase()));
    if (hit) return hit;
  }
  return undefined;
}

/** "Источник 2 (поведение)" -> "поведение" for the tile sub-label. */
const sourceTag = (t: Translate, m?: GaMetric) => {
  if (!m) return undefined;
  const inner = m.source.match(/\(([^)]+)\)/)?.[1];
  return inner ? t("ga.source", { s: inner }) : m.source;
};

const asDelta = (m?: GaMetric): Delta => {
  if (m?.changePct == null) return null;
  const direction = m.changePct > 0 ? "up" : m.changePct < 0 ? "down" : "flat";
  return { pct: m.changePct, direction };
};

function GAPage() {
  const { data } = useData();
  const { t } = useI18n();
  const intentLabel = (code: string) => {
    const c = code.trim().toUpperCase();
    return c === "I" || c === "N" || c === "C" || c === "T" ? t(`ga.intent.${c}`) : c;
  };
  const { metrics, keywords } = data.ga;

  const totalVisits = pick(metrics, ["Total Visits"]);
  const visits = pick(metrics, ["Visits"], "поведение");
  const uniqueVisitors = pick(metrics, ["Unique Visitors"]);
  const bounce = pick(metrics, ["Bounce Rate"], "поведение");
  const bounceAlt = pick(metrics, ["Bounce Rate"], "ранги");
  const pagesPerVisit = pick(metrics, ["Pages / Visit", "Pages per Visit"], "поведение");
  const duration = pick(metrics, ["Avg. Visit Duration"]);
  const globalRank = pick(metrics, ["Global Rank"]);
  const countryRank = pick(metrics, ["Country Rank"]);
  const categoryRank = pick(metrics, ["Category Rank"]);

  /** The two "Сегмент N — доля визитов" rows are a part-to-whole split. */
  const segments = useMemo(
    () =>
      metrics
        .filter((m) => /сегмент/i.test(m.metric) && m.value !== null)
        .map((m, i) => ({
          name: m.metric,
          note: m.note,
          value: m.value as number,
          color: SERIES[i % SERIES.length],
        })),
    [metrics],
  );

  const topByVolume = useMemo(
    () =>
      [...keywords]
        .filter((k) => k.volume > 0)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10)
        .map((k) => ({
          // The same query is tracked at several positions, so the rank
          // keeps otherwise-identical bars apart.
          label: k.position != null ? `${k.keyword} (#${k.position})` : k.keyword,
          value: k.volume,
        })),
    [keywords],
  );

  const topByTraffic = useMemo(
    () =>
      [...keywords]
        .filter((k) => k.trafficSharePct > 0)
        .sort((a, b) => b.trafficSharePct - a.trafficSharePct)
        .slice(0, 10)
        .map((k) => ({
          label: k.position != null ? `${k.keyword} (#${k.position})` : k.keyword,
          value: k.trafficSharePct,
        })),
    [keywords],
  );

  /** A keyword can carry several intent codes ("I, N"); each one counts. */
  const intentMix = useMemo(() => {
    const counts = new Map<string, number>();
    keywords.forEach((k) => {
      k.intent
        .split(/[,;/]/)
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean)
        .forEach((code) => counts.set(code, (counts.get(code) ?? 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([code, count], i) => ({
        name: intentLabel(code),
        value: count,
        color: SERIES[i % SERIES.length],
      }));
  }, [keywords]);

  const ranked = keywords.filter((k) => k.position != null);
  const inTopTen = ranked.filter((k) => (k.position as number) <= 10).length;
  const avgPosition = ranked.length
    ? ranked.reduce((a, k) => a + (k.position as number), 0) / ranked.length
    : 0;

  const keywordColumns: Column<GaKeyword>[] = [
    {
      key: "keyword",
      header: t("ga.keyword"),
      cell: (k) => k.keyword,
      sortValue: (k) => k.keyword,
    },
    {
      key: "position",
      header: t("ga.position"),
      numeric: true,
      cell: (k) => (k.position != null ? String(k.position) : "—"),
      sortValue: (k) => k.position ?? 999,
    },
    {
      key: "volume",
      header: t("ga.volume"),
      numeric: true,
      cell: (k) => fmtInt(k.volume),
      sortValue: (k) => k.volume,
    },
    {
      key: "kd",
      header: t("ga.difficulty"),
      numeric: true,
      cell: (k) => (k.kd != null ? String(k.kd) : "—"),
      sortValue: (k) => k.kd ?? 0,
    },
    {
      key: "intent",
      header: t("ga.intent"),
      cell: (k) =>
        k.intent
          .split(/[,;/]/)
          .map((c) => intentLabel(c))
          .filter(Boolean)
          .join(", ") || "—",
      sortValue: (k) => k.intent,
    },
    {
      key: "cpc",
      header: t("ga.cpc"),
      numeric: true,
      cell: (k) => (k.cpc ? `$${k.cpc.toFixed(2)}` : "—"),
      sortValue: (k) => k.cpc,
    },
    {
      key: "traffic",
      header: t("ga.traffic"),
      numeric: true,
      cell: (k) => fmtInt(k.traffic),
      sortValue: (k) => k.traffic,
    },
    {
      key: "share",
      header: t("common.share"),
      numeric: true,
      cell: (k) => (k.trafficSharePct ? fmtPct(k.trafficSharePct, 1) : "—"),
      sortValue: (k) => k.trafficSharePct,
    },
    {
      key: "url",
      header: t("ga.landingPage"),
      cell: (k) =>
        k.url ? (
          <a
            href={k.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline-offset-2 hover:underline"
            title={k.url}
          >
            {k.url.replace(/^https?:\/\//, "").slice(0, 38)}
            {k.url.replace(/^https?:\/\//, "").length > 38 ? "…" : ""}
          </a>
        ) : (
          "—"
        ),
      sortValue: (k) => k.url,
    },
  ];

  const metricColumns: Column<GaMetric>[] = [
    { key: "source", header: t("shell.source"), cell: (m) => m.source, sortValue: (m) => m.source },
    {
      key: "metric",
      header: t("common.metric"),
      cell: (m) => m.metric,
      sortValue: (m) => m.metric,
    },
    {
      key: "value",
      header: t("common.value"),
      numeric: true,
      cell: (m) => m.display || m.raw || "—",
      sortValue: (m) => m.value ?? 0,
    },
    {
      key: "change",
      header: t("common.change"),
      numeric: true,
      cell: (m) => m.changeRaw || "—",
      sortValue: (m) => m.changePct ?? 0,
    },
    {
      key: "note",
      header: t("common.note"),
      cell: (m) => <span className="text-muted-foreground">{m.note || "—"}</span>,
      sortValue: (m) => m.note,
    },
  ];

  const sheets = [
    {
      name: "Site metrics",
      rows: [
        ["Source", "Metric", "Value", "Change", "Note"],
        ...metrics.map(
          (m) => [m.source, m.metric, m.raw, m.changeRaw, m.note] as (string | number)[],
        ),
      ],
    },
    {
      name: "Keywords",
      rows: [
        [
          "Keyword",
          "Position",
          "Volume",
          "Difficulty",
          "Intent",
          "CPC",
          "Traffic",
          "Traffic share %",
          "URL",
        ],
        ...keywords.map(
          (k) =>
            [
              k.keyword,
              k.position ?? "",
              k.volume,
              k.kd ?? "",
              k.intent,
              k.cpc,
              k.traffic,
              k.trafficSharePct,
              k.url,
            ] as (string | number)[],
        ),
      ],
    },
  ];

  return (
    <AppShell
      title={t("ga.title")}
      subtitle={t("ga.subtitle")}
      showFilter={false}
      actions={<ExportButton filename="radiocom-analytics-seo" sheets={sheets} />}
    >
      <SectionRule label={t("ga.siteEngagement")} note={t("ga.latestReading")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          accent
          label={t("ga.totalVisits")}
          value={totalVisits?.value != null ? fmtInt(totalVisits.value) : "—"}
          sub={sourceTag(t, totalVisits)}
          icon={Users}
        />
        <StatTile
          label={t("ga.visits")}
          value={visits?.value != null ? fmtInt(visits.value) : "—"}
          sub={sourceTag(t, visits)}
          icon={MousePointerClick}
          delta={asDelta(visits)}
          deltaSuffix={t("ga.reported")}
        />
        <StatTile
          label={t("ga.uniqueVisitors")}
          value={uniqueVisitors?.value != null ? fmtInt(uniqueVisitors.value) : "—"}
          sub={sourceTag(t, uniqueVisitors)}
          icon={Users}
          delta={asDelta(uniqueVisitors)}
          deltaSuffix={t("ga.reported")}
        />
        <StatTile
          label={t("ga.bounceRate")}
          value={bounce?.value != null ? fmtPct(bounce.value, 2) : "—"}
          sub={
            bounceAlt?.value != null && bounceAlt !== bounce
              ? t("ga.otherSource", { v: fmtPct(bounceAlt.value, 2) })
              : sourceTag(t, bounce)
          }
          lowerIsBetter
          delta={asDelta(bounce)}
          deltaSuffix={t("ga.reported")}
        />
        <StatTile
          label={t("ga.pagesPerVisit")}
          value={pagesPerVisit?.value != null ? pagesPerVisit.value.toFixed(2) : "—"}
          sub={sourceTag(t, pagesPerVisit)}
          delta={asDelta(pagesPerVisit)}
          deltaSuffix={t("ga.reported")}
        />
        <StatTile
          label={t("ga.avgDuration")}
          value={duration?.value != null ? fmtDuration(duration.value) : "—"}
          sub={sourceTag(t, duration)}
          icon={Clock}
          delta={asDelta(duration)}
          deltaSuffix={t("ga.reported")}
        />
      </div>

      <SectionRule label={t("ga.domainStanding")} note={t("ga.rankHint")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label={t("ga.globalRank")}
          value={globalRank?.value != null ? fmtRank(globalRank.value) : "—"}
          sub={globalRank?.changeRaw ? t("ga.moved", { v: globalRank.changeRaw }) : undefined}
          icon={Globe2}
        />
        <StatTile
          label={t("ga.countryRank")}
          value={countryRank?.value != null ? fmtRank(countryRank.value) : "—"}
          sub={countryRank?.changeRaw ? t("ga.moved", { v: countryRank.changeRaw }) : undefined}
          icon={MapPin}
        />
        <StatTile
          label={t("ga.categoryRank")}
          value={categoryRank?.value != null ? fmtRank(categoryRank.value) : "—"}
          sub={t("ga.categoryName")}
          icon={Search}
        />
      </div>

      <Note>
        The workbook records the size of each rank movement but not its direction, so these tiles
        show the magnitude only. Percentages under the engagement tiles are the changes written in
        the sheet, not quarter-over-quarter values computed here.
      </Note>

      <SectionRule label={t("ga.audienceIntent")} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          title={t("ga.segments")}
          hint={t("ga.segmentsHint")}
          legend={segments.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "segment", header: t("ga.segment") },
              { key: "share", header: t("common.share"), numeric: true },
              { key: "note", header: t("common.note") },
            ],
            rows: segments.map((s) => ({
              segment: s.name,
              share: fmtPct(s.value, 2),
              note: s.note || "—",
            })),
          }}
          empty={segments.length ? undefined : t("ga.noSegments")}
        >
          <PartToWhole
            data={segments}
            format={(v) => fmtPct(v, 2)}
            centerValue={segments.length ? fmtPct(segments[0].value, 1) : "—"}
            centerLabel={segments.length ? segments[0].name : undefined}
          />
        </ChartFrame>

        <ChartFrame
          title={t("ga.intentMix")}
          hint={t("ga.trackedQueries", { n: keywords.length })}
          legend={intentMix.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "intent", header: t("ga.intent") },
              { key: "count", header: t("ga.keywords"), numeric: true },
            ],
            rows: intentMix.map((s) => ({ intent: s.name, count: s.value })),
          }}
          empty={intentMix.length ? undefined : t("ga.noIntent")}
        >
          <PartToWhole
            data={intentMix}
            format={(v) => `${v} keyword${v === 1 ? "" : "s"}`}
            centerValue={String(keywords.length)}
            centerLabel={t("ga.keywords")}
          />
        </ChartFrame>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
          <StatTile label={t("ga.trackedKeywords")} value={fmtInt(keywords.length)} icon={Search} />
          <StatTile
            label={t("ga.inTopTen")}
            value={fmtInt(inTopTen)}
            sub={t("ga.ofRanked", { n: ranked.length })}
          />
          <StatTile
            label={t("ga.avgPosition")}
            value={avgPosition ? avgPosition.toFixed(1) : "—"}
            lowerIsBetter
          />
          <StatTile
            label={t("ga.combinedVolume")}
            value={fmtInt(keywords.reduce((a, k) => a + k.volume, 0))}
            sub={t("ga.combinedVolumeHint")}
          />
        </div>
      </div>

      <SectionRule label={t("ga.keywordPerformance")} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartFrame
          title={t("ga.topByVolume")}
          hint={t("ga.monthlySearches")}
          table={{
            columns: [
              { key: "keyword", header: t("ga.keyword") },
              { key: "volume", header: t("ga.volume"), numeric: true },
            ],
            rows: topByVolume.map((k) => ({ keyword: k.label, volume: fmtInt(k.value) })),
          }}
          empty={topByVolume.length ? undefined : t("ga.noVolume")}
        >
          <HBarRanking
            data={topByVolume}
            color={SERIES[1]}
            seriesName={t("ga.volume")}
            format={(v) => fmtInt(v)}
            labelWidth={200}
          />
        </ChartFrame>

        <ChartFrame
          title={t("ga.topByTraffic")}
          hint={t("ga.trafficShareHint")}
          table={{
            columns: [
              { key: "keyword", header: t("ga.keyword") },
              { key: "share", header: t("ga.trafficShare"), numeric: true },
            ],
            rows: topByTraffic.map((k) => ({ keyword: k.label, share: fmtPct(k.value, 1) })),
          }}
          empty={topByTraffic.length ? undefined : t("ga.noTrafficShare")}
        >
          <HBarRanking
            data={topByTraffic}
            color={SERIES[2]}
            seriesName={t("ga.trafficShare")}
            format={(v) => fmtPct(v, 1)}
            labelWidth={200}
          />
        </ChartFrame>
      </div>

      <SectionRule label={t("ga.everyQuery")} note={t("ga.keywordCount", { n: keywords.length })} />
      <div className="border border-border bg-surface">
        <DataTable
          columns={keywordColumns}
          rows={keywords}
          initialSort={{ key: "volume", dir: "desc" }}
          maxHeight="32rem"
        />
      </div>

      <SectionRule label={t("ga.rawMetrics")} note={t("ga.rawCount", { n: metrics.length })} />
      <div className="border border-border bg-surface">
        <DataTable columns={metricColumns} rows={metrics} maxHeight="26rem" />
      </div>
    </AppShell>
  );
}
