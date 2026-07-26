import type { Cell, SheetRows, TabName } from "./sheets.functions";

function toNum(v: Cell | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[,\s%$]/g, "").replace(/\u00a0/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function toStr(v: Cell | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function isDate(v: Cell | undefined): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export type MetaRow = {
  dateStart: string;
  dateStop: string;
  clicks: number;
  impressions: number;
  reach: number;
  spend: number;
  leads: number;
  pageLikes: number;
  contentViews: number;
  postEngagement: number;
  messagingConversations: number;
};

export function parseMetaAds(rows: SheetRows): MetaRow[] {
  const out: MetaRow[] = [];
  for (const r of rows) {
    if (!r || !isDate(r[0])) continue;
    out.push({
      dateStart: toStr(r[0]),
      dateStop: toStr(r[1]),
      clicks: toNum(r[2]),
      impressions: toNum(r[3]),
      reach: toNum(r[4]),
      spend: toNum(r[5]),
      leads: toNum(r[6]),
      pageLikes: toNum(r[8]),
      contentViews: toNum(r[9]),
      postEngagement: toNum(r[17]),
      messagingConversations: toNum(r[18]),
    });
  }
  return out;
}

export type GoogleAdsRow = {
  dateStart: string;
  dateStop: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  phoneCalls: number;
  interactions: number;
  searchImpressionShare: number;
  videoViews: number;
  engagements: number;
};

export function parseGoogleAds(rows: SheetRows): GoogleAdsRow[] {
  const out: GoogleAdsRow[] = [];
  for (const r of rows) {
    if (!r || !isDate(r[0])) continue;
    out.push({
      dateStart: toStr(r[0]),
      dateStop: toStr(r[1]),
      impressions: toNum(r[2]),
      clicks: toNum(r[3]),
      cost: toNum(r[4]),
      conversions: toNum(r[5]),
      phoneCalls: toNum(r[6]),
      interactions: toNum(r[7]),
      searchImpressionShare: toNum(r[8]),
      videoViews: toNum(r[9]),
      engagements: toNum(r[13]),
    });
  }
  return out;
}

export type OrganicPeriod = {
  label: string;
  dateStart: string;
  dateStop: string;
  metrics: Record<string, number>;
};

function parseOrganicHeader(v: Cell): { label: string; start: string; stop: string } | null {
  const s = toStr(v);
  const m = s.match(/Start date (\d{4}-\d{2}-\d{2})[\s\S]*End date (\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  return { label: `${m[1]} – ${m[2]}`, start: m[1], stop: m[2] };
}

export function parseOrganic(rows: SheetRows): OrganicPeriod[] {
  if (!rows.length) return [];
  const header = rows[0];
  const periods: OrganicPeriod[] = [];
  const blockStarts: number[] = [];
  for (let i = 0; i < header.length; i += 3) {
    const h = parseOrganicHeader(header[i]);
    if (h) {
      periods.push({ label: h.label, dateStart: h.start, dateStop: h.stop, metrics: {} });
      blockStarts.push(i);
    }
  }
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    blockStarts.forEach((col, idx) => {
      const label = toStr(row[col]);
      if (!label) return;
      const value = toNum(row[col + 1]);
      periods[idx].metrics[label] = value;
    });
  }
  return periods;
}

export type OlxProduct = {
  name: string;
  category: string;
  price: number;
  adId: string;
  views: number;
  favorites: number;
  phoneClicks: number;
  extra: number;
  ctr: number;
};

export function parseOlx(rows: SheetRows): OlxProduct[] {
  return rows
    .filter((r) => r && toStr(r[0]).length > 0)
    .map((r) => ({
      name: toStr(r[0]),
      category: toStr(r[1]),
      price: toNum(r[2]),
      adId: toStr(r[3]),
      views: toNum(r[4]),
      favorites: toNum(r[5]),
      phoneClicks: toNum(r[6]),
      extra: toNum(r[7]),
      ctr: toNum(r[8]),
    }));
}

export type GaRankRow = {
  source: string;
  metric: string;
  value: string;
  change: string;
  note: string;
  display: string;
};
export type GaKeywordRow = {
  keyword: string;
  kd: string;
  position: string;
  volume: string;
  intent: string;
  cpc: string;
  url: string;
  traffic: string;
  trafficShare: string;
};

export function parseGoogleAnalytics(rows: SheetRows): {
  ranks: GaRankRow[];
  keywords: GaKeywordRow[];
} {
  const ranks: GaRankRow[] = [];
  const keywords: GaKeywordRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (toStr(r[0])) {
      ranks.push({
        source: toStr(r[0]),
        metric: toStr(r[1]),
        value: toStr(r[2]),
        change: toStr(r[3]),
        note: toStr(r[4]),
        display: toStr(r[5]),
      });
    }
    if (toStr(r[7]) && toStr(r[7]) !== "Ключевое слово") {
      keywords.push({
        keyword: toStr(r[7]),
        kd: toStr(r[8]),
        position: toStr(r[9]),
        volume: toStr(r[10]),
        intent: toStr(r[11]),
        cpc: toStr(r[14]),
        url: toStr(r[15]),
        traffic: toStr(r[16]),
        trafficShare: toStr(r[17]),
      });
    }
  }
  return { ranks, keywords };
}

export function detectPeriods(meta: MetaRow[], google: GoogleAdsRow[]): {
  label: string;
  start: string;
  stop: string;
}[] {
  const set = new Map<string, { label: string; start: string; stop: string }>();
  const add = (start: string, stop: string) => {
    if (!start || !stop) return;
    const key = `${start}|${stop}`;
    if (!set.has(key)) {
      set.set(key, { label: quarterLabel(start, stop), start, stop });
    }
  };
  meta.forEach((r) => add(r.dateStart, r.dateStop));
  google.forEach((r) => add(r.dateStart, r.dateStop));
  return Array.from(set.values()).sort((a, b) => a.start.localeCompare(b.start));
}

export function quarterLabel(start: string, stop: string): string {
  const [y, m] = start.split("-");
  const month = Number(m);
  const q = Math.floor((month - 1) / 3) + 1;
  const [y2, m2] = stop.split("-");
  if (y === y2 && Math.floor((Number(m2) - 1) / 3) + 1 === q) {
    return `Q${q} ${y}`;
  }
  return `${start} – ${stop}`;
}

export type AllData = {
  meta: MetaRow[];
  google: GoogleAdsRow[];
  instagram: OrganicPeriod[];
  facebook: OrganicPeriod[];
  olx: OlxProduct[];
  ga: { ranks: GaRankRow[]; keywords: GaKeywordRow[] };
};

export function parseAll(raw: Record<TabName, SheetRows>): AllData {
  return {
    meta: parseMetaAds(raw["Meta Ads"] ?? []),
    google: parseGoogleAds(raw["Google Ads"] ?? []),
    instagram: parseOrganic(raw["Instagram Organic"] ?? []),
    facebook: parseOrganic(raw["Facebook Organic"] ?? []),
    olx: parseOlx(raw["OLX"] ?? []),
    ga: parseGoogleAnalytics(raw["Google Analytics"] ?? []),
  };
}