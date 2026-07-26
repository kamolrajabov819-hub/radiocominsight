import { auth, defineMcp } from "@lovable.dev/mcp-js";
import dashboardSummary from "./tools/dashboard-summary";
import listPeriods from "./tools/list-periods";
import olxProducts from "./tools/olx-products";
import organicStats from "./tools/organic-stats";

// Direct Supabase issuer host — the .lovable.cloud proxy is rejected by
// mcp-js. The fallback keeps the issuer well-formed during the throwaway
// manifest-extract eval; the published build inlines the real project ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "radiocom-analytics-mcp",
  title: "Radiocom Analytics Hub",
  version: "0.1.0",
  instructions:
    "Read-only access to the Radiocom marketing analytics dashboard. Call list_periods first to discover reporting periods, then get_dashboard_summary for blended KPIs across Meta Ads and Google Ads. Use get_olx_products for product-level OLX performance and get_organic_stats for Facebook or Instagram organic reach and follower growth.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPeriods, dashboardSummary, olxProducts, organicStats],
});