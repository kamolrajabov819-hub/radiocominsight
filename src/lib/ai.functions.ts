import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  summary: z.string().min(1).max(8000),
});

export const analyzeInsights = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => InputSchema.parse(v))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("openai/gpt-5.5");
    try {
      const res = await generateText({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are the strategic marketing advisor for Radiocom. You get a JSON summary of the latest cross-channel marketing performance (Meta Ads, Google Ads, OLX, organic Facebook/Instagram, Google Analytics rankings). Write a concise, executive-level analysis (max 180 words) in markdown with: 1) a 1-sentence headline, 2) 3-4 bullet insights citing concrete numbers, 3) 2 actionable recommendations. Be direct. No fluff.",
          },
          { role: "user", content: data.summary },
        ],
      });
      return { text: res.text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI request failed";
      if (/402/.test(msg)) throw new Error("AI credits exhausted. Please add credits in workspace billing.");
      if (/429/.test(msg)) throw new Error("AI rate limit reached. Try again in a moment.");
      throw new Error(msg);
    }
  });
