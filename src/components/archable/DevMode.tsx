import { useEffect, useState } from "react";
import { GitPullRequest, Info, ExternalLink, Network, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Business, Desire, Edge } from "@/lib/businesses";

const POS: Record<string, { x: number; y: number }> = { contact: { x: 140, y: 170 }, logistics: { x: 560, y: 80 }, crm: { x: 560, y: 280 } };

export function DevMode({ b }: { b: Business }) {
  const [edge, setEdge] = useState<Edge | null>(null);
  const [why, setWhy] = useState<Desire | null>(null);
  const [lat, setLat] = useState(() => Object.fromEntries(b.edges.map((e) => [e.id, e.latency])));
  useEffect(() => {
    const t = setInterval(() => setLat(Object.fromEntries(b.edges.map((e) => [e.id, Math.max(8, e.latency + Math.round((Math.random() - 0.5) * 8))]))), 1200);
    return () => clearInterval(t);
  }, [b]);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-xl border bg-card xl:col-span-2">
        <div className="flex items-center justify-between border-b px-4 py-2.5 text-sm font-medium">
          <span className="flex items-center gap-2"><Network className="size-4 text-primary" />A2A MCP Communication Graph</span>
          <span className="font-mono text-xs text-muted-foreground">click an edge to inspect contract</span>
        </div>
        <div className="relative bg-grid">
          <svg viewBox="0 0 720 360" className="w-full">
            {b.edges.map((e) => {
              const a = POS[e.from], c = POS[e.to];
              const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
              return (
                <g key={e.id} className="cursor-pointer" onClick={() => setEdge(e)}>
                  <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="transparent" strokeWidth={24} />
                  <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="var(--primary)" strokeOpacity={0.25} strokeWidth={2} />
                  <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="var(--primary-glow)" strokeWidth={2} className="edge-flow" />
                  <circle r={4} fill="var(--primary-glow)">
                    <animateMotion dur="1.8s" repeatCount="indefinite" path={`M${a.x},${a.y} L${c.x},${c.y}`} />
                  </circle>
                  <foreignObject x={mx - 80} y={my - 16} width={160} height={32}>
                    <div className="flex h-full items-center justify-center">
                      <span className="rounded border border-primary/40 bg-background px-2 py-0.5 font-mono text-[11px] hover:border-primary">
                        {e.tool} <span className="text-success">{lat[e.id]}ms</span>
                      </span>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
            {b.nodes.map((n) => {
              const p = POS[n.id];
              return (
                <foreignObject key={n.id} x={p.x - 85} y={p.y - 32} width={170} height={64}>
                  <div className="flex h-full flex-col justify-center rounded-lg border border-primary/50 bg-card px-3 shadow-glow">
                    <div className="flex items-center gap-1.5 text-sm font-medium"><span className="size-1.5 animate-pulse rounded-full bg-success" />{n.label}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{n.sub}</div>
                  </div>
                </foreignObject>
              );
            })}
          </svg>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium"><Sparkles className="size-4 text-primary" />Structured Desires Feed</div>
        <div className="space-y-3 p-3">
          {b.desires.map((d) => (
            <div key={d.id} className="rounded-lg border bg-secondary/40 p-3">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-primary">{d.id}</span>
                <span className="rounded border border-warning/40 px-1.5 text-warning">{d.status}</span>
                <span className="rounded border px-1.5 text-muted-foreground">Tier {d.tier}</span>
              </div>
              <div className="mt-2 font-medium">{d.title}</div>
              <div className="mt-3 text-[11px] text-muted-foreground">Impact witness path</div>
              <div className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[11px]">
                {d.witness.map((w, i) => <span key={w} className="flex items-center gap-1"><span className="rounded bg-background px-1.5 py-0.5">{w}</span>{i < d.witness.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}</span>)}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => toast(`Opening PR ${d.pr}`, { description: "github.com/archable/" + b.id + "-os" })}><GitPullRequest /> Review PR on GitHub</Button>
                <Button size="sm" variant="outline" onClick={() => setWhy(d)}><Info /> View Rationale</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Sheet open={!!edge} onOpenChange={(o) => !o && setEdge(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {edge && (<>
            <SheetHeader>
              <SheetTitle className="font-mono">{edge.tool}</SheetTitle>
              <SheetDescription>Elva MCP Contract Inspector · {b.nodes.find((n) => n.id === edge.from)?.label} → {b.nodes.find((n) => n.id === edge.to)?.label}</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4">
              {(["input", "output"] as const).map((k) => (
                <div key={k}>
                  <div className="mb-1 font-mono text-xs uppercase text-muted-foreground">{k} schema</div>
                  <pre className="overflow-auto rounded-md border bg-sidebar p-3 font-mono text-xs text-accent-foreground">{JSON.stringify(edge[k], null, 2)}</pre>
                </div>
              ))}
              <div className="font-mono text-xs text-muted-foreground">p50 latency: <span className="text-success">{lat[edge.id]}ms</span> · transport: mcp/a2a · auth: cedar</div>
              <Button className="w-full" onClick={() => toast("Launching Elva Playground…")}><ExternalLink /> Open in Elva Playground</Button>
            </div>
          </>)}
        </SheetContent>
      </Sheet>

      <Dialog open={!!why} onOpenChange={(o) => !o && setWhy(null)}>
        <DialogContent>
          {why && (<>
            <DialogHeader>
              <DialogTitle>{why.id}: {why.title}</DialogTitle>
              <DialogDescription>Explainability report generated by the governance agent.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div><div className="font-mono text-xs text-muted-foreground">OBSERVATION</div><p>{why.observation}</p></div>
              <div><div className="font-mono text-xs text-muted-foreground">ESTIMATED LOST REVENUE</div><p className="text-lg font-semibold text-warning">{why.lostRevenue}</p></div>
              <div><div className="font-mono text-xs text-muted-foreground">CEDAR RISK CAP</div><pre className="mt-1 whitespace-pre-wrap rounded-md border bg-sidebar p-3 font-mono text-xs">{why.riskCap}</pre></div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
