import { createFileRoute } from "@tanstack/react-router";
import { OrganicView, type OrganicSpec } from "@/components/organic-view";

/** Keys match the Instagram Organic tab exactly — see components/organic-view.tsx. */
const SPEC: OrganicSpec = {
  title: "Instagram Insights",
  subtitle: "Organic profile performance",
  filenameSlug: "instagram-organic",
  network: "instagram",
  headline: [
    { key: "Profile views", label: "Profile views", compact: true },
    { key: "Profile reach", label: "Profile reach", compact: true },
    { key: "Interactions", label: "Interactions" },
    { key: "Profile followers", label: "Followers" },
  ],
  trend: ["Profile reach", "Media reach", "Views", "Interactions"],
  interactionMix: [
    "Like count",
    "Comments count",
    "Shares",
    "Unique saves",
    "Reposts",
    "Profile replies",
  ],
};

export const Route = createFileRoute("/instagram")({
  head: () => ({
    meta: [
      { title: "Instagram Insights — Radiocom Insight" },
      {
        name: "description",
        content:
          "Organic Instagram performance: profile views, reach, interactions, likes, saves, shares and reels metrics by quarter.",
      },
      { property: "og:title", content: "Instagram Insights — Radiocom Insight" },
      { property: "og:description", content: "Organic Instagram analytics." },
    ],
  }),
  component: () => <OrganicView spec={SPEC} />,
});
