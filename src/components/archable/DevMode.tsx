import { useEffect, useMemo, useState } from "react";
import { GitPullRequest, Info, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Business, Desire, Edge } from "@/lib/businesses";

const W = 720, H = 400;

/** Places any number of agent nodes evenly on an ellipse — straight edges, no arcs. */
export function layoutNodes(ids: string[]) {
  const n = ids.length;
  const pos: Record<string, { x: number; y: number }> = {};
  if (n === 1) { pos[ids[0]!] = { x: W / 2, y: H / 2 }; return pos; }
  if (n === 2) { pos[ids[0]!] = { x: 160, y: H / 2 }; pos[ids[1]!] = { x: W - 160, y: H / 2 }; return pos; }
  ids.forEach((id, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n + (n === 4 ? Math.PI / 4 : 0);
    pos[id] = { x: W / 2 + Math.cos(a) * 250, y: H / 2 + Math.sin(a) * 135 };
  });
  return pos;
}

export function DevMode({ b }: { b: Business }) {
  const [edge, setEdge] = useState<Edge | null>(null);
  const [why, setWhy] = useState<Desire | null>(null);
  const pos = useMemo(() => layoutNodes(b.nodes.map((n) => n.id)), [b]);
  const [lat, setLat] = useState(() => Object.fromEntries(b.edges.map((e) => [e.id, e.latency])));
  useEffect(() => {
    const t = setInterval(() => setLat(Object.fromEntries(b.edges.map((e) => [e.id, Math.max(8, e.latency + Math.round((Math.random() - 0.5) * 6))]))), 1500);
    return () => clearInterval(t);
  }, [b]);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <section className="rounded-xl border bg-card xl:col-span-2">
        <div className="flex items-center justify-between px-6 pt-5 text-sm font-medium">
          Agent graph <span className="font-mono text-xs text-muted-foreground">{b.nodes.length} agents · {b.edges.length} tools</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full p-4">
          {b.edges.map((e) => {
            const a = pos[e.from], c = pos[e.to];
            if (!a || !c) return null;
            const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
            return (
              <g key={e.id} className="cursor-pointer" onClick={() => setEdge(e)}>
                <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="transparent" strokeWidth={22} />
                <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="var(--border)" strokeWidth={1.5} />
                <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="var(--primary-glow)" strokeOpacity={0.6} strokeWidth={1.5} className="edge-flow" />
                <circle r={3} fill="var(--primary-glow)">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path={`M${a.x},${a.y} L${c.x},${c.y}`} />
                </circle>
                <foreignObject x={mx - 100} y={my - 13} width={200} height={26}>
                  <div className="flex h-full items-center justify-center">
                    <span className="rounded border bg-background px-2 py-0.5 whitespace-nowrap font-mono text-[11px] hover:border-primary">
                      {e.tool} <span className="text-muted-foreground">{lat[e.id]}ms</span>
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
          {b.nodes.map((n) => {
            const p = pos[n.id]!;
            return (
              <foreignObject key={n.id} x={p.x - 75} y={p.y - 26} width={150} height={52}>
                <div className="flex h-full flex-col justify-center rounded-lg border bg-background px-3">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium"><span className="size-1.5 animate-pulse rounded-full bg-primary" />{n.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{n.sub}</div>
                </div>
              </foreignObject>
            );
          })}
        </svg>
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

      <Sheet open={!!edge} onOpenChange={(o) => !o && setEdge(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {edge && (<>
            <SheetHeader>
              <SheetTitle className="font-mono">{edge.tool}</SheetTitle>
              <SheetDescription>{b.nodes.find((n) => n.id === edge.from)?.label} → {b.nodes.find((n) => n.id === edge.to)?.label}</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4">
              {(["input", "output"] as const).map((k) => (
                <div key={k}>
                  <div className="mb-1.5 font-mono text-xs text-muted-foreground">{k}</div>
                  <pre className="overflow-auto rounded-md border bg-background p-3 font-mono text-xs">{JSON.stringify(edge[k], null, 2)}</pre>
                </div>
              ))}
              <div className="font-mono text-xs text-muted-foreground">{lat[edge.id]}ms</div>
              <Button className="w-full" onClick={() => toast("Opening Elva Playground…")}><ExternalLink /> Open in Elva Playground</Button>
            </div>
          </>)}
        </SheetContent>
      </Sheet>

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
