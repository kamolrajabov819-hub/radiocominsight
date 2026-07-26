import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Clock, Globe2, MapPin, MousePointerClick, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatTile } from "@/components/stat";
import { ExportButton } from "@/components/export-button";
import { ChartFrame } from "@/components/chart-frame";
import { SectionRule, Note } from "@/components/panel";
import { DataTable, type Column } from "@/components/data-table";
import { AiPanel } from "@/components/ai-panel";
import { HBarRanking, PartToWhole, SERIES } from "@/components/charts";
import { useData } from "@/lib/data-context";
import { fmtDuration, fmtInt, fmtPct, fmtRank, type Delta } from "@/lib/metrics";
import { GA_INTENT_LABELS, type GaKeyword, type GaMetric } from "@/lib/parsers";

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
const sourceTag = (m?: GaMetric) => {
  const inner = m?.source.match(/\(([^)]+)\)/)?.[1];
  return inner ? `Source: ${inner}` : m?.source;
};

const asDelta = (m?: GaMetric): Delta => {
  if (m?.changePct == null) return null;
  const direction = m.changePct > 0 ? "up" : m.changePct < 0 ? "down" : "flat";
  return { pct: m.changePct, direction };
};

function GAPage() {
  const { data } = useData();
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
        name: GA_INTENT_LABELS[code] ?? code,
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
    { key: "keyword", header: "Keyword", cell: (k) => k.keyword, sortValue: (k) => k.keyword },
    {
      key: "position",
      header: "Position",
      numeric: true,
      cell: (k) => (k.position != null ? String(k.position) : "—"),
      sortValue: (k) => k.position ?? 999,
    },
    {
      key: "volume",
      header: "Volume",
      numeric: true,
      cell: (k) => fmtInt(k.volume),
      sortValue: (k) => k.volume,
    },
    {
      key: "kd",
      header: "Difficulty",
      numeric: true,
      cell: (k) => (k.kd != null ? String(k.kd) : "—"),
      sortValue: (k) => k.kd ?? 0,
    },
    {
      key: "intent",
      header: "Intent",
      cell: (k) =>
        k.intent
          .split(/[,;/]/)
          .map((c) => GA_INTENT_LABELS[c.trim().toUpperCase()] ?? c.trim())
          .filter(Boolean)
          .join(", ") || "—",
      sortValue: (k) => k.intent,
    },
    {
      key: "cpc",
      header: "CPC",
      numeric: true,
      cell: (k) => (k.cpc ? `$${k.cpc.toFixed(2)}` : "—"),
      sortValue: (k) => k.cpc,
    },
    {
      key: "traffic",
      header: "Traffic",
      numeric: true,
      cell: (k) => fmtInt(k.traffic),
      sortValue: (k) => k.traffic,
    },
    {
      key: "share",
      header: "Share",
      numeric: true,
      cell: (k) => (k.trafficSharePct ? fmtPct(k.trafficSharePct, 1) : "—"),
      sortValue: (k) => k.trafficSharePct,
    },
    {
      key: "url",
      header: "Landing page",
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
    { key: "source", header: "Source", cell: (m) => m.source, sortValue: (m) => m.source },
    { key: "metric", header: "Metric", cell: (m) => m.metric, sortValue: (m) => m.metric },
    {
      key: "value",
      header: "Value",
      numeric: true,
      cell: (m) => m.display || m.raw || "—",
      sortValue: (m) => m.value ?? 0,
    },
    {
      key: "change",
      header: "Change",
      numeric: true,
      cell: (m) => m.changeRaw || "—",
      sortValue: (m) => m.changePct ?? 0,
    },
    {
      key: "note",
      header: "Note",
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
      title="Analytics & SEO"
      subtitle="radiocom.uz organic performance"
      showFilter={false}
      actions={<ExportButton filename="radiocom-analytics-seo" sheets={sheets} />}
    >
      <SectionRule label="Site engagement" note="Latest reading in the workbook" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          accent
          label="Total visits"
          value={totalVisits?.value != null ? fmtInt(totalVisits.value) : "—"}
          sub={sourceTag(totalVisits)}
          icon={Users}
        />
        <StatTile
          label="Visits"
          value={visits?.value != null ? fmtInt(visits.value) : "—"}
          sub={sourceTag(visits)}
          icon={MousePointerClick}
          delta={asDelta(visits)}
          deltaSuffix="reported"
        />
        <StatTile
          label="Unique visitors"
          value={uniqueVisitors?.value != null ? fmtInt(uniqueVisitors.value) : "—"}
          sub={sourceTag(uniqueVisitors)}
          icon={Users}
          delta={asDelta(uniqueVisitors)}
          deltaSuffix="reported"
        />
        <StatTile
          label="Bounce rate"
          value={bounce?.value != null ? fmtPct(bounce.value, 2) : "—"}
          sub={
            bounceAlt?.value != null && bounceAlt !== bounce
              ? `${fmtPct(bounceAlt.value, 2)} on the other source`
              : sourceTag(bounce)
          }
          lowerIsBetter
          delta={asDelta(bounce)}
          deltaSuffix="reported"
        />
        <StatTile
          label="Pages per visit"
          value={pagesPerVisit?.value != null ? pagesPerVisit.value.toFixed(2) : "—"}
          sub={sourceTag(pagesPerVisit)}
          delta={asDelta(pagesPerVisit)}
          deltaSuffix="reported"
        />
        <StatTile
          label="Avg. visit duration"
          value={duration?.value != null ? fmtDuration(duration.value) : "—"}
          sub={sourceTag(duration)}
          icon={Clock}
          delta={asDelta(duration)}
          deltaSuffix="reported"
        />
      </div>

      <SectionRule label="Domain standing" note="Lower is better on all three ranks" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Global rank"
          value={globalRank?.value != null ? fmtRank(globalRank.value) : "—"}
          sub={globalRank?.changeRaw ? `moved ${globalRank.changeRaw}` : undefined}
          icon={Globe2}
        />
        <StatTile
          label="Country rank — Uzbekistan"
          value={countryRank?.value != null ? fmtRank(countryRank.value) : "—"}
          sub={countryRank?.changeRaw ? `moved ${countryRank.changeRaw}` : undefined}
          icon={MapPin}
        />
        <StatTile
          label="Category rank"
          value={categoryRank?.value != null ? fmtRank(categoryRank.value) : "—"}
          sub="Computers, electronics & technology"
          icon={Search}
        />
      </div>

      <Note>
        The workbook records the size of each rank movement but not its direction, so these tiles
        show the magnitude only. Percentages under the engagement tiles are the changes written in
        the sheet, not quarter-over-quarter values computed here.
      </Note>

      <SectionRule label="Audience split & keyword intent" />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartFrame
          title="Visit segments"
          hint="Share of visits, as recorded in the sheet"
          legend={segments.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "segment", header: "Segment" },
              { key: "share", header: "Share", numeric: true },
              { key: "note", header: "Note" },
            ],
            rows: segments.map((s) => ({
              segment: s.name,
              share: fmtPct(s.value, 2),
              note: s.note || "—",
            })),
          }}
          empty={segments.length ? undefined : "No visit segments recorded."}
        >
          <PartToWhole
            data={segments}
            format={(v) => fmtPct(v, 2)}
            centerValue={segments.length ? fmtPct(segments[0].value, 1) : "—"}
            centerLabel={segments.length ? segments[0].name : undefined}
          />
        </ChartFrame>

        <ChartFrame
          title="Keyword intent mix"
          hint={`${keywords.length} tracked queries`}
          legend={intentMix.map((s) => ({ label: s.name, color: s.color }))}
          table={{
            columns: [
              { key: "intent", header: "Intent" },
              { key: "count", header: "Keywords", numeric: true },
            ],
            rows: intentMix.map((s) => ({ intent: s.name, count: s.value })),
          }}
          empty={intentMix.length ? undefined : "No intent codes recorded."}
        >
          <PartToWhole
            data={intentMix}
            format={(v) => `${v} keyword${v === 1 ? "" : "s"}`}
            centerValue={String(keywords.length)}
            centerLabel="Keywords"
          />
        </ChartFrame>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
          <StatTile label="Tracked keywords" value={fmtInt(keywords.length)} icon={Search} />
          <StatTile
            label="Ranking in top 10"
            value={fmtInt(inTopTen)}
            sub={`of ${ranked.length} ranked`}
          />
          <StatTile
            label="Average position"
            value={avgPosition ? avgPosition.toFixed(1) : "—"}
            lowerIsBetter
          />
          <StatTile
            label="Combined search volume"
            value={fmtInt(keywords.reduce((a, k) => a + k.volume, 0))}
            sub="Monthly, across tracked queries"
          />
        </div>
      </div>

      <SectionRule label="Keyword performance" />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartFrame
          title="Top keywords by search volume"
          hint="Monthly searches"
          table={{
            columns: [
              { key: "keyword", header: "Keyword" },
              { key: "volume", header: "Volume", numeric: true },
            ],
            rows: topByVolume.map((k) => ({ keyword: k.label, volume: fmtInt(k.value) })),
          }}
          empty={topByVolume.length ? undefined : "No search volume recorded."}
        >
          <HBarRanking
            data={topByVolume}
            color={SERIES[1]}
            seriesName="Search volume"
            format={(v) => fmtInt(v)}
            labelWidth={200}
          />
        </ChartFrame>

        <ChartFrame
          title="Top keywords by traffic share"
          hint="Share of organic traffic reaching the site"
          table={{
            columns: [
              { key: "keyword", header: "Keyword" },
              { key: "share", header: "Traffic share", numeric: true },
            ],
            rows: topByTraffic.map((k) => ({ keyword: k.label, share: fmtPct(k.value, 1) })),
          }}
          empty={topByTraffic.length ? undefined : "No traffic share recorded."}
        >
          <HBarRanking
            data={topByTraffic}
            color={SERIES[2]}
            seriesName="Traffic share"
            format={(v) => fmtPct(v, 1)}
            labelWidth={200}
          />
        </ChartFrame>
      </div>

      <SectionRule label="Every tracked query" note={`${keywords.length} keyword(s)`} />
      <div className="border border-border bg-surface">
        <DataTable
          columns={keywordColumns}
          rows={keywords}
          initialSort={{ key: "volume", dir: "desc" }}
          maxHeight="32rem"
        />
      </div>

      <SectionRule label="Raw site metrics" note={`${metrics.length} row(s) from the workbook`} />
      <div className="border border-border bg-surface">
        <DataTable columns={metricColumns} rows={metrics} maxHeight="26rem" />
      </div>

      <SectionRule label="Advisory" />
      <AiPanel
        context="organic search and site analytics"
        payload={{
          siteMetrics: metrics.map((m) => ({
            source: m.source,
            metric: m.metric,
            value: m.raw,
            change: m.changeRaw,
          })),
          keywordSummary: {
            tracked: keywords.length,
            inTopTen,
            averagePosition: avgPosition,
            combinedVolume: keywords.reduce((a, k) => a + k.volume, 0),
          },
          topKeywords: keywords
            .slice()
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 15)
            .map((k) => ({
              keyword: k.keyword,
              position: k.position,
              volume: k.volume,
              difficulty: k.kd,
              trafficSharePct: k.trafficSharePct,
            })),
        }}
      />
    </AppShell>
  );
}
