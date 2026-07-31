import { createFileRoute } from "@tanstack/react-router";
import { OrganicView, type OrganicSpec } from "@/components/organic-view";

/** Keys match the Facebook Organic tab exactly — see components/organic-view.tsx. */
const SPEC: OrganicSpec = {
  title: "org.fbTitle",
  subtitle: "org.fbSubtitle",
  filenameSlug: "facebook-organic",
  network: "facebook",
  headline: [
    { key: "Page media views", label: "org.mediaViews", compact: true },
    { key: "Page post engagements", label: "org.postEngagements" },
    { key: "Page followers", label: "org.pageFollowers" },
    { key: "Page visits", label: "org.pageVisits" },
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
