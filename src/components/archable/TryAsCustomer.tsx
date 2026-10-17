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
    <section aria-labelledby="try-customer-title" className={`flex min-w-0 flex-col rounded-lg border bg-card ${className}`}>
      <header className="px-5 pt-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 id="try-customer-title" className="text-sm font-medium">Try as customer</h3>
          <Button type="button" variant="ghost" size="sm" disabled={busy}
            className="h-auto px-0 py-1 text-xs text-muted-foreground"
            onClick={() => { reset(); setDraft(""); }}>New conversation</Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Send a message as if you were a customer. Nothing is sent to real customers.</p>
      </header>
      <div ref={history} role="log" aria-label="Customer conversation" aria-live="polite"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
        {entries.map((entry) => {
          if (entry.kind === "you") return (
            <div key={entry.key} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground [overflow-wrap:anywhere]">{entry.text}</div>
          );
          if (entry.kind === "error") return (
            <p key={entry.key} role="alert" className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{errors[entry.reason]}</p>
          );
          return (
            <div key={entry.key} className="max-w-[85%] space-y-1.5">
              <div className="w-fit whitespace-pre-wrap rounded-lg bg-secondary px-3 py-2 text-sm [overflow-wrap:anywhere]">{entry.text}</div>
              <p className={`text-xs ${entry.sent ? "text-muted-foreground" : "text-warning"}`}>{entry.sent ? "Would be sent" : "Held back for a person to answer"}</p>
              <a href={entry.trace} className="inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">See what happened</a>
            </div>
          );
        })}
        {busy && <p role="status" className="text-xs text-muted-foreground">Thinking…</p>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex min-w-0 gap-2 border-t p-3">
        <Input aria-label="Customer message" placeholder="Message…" value={draft} disabled={busy}
          onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1" />
        <Button type="submit" disabled={busy || !draft.trim()}>Send</Button>
      </form>
    </section>
  );
}