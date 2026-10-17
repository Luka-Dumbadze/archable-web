import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { GitPullRequest, Info, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Business, Desire } from "@/lib/businesses";

const A2AGraph = lazy(() => import("./A2AGraph"));

export function DevMode({ b }: { b: Business }) {
  const [why, setWhy] = useState<Desire | null>(null);

  return () => clearInterval(t);
  }, [b]);

  return (
    <div className="space-y-6">
      <section aria-label="App map" className="h-[calc(100dvh-150px)] min-h-[500px] min-w-0">
        <ClientOnly fallback={<div className="h-full bg-muted/30" />}>
          <Suspense fallback={<div className="h-full bg-muted/30" />}><A2AGraph /></Suspense>
        </ClientOnly>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="px-6 pt-5 text-sm font-medium">Desires</div>
        <div className="space-y-4 p-6">
          {b.desires.map((d) => (
            <div key={d.id} className="rounded-lg border p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="text-foreground">{d.id}</span>· {d.status} · {d.tier}
              </div>
              <div className="mt-2 text-sm font-medium">{d.title}</div>
              <div className="mt-3 flex flex-wrap items-center gap-1 font-mono text-[11px] text-muted-foreground">
                {d.witness.map((w, i) => <span key={w} className="flex items-center gap-1">{w}{i < d.witness.length - 1 && <ArrowRight className="size-3" />}</span>)}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => toast(`PR ${d.pr}`)}><GitPullRequest /> Review PR</Button>
                <Button size="sm" variant="ghost" onClick={() => setWhy(d)}><Info /> Why</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={!!why} onOpenChange={(o) => !o && setWhy(null)}>
        <DialogContent>
          {why && (<>
            <DialogHeader><DialogTitle>{why.title}</DialogTitle></DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">{why.observation}</p>
              <p className="font-mono text-lg font-semibold">{why.lostRevenue}</p>
              <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs">{why.riskCap}</pre>
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
