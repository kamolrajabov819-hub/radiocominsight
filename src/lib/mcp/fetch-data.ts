import { parseAll, type AllData } from "../parsers";
import type { SheetRows, TabName } from "../sheets.functions";

const SPREADSHEET_ID = "1_mljmLtXDrk90g055harTstt06_VvSurYuCpfrag4Vs";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const TABS: TabName[] = [
  "Meta Ads",
  "Google Ads",
  "Instagram Organic",
  "Facebook Organic",
  "OLX",
  "Google Analytics",
];

function normalize(values: unknown[][] | undefined): SheetRows {
  return (values ?? []).map((row) =>
    row.map((c) => {
      if (c === null || c === undefined) return null;
      if (typeof c === "number" || typeof c === "string") return c;
      return String(c);
    }),
  );
}

export async function fetchAllData(): Promise<AllData> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !connKey) {
    throw new Error("Google Sheets connector credentials are not configured on the server.");
  }
  const qs = TABS.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets ${res.status}: ${body}`);
  }
  const json = (await res.json()) as {
    valueRanges?: { range: string; values?: unknown[][] }[];
  };
  const raw = {} as Record<TabName, SheetRows>;
  (json.valueRanges ?? []).forEach((vr, i) => {
    raw[TABS[i]] = normalize(vr.values);
  });
  return parseAll(raw);
}