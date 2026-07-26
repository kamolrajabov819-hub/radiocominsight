import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SPREADSHEET_ID = "1_mljmLtXDrk90g055harTstt06_VvSurYuCpfrag4Vs";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

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

function normalize(values: unknown[][] | undefined): SheetRows {
  return (values ?? []).map((row) =>
    row.map((c) => {
      if (c === null || c === undefined) return null;
      if (typeof c === "number" || typeof c === "string") return c;
      return String(c);
    }),
  );
}

export const getSheetTab = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ tab: TabName }).parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!lovableKey || !connKey) {
      throw new Error("Missing Google Sheets connector credentials");
    }
    const range = encodeURIComponent(data.tab);
    const url = `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`;
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
    const json = (await res.json()) as { values?: unknown[][] };
    return { tab: data.tab, values: normalize(json.values) };
  });

export const getAllTabs = createServerFn({ method: "GET" }).handler(async () => {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !connKey) {
    throw new Error("Missing Google Sheets connector credentials");
  }
  const ranges = [
    "Meta Ads",
    "Google Ads",
    "Instagram Organic",
    "Facebook Organic",
    "OLX",
    "Google Analytics",
  ];
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
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
  const out: Record<string, SheetRows> = {};
  (json.valueRanges ?? []).forEach((vr, i) => {
    out[ranges[i]] = normalize(vr.values);
  });
  return out as Record<TabName, SheetRows>;
});