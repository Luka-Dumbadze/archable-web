import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { impactChip, chatPrice } from "@/dev/desires";
import type { useDesires } from "@/dev/use-desires";
import { RationaleCard } from "@/shared/RationaleCard";

type FeedProps = Pick<ReturnType<typeof useDesires>, "load" | "unlink" | "unlinking" | "error" | "resetDemo">;

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function StructuredDesiresFeed({ load, unlink, unlinking, error, resetDemo }: FeedProps) {
  if (load.state === "loading") return (
    <div role="status" aria-label="Loading desires" className="space-y-4">
      {[0, 1].map((key) => <div key={key} className="space-y-3 rounded-xl border bg-card p-5">
        <Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" />
      </div>)}
    </div>
  );
  if (load.state === "failed") return <p className="text-sm text-muted-foreground">Desires aren't available right now.</p>;

  return (
    <div className="min-w-0 space-y-4">
      {load.demo && <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={resetDemo} disabled={unlinking !== null}
          className="h-auto px-0 py-1 text-xs text-muted-foreground">Reset sample</Button>
      </div>}
      {error && <p role="alert" className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {error === "forbidden" ? "Only the owner or a developer can unlink chats." : "Couldn't unlink right now. Please try again."}
      </p>}
      {load.desires.map((desire) => (
        <article key={desire.id} aria-label={`Desire D-${desire.number}`} className="min-w-0 rounded-xl border bg-card p-5">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="text-foreground">D-{desire.number}</span><span aria-hidden="true">·</span>
              <span className="[overflow-wrap:anywhere]">{desire.status}</span><span aria-hidden="true">·</span><span>T{desire.tier}</span>
            </div>
            <h3 className="text-sm font-medium [overflow-wrap:anywhere]">{desire.statement}</h3>
            <p className="inline-block max-w-full rounded-full border bg-secondary/50 px-2 py-1 font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">{impactChip(desire.impact)}</p>
          </header>
          <Tabs defaultValue="chats" className="mt-4 min-w-0">
            <TabsList aria-label={`D-${desire.number} details`} className="max-w-full">
              <TabsTrigger value="chats">Linked chats</TabsTrigger>
              <TabsTrigger value="rationale">Rationale</TabsTrigger>
            </TabsList>
            <TabsContent value="chats" className="min-w-0 pt-2">
              {desire.chats.length === 0 ? <p className="text-sm text-muted-foreground">No chats are linked to this desire.</p> : (
                <ul className="divide-y">
                  {desire.chats.map((chat) => <li key={chat.chapter_id} className="min-w-0 space-y-2 py-4 first:pt-1 last:pb-0">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium [overflow-wrap:anywhere]">{chat.customer}</p>
                        <time dateTime={chat.opened_at} className="font-mono text-[11px] text-muted-foreground">{shortDate(chat.opened_at)}</time>
                      </div>
                      <Button type="button" variant="outline" size="sm" disabled={unlinking !== null}
                        className="shrink-0" onClick={async () => { await unlink(desire.id, chat.chapter_id); }}>
                        {unlinking === chat.chapter_id ? "Unlinking…" : "Unlink"}
                      </Button>
                    </div>
                    <p className="font-mono text-xs [overflow-wrap:anywhere]">{chatPrice(chat)}</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">“{chat.excerpt}”</p>
                  </li>)}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="rationale" className="min-w-0 pt-3">
              <RationaleCard card={desire.rationale_card} mode="developer" />
            </TabsContent>
          </Tabs>
        </article>
      ))}
    </div>
  );
}