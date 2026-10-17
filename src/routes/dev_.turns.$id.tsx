import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dev_/turns/$id")({
  head: () => ({
    meta: [
      { title: "Conversation details — Archable" },
      { name: "description", content: "Details of an Archable customer test conversation." },
      { property: "og:title", content: "Conversation details — Archable" },
      { property: "og:description", content: "Details of an Archable customer test conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConversationDetails,
});

function ConversationDetails() {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-5 py-16">
      <h1 className="text-xl font-semibold">Conversation details</h1>
      <p className="text-sm text-muted-foreground">Details are unavailable right now.</p>
      <Button asChild variant="outline"><Link to="/" search={(previous) => ({ biz: previous.biz })}>Open Owner Mode</Link></Button>
    </main>
  );
}