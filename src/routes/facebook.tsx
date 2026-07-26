import { createFileRoute } from "@tanstack/react-router";
import { OrganicView } from "@/components/organic-view";

export const Route = createFileRoute("/facebook")({
  head: () => ({
    meta: [
      { title: "Facebook Insights — Radiocom Analytics Hub" },
      { name: "description", content: "Organic Facebook page performance: reach, follows, page views, engagement." },
      { property: "og:title", content: "Facebook Insights — Radiocom" },
      { property: "og:description", content: "Organic Facebook analytics." },
    ],
  }),
  component: () => (
    <OrganicView
      title="Facebook Insights (Organic)"
      filenameSlug="facebook-organic"
      network="facebook"
      highlightKeys={["Reach", "Views", "Follows", "Interactions", "Visits", "Page likes", "Content interactions"]}
    />
  ),
});
