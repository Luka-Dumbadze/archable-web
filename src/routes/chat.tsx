import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useRef, useState } from "react";
import { Boxes, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESSES, getBusiness } from "@/lib/businesses";
import { chatSearch } from "@/lib/biz-search";

export const Route = createFileRoute("/chat")({
  validateSearch: zodValidator(chatSearch),
  head: () => ({
    meta: [
      { title: "Chat — Archable" },
      { name: "description", content: "Talk to the business assistant." },
      { property: "og:title", content: "Chat — Archable" },
      { property: "og:description", content: "Talk to the business assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chat,
});

type Msg = { from: "me" | "bot"; text: string };

function Chat() {
  const { biz, embed } = Route.useSearch();
  const b = getBusiness(biz) ?? BUSINESSES[0]!;
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: `Hi! Welcome to ${b.name}. How can I help?` }]);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMsgs((m) => [...m, { from: "me", text }]);
    setTimeout(() => setMsgs((m) => [...m, { from: "bot", text: "Got it — a teammate will confirm shortly." }]), 600);
  };

  return (
    <div className="flex h-dvh flex-col">
      {embed ? (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">{b.emoji} {b.name}</span>
          <button aria-label="Close" onClick={() => window.parent.postMessage({ type: "archable:close" }, "*")} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </header>
      ) : (
        <header className="flex items-center gap-2 border-b px-4 py-3 text-sm">
          <Link to="/" className="flex items-center gap-2 font-semibold"><Boxes className="size-4 text-primary" />Archable</Link>
          <span className="text-muted-foreground">/ {b.name}</span>
        </header>
      )}
      <main className="mx-auto w-full max-w-xl flex-1 space-y-3 overflow-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "me" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.text}</div>
        ))}
        <div ref={end} />
      </main>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mx-auto flex w-full max-w-xl gap-2 border-t p-3">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" aria-label="Message"
          className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button type="submit" disabled={!draft.trim()}><Send /> Send</Button>
      </form>
    </div>
  );
}
