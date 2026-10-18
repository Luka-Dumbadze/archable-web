import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { RationaleCard } from "@/shared/RationaleCard";
import { useOwnerChat } from "./use-owner-chat";

const errors = {
  signed_out: "Please sign in again: send /web to @ArchableBot.",
  unavailable: "Unavailable right now. Please try again in a moment.",
  rejected: "That message couldn't be sent. Try a shorter one.",
  forbidden: "Only the owner can ask for changes.",
  not_found: "That choice is no longer available.",
};

export function OwnerChat({ business }: { business: { id: string } }) {
  const { entries, busy, send, press, rationale, closeRationale } = useOwnerChat(business.id);
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
    <>
      <section aria-labelledby="owner-chat-title" className="flex h-[460px] min-w-0 flex-col rounded-lg border bg-card">
        <header className="px-5 pt-5 pb-3">
          <h3 id="owner-chat-title" className="text-sm font-medium">Talk to your business</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Ask for a change in plain words.</p>
        </header>
        <div ref={history} role="log" aria-label="Architect conversation" aria-live="polite"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
          {entries.map((entry) => {
            if (entry.kind === "owner") return (
              <div key={entry.key} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground [overflow-wrap:anywhere]">{entry.text}</div>
            );
            if (entry.kind === "error") return (
              <p key={entry.key} role="alert" className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{errors[entry.reason]}</p>
            );
            const firstAction = entry.buttons.findIndex((button) => button.kind === "action");
            return (
              <div key={entry.key} className="min-w-0 space-y-2">
                <div className="w-fit max-w-[90%] whitespace-pre-wrap rounded-lg bg-secondary px-3 py-2 text-sm [overflow-wrap:anywhere]">{entry.text}</div>
                {entry.buttons.length > 0 && <div className="flex min-w-0 flex-wrap gap-2">
                  {entry.buttons.map((button, index) => (
                    <Button key={index} type="button" size="sm"
                      variant={button.kind === "action" && index === firstAction ? "default" : "outline"}
                      disabled={button.kind === "action" && (entry.answered || busy)}
                      onClick={() => { void press(entry.key, button); }}
                      className="h-auto min-h-8 max-w-full whitespace-normal py-1.5 text-left [overflow-wrap:anywhere]">
                      {button.kind === "link" && <ExternalLink className="shrink-0" aria-hidden="true" />}
                      <span className="min-w-0">{button.label}</span>
                    </Button>
                  ))}
                </div>}
              </div>
            );
          })}
          {busy && <p role="status" className="text-xs text-muted-foreground">Thinking…</p>}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex min-w-0 gap-2 border-t p-3">
          <Input aria-label="Message to your business" placeholder="Message…" value={draft} disabled={busy}
            onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1" />
          <Button type="submit" disabled={busy || !draft.trim()}>Send</Button>
        </form>
      </section>
      <Sheet open={rationale.state !== "closed"} onOpenChange={(open) => { if (!open) closeRationale(); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg" aria-describedby={undefined}>
          {rationale.state !== "closed" && <>
            <SheetHeader className="mb-6 pr-6 text-left">
              <SheetTitle className="break-words [overflow-wrap:anywhere]">{rationale.title}</SheetTitle>
            </SheetHeader>
            {rationale.state === "loading" && <div role="status" aria-label="Loading reasons" className="space-y-4">
              <Skeleton className="h-4 w-2/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
            </div>}
            {rationale.state === "ready" && <RationaleCard card={rationale.card} mode="owner" />}
            {rationale.state === "failed" && <p className="text-sm text-muted-foreground">The reasons aren't available right now.</p>}
          </>}
        </SheetContent>
      </Sheet>
    </>
  );
}