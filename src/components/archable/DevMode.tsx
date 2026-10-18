import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { GitPullRequest, Info, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Business, Desire } from "@/lib/businesses";
import { RationaleCard } from "@/shared/RationaleCard";
import { DEMO_CHANGES, demoRationale } from "@/shared/fixtures/d14";
import { useDesires } from "@/dev/use-desires";
import { StructuredDesiresFeed } from "./StructuredDesiresFeed";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamActivity } from "./TeamActivity";

const A2AGraph = lazy(() => import("./A2AGraph"));

export function DevMode({ b }: { b: Business }) {
  const [why, setWhy] = useState<Desire | null>(null);
  const { load, unlink, unlinking, error, resetDemo } = useDesires(b.id);
  const changes = DEMO_CHANGES[b.id] ?? [];
  const desires = [
    ...b.desires.filter((desire) => !changes.some((change) => change.desire === desire.id)),
    ...changes.map((change): Desire => ({
      id: change.desire, title: change.title, tier: change.tier, status: "Ready for you",
      witness: [], observation: "", lostRevenue: "", riskCap: "", pr: "",
    })),
  ];
  const rationale = why ? demoRationale(b.id, why.id) : null;

  return (
    <Tabs defaultValue="activity" className="min-w-0">
      <TabsList aria-label="Developer views" className="mb-6 flex h-auto w-full justify-start gap-2 rounded-none border-b bg-transparent p-0">
        <TabsTrigger value="activity" className="min-w-0 flex-1 whitespace-normal rounded-none border-b-2 border-transparent px-2 py-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:flex-none sm:px-5 sm:text-sm">Live Agent Activity</TabsTrigger>
        <TabsTrigger value="architecture" className="min-w-0 flex-1 whitespace-normal rounded-none border-b-2 border-transparent px-2 py-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:flex-none sm:px-5 sm:text-sm">System Map</TabsTrigger>
        <TabsTrigger value="desires" className="min-w-0 flex-1 whitespace-normal rounded-none border-b-2 border-transparent px-2 py-4 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:flex-none sm:px-5 sm:text-sm">Evolution &amp; Changes</TabsTrigger>
      </TabsList>
      <TabsContent value="activity" className="mt-0"><TeamActivity /></TabsContent>
      <TabsContent value="architecture" className="mt-0 pb-24">
      <section aria-label="App map" className="h-[600px] min-w-0 sm:h-[680px]">
        <ClientOnly fallback={<div className="h-full rounded-lg border bg-card" />}>
          <Suspense fallback={<div className="h-full rounded-lg border bg-card" />}><A2AGraph /></Suspense>
        </ClientOnly>
      </section>
      </TabsContent>
      <TabsContent value="desires" className="window-theme evolution-view mt-0">
      <section aria-label="Desires">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-7"><div className="flex items-center gap-4"><span className="app-badge app-operations flex size-12 shrink-0 items-center justify-center rounded-2xl"><Sparkles className="size-6" /></span><h2 className="text-xl font-semibold">Evolution &amp; Changes</h2></div><span className="pill border text-muted-foreground">{load.state === "ready" && load.demo ? "Sample changes" : "Business changes"}</span></header>
        <div className="space-y-5">
          <StructuredDesiresFeed load={load} unlink={unlink} unlinking={unlinking} error={error} resetDemo={resetDemo} />
          {desires.filter((d) => !(d.id === "D-14" && load.state === "ready" && load.desires.some((desire) => desire.number === 14))).map((d) => (
            <article key={d.id} className="change-card surface-interactive min-w-0 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="mr-auto text-foreground">{d.id}</span><span className="pill border bg-secondary">{d.status}</span><span className="pill border">{d.tier}</span>
              </div>
              <h3 className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed [overflow-wrap:anywhere]">{d.title}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-1 font-mono text-[11px] text-muted-foreground">
                {d.witness.map((w, i) => <span key={w} className="flex max-w-full items-center gap-2 [overflow-wrap:anywhere]"><span className="pill border bg-background">{w}</span>{i < d.witness.length - 1 && <ArrowRight className="size-3 shrink-0" />}</span>)}
              </div>
              <div className="change-actions flex flex-wrap gap-3">
                {d.pr && <Button size="sm" onClick={() => toast(`PR ${d.pr}`)}><GitPullRequest /> Review PR</Button>}
                <Button size="sm" variant="outline" onClick={() => setWhy(d)}><Info /> Why</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      </TabsContent>

      <Dialog open={!!why} onOpenChange={(o) => !o && setWhy(null)}>
        <DialogContent className="workspace-os window-theme chat-window max-h-[85dvh] overflow-y-auto rounded-2xl" aria-describedby={undefined}>
          {why && (<>
            <DialogHeader><DialogTitle className="break-words pr-4 [overflow-wrap:anywhere]">{why.title}</DialogTitle></DialogHeader>
            {rationale ? <RationaleCard card={rationale} mode="developer" /> : <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">{why.observation}</p>
              <p className="font-mono text-lg font-semibold">{why.lostRevenue}</p>
              <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{why.riskCap}</p>
            </div>}
          </>)}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
