import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Workspace } from "@/components/archable/Workspace";
import { BUSINESSES, getBusiness } from "@/lib/businesses";
import { bizSearch } from "@/lib/biz-search";

export const Route = createFileRoute("/dev")({
  validateSearch: zodValidator(bizSearch),
  head: () => ({
    meta: [
      { title: "Developer Console — Archable" },
      { name: "description", content: "Agent activity, system topology, contracts and business changes." },
      { property: "og:title", content: "Developer Console — Archable" },
      { property: "og:description", content: "Agent activity, system topology, contracts and business changes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dev,
});

function Dev() {
  const { biz } = Route.useSearch();
  const b = getBusiness(biz) ?? BUSINESSES[0];
  if (!b) return null;
  return <Workspace business={b} mode="dev" />;
}
