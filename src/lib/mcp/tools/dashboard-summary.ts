import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchAllData } from "../fetch-data";
import { cpc, cpl, ctr, sumGoogle, sumMeta, filterByPeriod } from "../../metrics";

export default defineTool({
  name: "get_dashboard_summary",
  title: "Get Radiocom dashboard summary",
  description:
    "Return a blended marketing performance summary across Meta Ads and Google Ads: total spend, leads, impressions, clicks, blended cost-per-lead, CTR and CPC. Optionally scope to one reporting period returned by list_periods.",
  inputSchema: {
    date_start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Period start date (YYYY-MM-DD) from list_periods. Omit for all-time totals."),
    date_stop: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe(
        "Period end date (YYYY-MM-DD) from list_periods. Required if date_start is provided.",
      ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date_start, date_stop }) => {
    const data = await fetchAllData();
    const period = date_start && date_stop ? { start: date_start, stop: date_stop } : null;
    const meta = sumMeta(filterByPeriod(data.meta, period));
    const google = sumGoogle(filterByPeriod(data.google, period));
    const totalSpend = meta.spend + google.cost;
    const totalLeads = meta.leads + google.conversions;
    const totalClicks = meta.clicks + google.clicks;
    const totalImpressions = meta.impressions + google.impressions;
    const summary = {
      period: period ? { date_start, date_stop } : "all-time",
      blended: {
        total_spend: totalSpend,
        total_leads: totalLeads,
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        blended_cpl: cpl(totalSpend, totalLeads),
        blended_ctr_pct: ctr(totalClicks, totalImpressions),
        blended_cpc: cpc(totalSpend, totalClicks),
      },
      meta_ads: {
        spend: meta.spend,
        leads: meta.leads,
        clicks: meta.clicks,
        impressions: meta.impressions,
        reach: meta.reach,
        cpl: cpl(meta.spend, meta.leads),
        ctr_pct: ctr(meta.clicks, meta.impressions),
        cpc: cpc(meta.spend, meta.clicks),
      },
      google_ads: {
        spend: google.cost,
        conversions: google.conversions,
        clicks: google.clicks,
        impressions: google.impressions,
        phone_calls: google.phoneCalls,
        video_views: google.videoViews,
        cpl: cpl(google.cost, google.conversions),
        ctr_pct: ctr(google.clicks, google.impressions),
        cpc: cpc(google.cost, google.clicks),
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
