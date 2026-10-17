import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useRef, useState } from "react";
import { Boxes, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESSES, getBusiness } from "@/lib/businesses";
import { chatSearch } from "@/lib/biz-search";
import { useChat } from "@/chat/use-chat";

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

function Chat() {
  const { biz, embed, lang } = Route.useSearch();
  const b = getBusiness(biz) ?? BUSINESSES[0];
  const { messages, greeting, tenantName, error, pending, send: sendMessage } = useChat(b?.name ?? "Archable", lang);
  const name = tenantName ?? b?.name ?? "Archable";
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, greeting, pending, error]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void sendMessage(text);
  };

  return (
    <div className="flex h-dvh flex-col">
      {embed ? (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <span className="min-w-0 break-words text-sm font-medium">{!tenantName && b?.emoji} {name}</span>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => window.parent.postMessage({ type: "archable:close" }, "*")} className="shrink-0 text-muted-foreground"><X className="size-4" /></Button>
        </header>
      ) : (
        <header className="flex items-center gap-2 border-b px-4 py-3 text-sm">
          <Link to="/" className="flex items-center gap-2 font-semibold"><Boxes className="size-4 text-primary" />Archable</Link>
          <span className="min-w-0 break-words text-muted-foreground">/ {name}</span>
        </header>
      )}
      <main className="mx-auto min-h-0 w-full max-w-xl flex-1 space-y-3 overflow-auto p-4" aria-live="polite">
        {greeting && <div className="max-w-[80%] rounded-2xl bg-secondary px-3.5 py-2 text-sm [overflow-wrap:anywhere]">{greeting}</div>}
        {messages.map((m) => (
          <div key={m.key} className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] ${m.author === "customer" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {m.author === "staff" && <span className="mb-1 block text-xs text-muted-foreground">Staff</span>}
            {m.text}
          </div>
        ))}
        {pending && <div className="text-xs text-muted-foreground" role="status">typing…</div>}
        {error && <p role="alert" className="text-sm text-muted-foreground">{error}</p>}
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
