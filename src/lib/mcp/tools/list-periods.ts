import { defineTool } from "@lovable.dev/mcp-js";
import { fetchAllData } from "../fetch-data";
import { quarterLabel } from "../../parsers";

export default defineTool({
  name: "list_periods",
  title: "List available reporting periods",
  description:
    "List the distinct reporting periods (date_start / date_stop) available in the Meta Ads and Google Ads data, including quarter labels when applicable.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const data = await fetchAllData();
    const seen = new Map<
      string,
      { date_start: string; date_stop: string; label: string; sources: string[] }
    >();
    const add = (start: string, stop: string, source: string) => {
      if (!start || !stop) return;
      const k = `${start}|${stop}`;
      const existing = seen.get(k);
      if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
      } else {
        seen.set(k, {
          date_start: start,
          date_stop: stop,
          label: quarterLabel(start, stop),
          sources: [source],
        });
      }
    };
    for (const r of data.meta) add(r.dateStart, r.dateStop, "meta_ads");
    for (const r of data.google) add(r.dateStart, r.dateStop, "google_ads");
    for (const p of data.facebook) add(p.dateStart, p.dateStop, "facebook_organic");
    for (const p of data.instagram) add(p.dateStart, p.dateStop, "instagram_organic");
    const periods = Array.from(seen.values()).sort((a, b) =>
      a.date_start < b.date_start ? 1 : -1,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(periods, null, 2) }],
      structuredContent: { periods },
    };
  },
});
