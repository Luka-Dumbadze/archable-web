import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Genesis } from "@/components/archable/Genesis";
import { Workspace } from "@/components/archable/Workspace";
import { getBusiness } from "@/lib/businesses";
import { bizSearch } from "@/lib/biz-search";

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(bizSearch),
  head: () => ({
    meta: [
      { title: "Archable — The AI-Native Enterprise Compiler" },
      { name: "description", content: "Prompt a living operating system for your business into existence." },
      { property: "og:title", content: "Archable — The AI-Native Enterprise Compiler" },
      { property: "og:description", content: "Prompt a living operating system for your business into existence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { biz, view } = Route.useSearch();
  const navigate = useNavigate();
  const b = getBusiness(biz);
  if (!b) return <Genesis onLaunch={(x) => navigate({ to: "/", search: { biz: x.id } })} />;
  return <Workspace business={b} mode="owner" view={view} />;
}
