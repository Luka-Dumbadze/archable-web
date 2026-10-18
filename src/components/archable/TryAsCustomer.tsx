import { Send, RotateCcw, MessageSquare, UserRound, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTryTurn } from "@/owner/use-try-turn";

const errors = {
  signed_out: "Please sign in again: send /web to @ArchableBot.",
  unavailable: "Unavailable right now. Please try again in a moment.",
  rejected: "That message couldn't be sent. Try a shorter one.",
};

export function TryAsCustomer({ className = "" }: { className?: string }) {
  const { entries, busy, send, reset } = useTryTurn();
  const [draft, setDraft] = useState("");
  const history = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = history.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [entries, busy]);

  const submit = () => {
    const text = draft.trim();
    if (busy || !text) return;
    setDraft("");
    void send(text);
  };

  return (
    <section aria-labelledby="try-customer-title" className={`window-theme modern-chat customer-chat flex min-w-0 flex-col rounded-2xl border bg-card ${className}`}>
      <header className="border-b px-6 py-6 sm:px-8">
        <div className="flex items-center gap-4 pr-10">
          <span className="app-badge app-contact flex size-12 shrink-0 items-center justify-center rounded-2xl"><MessageSquare className="size-6" /></span>
          <div className="min-w-0 flex-1"><h3 id="try-customer-title" className="text-xl font-semibold">Try as customer</h3><span className="mt-1.5 inline-flex text-xs text-muted-foreground">Customer preview</span></div>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Send a message as if you were a customer. Nothing is sent to real customers.</p>
      </header>
      <div ref={history} role="log" aria-label="Customer conversation" aria-live="polite"
        className="relative min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-7 sm:px-8">
        {entries.length === 0 && <div className="chat-empty flex h-full min-h-32 items-center justify-center" aria-hidden="true"><span className="flex size-20 items-center justify-center rounded-2xl border bg-card text-muted-foreground"><UserRound className="size-8" /></span></div>}
        {entries.map((entry) => {
          if (entry.kind === "you") return (
            <div key={entry.key} className="ml-auto w-fit max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-chat-customer px-5 py-3.5 text-sm leading-relaxed text-chat-foreground [overflow-wrap:anywhere]">{entry.text}</div>
          );
          if (entry.kind === "error") return (
            <p key={entry.key} role="alert" className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{errors[entry.reason]}</p>
          );
          return (
            <div key={entry.key} className="max-w-[88%] space-y-3">
              <div className="w-fit whitespace-pre-wrap rounded-2xl rounded-bl-sm border bg-secondary px-5 py-3.5 text-sm leading-relaxed text-body-foreground [overflow-wrap:anywhere]">{entry.text}</div>
              <p className={`pill ${entry.sent ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{entry.sent ? "Would be sent" : "Held back for a person to answer"}</p>
              <a href={entry.trace} className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">See what happened<ArrowUpRight className="size-3" /></a>
            </div>
          );
        })}
        {busy && <p role="status" className="text-xs text-muted-foreground">Thinking…</p>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex min-w-0 gap-2 border-t p-3">
        <Button type="button" variant="ghost" size="icon" aria-label="New conversation" title="New conversation" disabled={busy} className="size-10 shrink-0 text-muted-foreground" onClick={() => { reset(); setDraft(""); }}><RotateCcw className="size-4" /></Button>
        <Input aria-label="Customer message" placeholder="Message…" value={draft} disabled={busy}
          onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1" />
        <Button type="submit" size="icon" aria-label="Send" title="Send" disabled={busy || !draft.trim()}><Send /></Button>
      </form>
    </section>
  );
}