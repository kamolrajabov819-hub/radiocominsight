import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchAllData } from "../fetch-data";

export default defineTool({
  name: "get_olx_products",
  title: "Get OLX product performance",
  description:
    "Return product-level performance from the OLX listings: name, price, views, favorites (likes), phone clicks and CTR. Optionally limit the number of rows and sort by a metric.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe("Maximum number of rows to return. Defaults to 25."),
    sort_by: z
      .enum(["views", "favorites", "phone_clicks", "price"])
      .optional()
      .describe("Metric to sort by, descending. Defaults to views."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, sort_by }) => {
    const { olx } = await fetchAllData();
    const key = sort_by ?? "views";
    const mapped = olx.map((p) => ({
      name: p.name,
      price: p.price,
      views: p.views,
      favorites: p.favorites,
      phone_clicks: p.phoneClicks,
      ctr_pct: p.views > 0 ? (p.phoneClicks / p.views) * 100 : 0,
    }));
    mapped.sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
    const rows = mapped.slice(0, limit ?? 25);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { count: rows.length, rows },
    };
  },
});
