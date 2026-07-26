import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SPREADSHEET_ID = "1_mljmLtXDrk90g055harTstt06_VvSurYuCpfrag4Vs";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

/**
 * UNFORMATTED_VALUE alone makes Sheets return date cells as serial numbers
 * (days since 1899-12-30). Pairing it with FORMATTED_STRING keeps numbers raw
 * while dates arrive as readable strings.
 */
const RENDER_OPTS = "valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING";

const TabName = z.enum([
  "Meta Ads",
  "Google Ads",
  "Instagram Organic",
  "Facebook Organic",
  "OLX",
  "Google Analytics",
]);
export type TabName = z.infer<typeof TabName>;
export type Cell = string | number | null;
export type SheetRows = Cell[][];

export const TABS: TabName[] = [
  "Meta Ads",
  "Google Ads",
  "Instagram Organic",
  "Facebook Organic",
  "OLX",
  "Google Analytics",
];

export type WorkbookResult = {
  tabs: Partial<Record<TabName, SheetRows>>;
  /** Set when the workbook could not be read; the UI shows this instead of blanking. */
  error: string | null;
  fetchedAt: string;
};

function normalize(values: unknown[][] | undefined): SheetRows {
  return (values ?? []).map((row) =>
    row.map((c) => {
      if (c === null || c === undefined) return null;
      if (typeof c === "number" || typeof c === "string") return c;
      return String(c);
    }),
  );
}

function credentials() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !connKey) return null;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
  };
}

export const getSheetTab = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ tab: TabName }).parse(input))
  .handler(async ({ data }) => {
    const headers = credentials();
    if (!headers) throw new Error("Missing Google Sheets connector credentials");
    const range = encodeURIComponent(data.tab);
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${range}?${RENDER_OPTS}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Google Sheets ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { values?: unknown[][] };
    return { tab: data.tab, values: normalize(json.values) };
  });

/** Fetches every tab in one batch. Never throws — failures come back on `error`. */
export async function fetchWorkbook(): Promise<WorkbookResult> {
  const fetchedAt = new Date().toISOString();
  const headers = credentials();
  if (!headers) {
    return {
      tabs: {},
      error:
        "Google Sheets connector is not configured. Set LOVABLE_API_KEY and GOOGLE_SHEETS_API_KEY, then reload.",
      fetchedAt,
    };
  }

  const qs = TABS.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${qs}&${RENDER_OPTS}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      return { tabs: {}, error: `Google Sheets returned ${res.status}. ${body}`, fetchedAt };
    }
    const json = (await res.json()) as {
      valueRanges?: { range: string; values?: unknown[][] }[];
    };
    const tabs: Partial<Record<TabName, SheetRows>> = {};
    (json.valueRanges ?? []).forEach((vr, i) => {
      if (TABS[i]) tabs[TABS[i]] = normalize(vr.values);
    });
    return { tabs, error: null, fetchedAt };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown network error";
    return { tabs: {}, error: `Could not reach Google Sheets: ${msg}`, fetchedAt };
  }
}

export const getAllTabs = createServerFn({ method: "GET" }).handler(fetchWorkbook);
