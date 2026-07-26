import { createFileRoute } from "@tanstack/react-router";
import { OrganicView, type OrganicSpec } from "@/components/organic-view";

/** Keys match the Facebook Organic tab exactly — see components/organic-view.tsx. */
const SPEC: OrganicSpec = {
  title: "Facebook Insights",
  subtitle: "Organic page performance",
  filenameSlug: "facebook-organic",
  network: "facebook",
  headline: [
    { key: "Page media views", label: "Media views", compact: true },
    { key: "Page post engagements", label: "Post engagements" },
    { key: "Page followers", label: "Page followers" },
    { key: "Page visits", label: "Page visits" },
  ],
  trend: ["Page media views", "Page post engagements", "Page visits", "Total page reactions"],
  interactionMix: [
    "Page post engagements",
    "Total page reactions",
    "Page visits",
    "All clicks",
    "Total likes",
  ],
};

export const Route = createFileRoute("/facebook")({
  head: () => ({
    meta: [
      { title: "Facebook Insights — Radiocom Insight" },
      {
        name: "description",
        content:
          "Organic Facebook page performance: media views, post engagements, followers, visits and reactions by quarter.",
      },
      { property: "og:title", content: "Facebook Insights — Radiocom Insight" },
      { property: "og:description", content: "Organic Facebook analytics." },
    ],
  }),
  component: () => <OrganicView spec={SPEC} />,
});
