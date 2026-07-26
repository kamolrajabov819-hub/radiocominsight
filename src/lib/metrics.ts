import { isSnapshotMetric, type GoogleAdsRow, type MetaRow, type OrganicPeriod } from "./parsers";

/* ------------------------------------------------------------------ *
 * Aggregation
 * ------------------------------------------------------------------ */

export type MetaTotals = ReturnType<typeof sumMeta>;
export type GoogleTotals = ReturnType<typeof sumGoogle>;

export function sumMeta(rows: MetaRow[]) {
  return rows.reduce(
    (a, r) => ({
      clicks: a.clicks + r.clicks,
      impressions: a.impressions + r.impressions,
      reach: a.reach + r.reach,
      spend: a.spend + r.spend,
      leads: a.leads + r.leads,
      pageLikes: a.pageLikes + r.pageLikes,
      contentViews: a.contentViews + r.contentViews,
      videoWatches25: a.videoWatches25 + r.videoWatches25,
      videoWatches50: a.videoWatches50 + r.videoWatches50,
      videoWatches75: a.videoWatches75 + r.videoWatches75,
      videoWatches100: a.videoWatches100 + r.videoWatches100,
      postEngagement: a.postEngagement + r.postEngagement,
      messagingConversations: a.messagingConversations + r.messagingConversations,
    }),
    {
      clicks: 0,
      impressions: 0,
      reach: 0,
      spend: 0,
      leads: 0,
      pageLikes: 0,
      contentViews: 0,
      videoWatches25: 0,
      videoWatches50: 0,
      videoWatches75: 0,
      videoWatches100: 0,
      postEngagement: 0,
      messagingConversations: 0,
    },
  );
}

export function sumGoogle(rows: GoogleAdsRow[]) {
  const totals = rows.reduce(
    (a, r) => ({
      impressions: a.impressions + r.impressions,
      clicks: a.clicks + r.clicks,
      cost: a.cost + r.cost,
      conversions: a.conversions + r.conversions,
      phoneCalls: a.phoneCalls + r.phoneCalls,
      interactions: a.interactions + r.interactions,
      videoViews: a.videoViews + r.videoViews,
      engagements: a.engagements + r.engagements,
      searchImpressions: a.searchImpressions + (r.network === "Search" ? r.impressions : 0),
      weightedSis:
        a.weightedSis + (r.network === "Search" ? r.searchImpressionSharePct * r.impressions : 0),
    }),
    {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      phoneCalls: 0,
      interactions: 0,
      videoViews: 0,
      engagements: 0,
      searchImpressions: 0,
      weightedSis: 0,
    },
  );
  return {
    ...totals,
    /** Impression-weighted, so quarters with two search rows stay honest. */
    searchImpressionSharePct:
      totals.searchImpressions > 0 ? totals.weightedSis / totals.searchImpressions : 0,
  };
}

/**
 * Organic tabs mix flow metrics (reach, views) with point-in-time readings
 * (follower counts). Flow metrics sum; snapshots take the latest period.
 */
export function sumOrganic(periods: OrganicPeriod[]): Record<string, number> {
  const totals: Record<string, number> = {};
  periods.forEach((p) => {
    for (const [k, v] of Object.entries(p.metrics)) {
      totals[k] = isSnapshotMetric(k) ? v : (totals[k] ?? 0) + v;
    }
  });
  return totals;
}

export function organicMetricKeys(periods: OrganicPeriod[]): string[] {
  const seen = new Set<string>();
  periods.forEach((p) => Object.keys(p.metrics).forEach((k) => seen.add(k)));
  return Array.from(seen);
}

/* ------------------------------------------------------------------ *
 * Derived rates
 * ------------------------------------------------------------------ */

export const cpl = (spend: number, leads: number) => (leads > 0 ? spend / leads : 0);
export const ctr = (clicks: number, impressions: number) =>
  impressions > 0 ? (clicks / impressions) * 100 : 0;
export const cpc = (spend: number, clicks: number) => (clicks > 0 ? spend / clicks : 0);
export const cpm = (spend: number, impressions: number) =>
  impressions > 0 ? (spend / impressions) * 1000 : 0;
export const frequency = (impressions: number, reach: number) =>
  reach > 0 ? impressions / reach : 0;

/* ------------------------------------------------------------------ *
 * Period slicing
 * ------------------------------------------------------------------ */

export function filterByQuarter<T extends { quarter: string }>(
  rows: T[],
  quarterKey: string | null,
): T[] {
  if (!quarterKey) return rows;
  return rows.filter((r) => r.quarter === quarterKey);
}

/** Kept for the MCP tools, which still address periods by explicit dates. */
export function filterByPeriod<T extends { dateStart: string; dateStop: string }>(
  rows: T[],
  period: { start: string; stop: string } | null,
): T[] {
  if (!period) return rows;
  return rows.filter((r) => r.dateStart >= period.start && r.dateStart <= period.stop);
}

/** `2026-Q1` -> `2025-Q4`. */
export function previousQuarterKey(key: string | null): string | null {
  if (!key) return null;
  const [y, q] = key.split("-Q").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(q)) return null;
  return q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`;
}

export type Delta = { pct: number; direction: "up" | "down" | "flat" } | null;

/**
 * Quarter-over-quarter change. `lowerIsBetter` only affects how a caller
 * colours the chip, so it is left to the component.
 */
export function delta(current: number, previous: number | null | undefined): Delta {
  if (previous === null || previous === undefined || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(pct)) return null;
  if (Math.abs(pct) < 0.05) return { pct: 0, direction: "flat" };
  return { pct, direction: pct > 0 ? "up" : "down" };
}

/** Per-quarter series for sparklines: one point per quarter, oldest first. */
export function seriesByQuarter<T extends { quarter: string }>(
  rows: T[],
  quarters: { key: string; short: string }[],
  value: (slice: T[]) => number,
): { quarter: string; label: string; value: number }[] {
  return quarters.map((q) => ({
    quarter: q.key,
    label: q.short,
    value: value(rows.filter((r) => r.quarter === q.key)),
  }));
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

const intFmt = new Intl.NumberFormat("en-US");
const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const fmtInt = (n: number) => (Number.isFinite(n) ? intFmt.format(Math.round(n)) : "—");

export const fmtCompact = (n: number) =>
  Number.isFinite(n)
    ? Math.abs(n) < 1000
      ? intFmt.format(Math.round(n))
      : compactFmt.format(n)
    : "—";

export const fmtMoney = (n: number, currency = "USD") =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: Math.abs(n) > 0 && Math.abs(n) < 1 ? 3 : 2,
      }).format(n)
    : "—";

export const fmtPct = (n: number, digits = 2) =>
  Number.isFinite(n) ? `${n.toFixed(digits)}%` : "—";

export const fmtDecimal = (n: number, digits = 2) => (Number.isFinite(n) ? n.toFixed(digits) : "—");

export const fmtRank = (n: number) =>
  Number.isFinite(n) ? `#${intFmt.format(Math.round(n))}` : "—";

/** 6.5 -> "6m 30s" */
export const fmtDuration = (minutes: number) => {
  if (!Number.isFinite(minutes)) return "—";
  const whole = Math.floor(minutes);
  const secs = Math.round((minutes - whole) * 60);
  return secs ? `${whole}m ${secs}s` : `${whole}m`;
};

export const fmtSigned = (n: number, digits = 1) =>
  Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(digits)}%` : "—";

/** Uzbek som prices come through as plain integers. */
export const fmtSom = (n: number) =>
  Number.isFinite(n) && n > 0 ? `${intFmt.format(Math.round(n))} so'm` : "—";
