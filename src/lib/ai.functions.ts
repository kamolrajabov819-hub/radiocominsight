import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  summary: z.string().min(1).max(16000),
});

const INSTRUCTIONS = `You are the strategic marketing advisor for Radiocom, a two-way radio retailer in Uzbekistan.

You will be given a JSON snapshot of cross-channel marketing performance: Meta Ads,
Google Ads, OLX marketplace listings, organic Facebook and Instagram, and Google
Analytics / SEO rankings. Quarter-over-quarter changes are included where available.

Write an executive analysis in markdown, at most 200 words, structured as:
1. One headline sentence naming the single most important movement.
2. Three or four bullets, each citing a concrete number from the data.
3. Two specific, actionable recommendations.

Cite real figures only — never invent a metric that is not in the JSON. If a channel
reports zeros, say so plainly rather than glossing over it. Be direct. No preamble,
no filler.`;

/**
 * Model order matters: the gateway occasionally retires an alias, so a second
 * candidate keeps the panel working instead of surfacing a raw 404.
 */
const MODELS = ["openai/gpt-5.5", "google/gemini-2.5-flash"];

export const analyzeInsights = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => InputSchema.parse(v))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const gateway = createLovableAiGatewayProvider(key);

    let lastError = "AI request failed";

    for (const modelId of MODELS) {
      try {
        const res = await generateText({
          model: gateway(modelId),
          // The gateway routes these models through a backend that rejects
          // `role: "system"` outright ("use the instructions option instead"),
          // so the brief travels inside the single user message.
          messages: [
            {
              role: "user",
              content: `${INSTRUCTIONS}\n\n---\n\nPerformance snapshot:\n\n${data.summary}`,
            },
          ],
        });
        if (res.text.trim()) return { text: res.text, model: modelId };
        lastError = "The model returned an empty response.";
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AI request failed";
        if (/\b402\b/.test(msg)) {
          throw new Error("AI credits exhausted. Add credits in workspace billing.");
        }
        if (/\b429\b/.test(msg)) {
          throw new Error("AI rate limit reached. Try again in a moment.");
        }
        lastError = msg;
        // 400/404 usually means this model id is unavailable — try the next one.
        if (!/\b(400|404)\b/.test(msg)) break;
      }
    }

    throw new Error(lastError);
  });
