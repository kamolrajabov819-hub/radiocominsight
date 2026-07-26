import { createFileRoute } from "@tanstack/react-router";
import { OrganicView } from "@/components/organic-view";

export const Route = createFileRoute("/instagram")({
  head: () => ({
    meta: [
      { title: "Instagram Insights — Radiocom Analytics Hub" },
      { name: "description", content: "Organic Instagram performance: reach, follows, profile views, reels reach, likes." },
      { property: "og:title", content: "Instagram Insights — Radiocom" },
      { property: "og:description", content: "Organic Instagram analytics." },
    ],
  }),
  component: () => (
    <OrganicView
      title="Instagram Insights (Organic)"
      filenameSlug="instagram-organic"
      network="instagram"
      highlightKeys={["Reach", "Views", "Follows", "Profile visits", "Interactions", "Likes", "Shares", "Reels"]}
    />
  ),
});
