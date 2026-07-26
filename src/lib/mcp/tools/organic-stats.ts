import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchAllData } from "../fetch-data";

export default defineTool({
  name: "get_organic_stats",
  title: "Get organic social stats",
  description:
    "Return organic social performance periods for Facebook or Instagram: reach, impressions, follower changes, and per-metric breakdown.",
  inputSchema: {
    channel: z.enum(["facebook", "instagram"]).describe("Which organic channel to report on."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ channel }) => {
    const data = await fetchAllData();
    const periods = channel === "facebook" ? data.facebook : data.instagram;
    return {
      content: [{ type: "text", text: JSON.stringify(periods, null, 2) }],
      structuredContent: { channel, periods },
    };
  },
});
