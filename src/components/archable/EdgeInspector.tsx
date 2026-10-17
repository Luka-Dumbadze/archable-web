import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useEdgeDetail } from "@/dev/use-a2a";
import type { A2AEdge, A2AGraph } from "@/contracts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SchemaTree } from "./SchemaTree";

export function EdgeInspector({ edge, graph, onClose }: { edge: A2AEdge | null; graph: A2AGraph; onClose: () => void }) {
  const d = useEdgeDetail(edge?.id ?? null);
  const mobile = useIsMobile();
  const data = d.state === "ready" && d.data.edge.id === edge?.id ? d.data : null;
  const title = (id: string) => graph.nodes.find((n) => n.id === id)?.title ?? id;
  return <Sheet open={edge !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent side={mobile ? "bottom" : "right"} className={mobile ? "max-h-[85dvh] overflow-y-auto rounded-t-lg" : "w-full overflow-y-auto sm:max-w-2xl"}>
      <SheetHeader className="pr-7 text-left">
        <SheetTitle className="break-words text-base">{edge?.label ?? "Connection"}</SheetTitle>
        <SheetDescription className="break-words">{edge && `${title(edge.from)} → ${title(edge.to)}`}</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-6">
        {d.state === "failed" ? <p role="alert" className="text-sm text-muted-foreground">No data for this connection right now.</p> : !data ? <div role="status" aria-label="Loading connection" className="space-y-4 motion-safe:animate-pulse"><div className="h-16 rounded bg-muted" /><div className="h-32 rounded bg-muted" /></div> : <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`rounded border px-2 py-1 text-xs ${data.elva.sync === "drift" ? "border-warning/40 text-warning" : data.elva.sync === "in_sync" ? "border-success/40 text-success" : "text-muted-foreground"}`}>Elva · {data.elva.sync === "in_sync" ? "In sync" : data.elva.sync === "drift" ? "Drift" : "Unknown"}</span>
            {data.elva.playground_url && <Button asChild size="sm" variant="outline"><a href={data.elva.playground_url} target="_blank" rel="noopener noreferrer"><ExternalLink />Open in Elva Playground</a></Button>}
          </div>
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Contract</h3>
            {data.edge.kind === "event" ? <p className="text-sm text-muted-foreground">This is an event; it has no tool contract.</p> : data.contract ? <>
              <p className="text-xs text-muted-foreground">{data.contract.description}</p>
              <SchemaTree label="Input" value={data.contract.input} open />
              {data.contract.output === null ? <p className="py-1 font-mono text-xs text-muted-foreground">Output: No output</p> : <SchemaTree label="Output" value={data.contract.output} open />}
              <p className="font-mono text-[11px] text-muted-foreground">{data.contract.operation_id}</p>
            </> : <p className="text-sm text-muted-foreground">No contract is available.</p>}
          </section>
          <section>
            <h3 className="mb-3 text-sm font-medium">Last 24 h</h3>
            <dl className="grid grid-cols-3 gap-3 border-y py-4 sm:grid-cols-5">
              {[["Calls", data.stats.calls], ["Denied", data.stats.denied], ["Errors", data.stats.errors], ["p50 ms", data.stats.p50_ms], ["p95 ms", data.stats.p95_ms]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-sm">{value ?? "—"}</dd></div>)}
            </dl>
          </section>
          <section>
            <h3 className="mb-3 text-sm font-medium">Recent calls</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground"><tr>{["Time", "Caller", "Decision", "Status", "Latency", "Policies"].map((h) => <th key={h} className="border-b px-2 py-2 font-normal">{h}</th>)}</tr></thead>
                <tbody>{data.recent.slice(0, 20).map((call) => <tr key={call.id} className="border-b hover:bg-secondary/50">
                  <td className="whitespace-nowrap px-2 py-3 font-mono">{call.turn_id ? <Link to="/dev/turns/$id" params={{ id: call.turn_id }} className="underline underline-offset-4" title={call.at}>{new Date(call.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Link> : <time dateTime={call.at}>{new Date(call.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}</td>
                  <td className="px-2 py-3 font-mono">{call.caller}</td><td className={`px-2 py-3 ${call.decision === "deny" ? "text-destructive" : "text-success"}`}>{call.decision}</td><td className="px-2 py-3">{call.status}</td><td className="whitespace-nowrap px-2 py-3 font-mono">{call.latency_ms === null ? "—" : `${call.latency_ms} ms`}</td><td className="px-2 py-3 font-mono">{call.policies.join(", ") || "—"}</td>
                </tr>)}</tbody>
              </table>
            </div>
            {!data.recent.length && <p className="py-4 text-xs text-muted-foreground">No recent calls.</p>}
          </section>
        </>}
      </div>
    </SheetContent>
  </Sheet>;
}