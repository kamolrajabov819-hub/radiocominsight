import type { MetaRow, GoogleAdsRow, OrganicPeriod } from "./parsers";

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
      postEngagement: a.postEngagement + r.postEngagement,
      messagingConversations: a.messagingConversations + r.messagingConversations,
    }),
    {
      clicks: 0, impressions: 0, reach: 0, spend: 0, leads: 0,
      pageLikes: 0, contentViews: 0, postEngagement: 0, messagingConversations: 0,
    },
  );
}

export function sumGoogle(rows: GoogleAdsRow[]) {
  return rows.reduce(
    (a, r) => ({
      impressions: a.impressions + r.impressions,
      clicks: a.clicks + r.clicks,
      cost: a.cost + r.cost,
      conversions: a.conversions + r.conversions,
      phoneCalls: a.phoneCalls + r.phoneCalls,
      interactions: a.interactions + r.interactions,
      videoViews: a.videoViews + r.videoViews,
      engagements: a.engagements + r.engagements,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, phoneCalls: 0, interactions: 0, videoViews: 0, engagements: 0 },
  );
}

export const cpl = (spend: number, leads: number) => (leads > 0 ? spend / leads : 0);
export const ctr = (clicks: number, impressions: number) =>
  impressions > 0 ? (clicks / impressions) * 100 : 0;
export const cpc = (spend: number, clicks: number) => (clicks > 0 ? spend / clicks : 0);
export const cpm = (spend: number, impressions: number) =>
  impressions > 0 ? (spend / impressions) * 1000 : 0;

export function filterByPeriod<T extends { dateStart: string; dateStop: string }>(
  rows: T[],
  period: { start: string; stop: string } | null,
): T[] {
  if (!period) return rows;
  return rows.filter((r) => r.dateStart === period.start && r.dateStop === period.stop);
}

export function filterOrganicByPeriod(
  periods: OrganicPeriod[],
  period: { start: string; stop: string } | null,
): OrganicPeriod[] {
  if (!period) return periods;
  return periods.filter((p) => p.dateStart === period.start && p.dateStop === period.stop);
}

export const fmtInt = (n: number) =>
  Number.isFinite(n) ? new Intl.NumberFormat("en-US").format(Math.round(n)) : "—";
export const fmtMoney = (n: number, currency = "USD") =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n)
    : "—";
export const fmtPct = (n: number, digits = 2) =>
  Number.isFinite(n) ? `${n.toFixed(digits)}%` : "—";
export const fmtDecimal = (n: number, digits = 2) =>
  Number.isFinite(n) ? n.toFixed(digits) : "—";
