import { useEffect, useState } from "react";
import { Radio, Terminal } from "lucide-react";
import { shell, useShell } from "@/shell/use-shell";
import type { ToolCallEvent } from "@/shell/shell";

const samples: ToolCallEvent[] = [
  { id: 1, caller: "agent:contact_center", tool: "cellar.reserve", decision: "allow", status: "ok", latency_ms: 19, turn_id: null },
  { id: 2, caller: "agent:dispatch_node", tool: "delivery.dispatch", decision: "deny", status: "denied", latency_ms: 12, turn_id: null },
  { id: 3, caller: "agent:cellar_master", tool: "crm.notify", decision: "allow", status: "ok", latency_ms: 24, turn_id: null },
];

export function appendActivity(previous: ToolCallEvent[], call: ToolCallEvent): ToolCallEvent[] {
  return [...previous.filter(item => item.id !== call.id), call].slice(-200);
}

export function TeamActivity() {
  const { status, manifest, live } = useShell();
  const [calls, setCalls] = useState<ToolCallEvent[]>([]);
  const tenant = manifest?.tenant_id;
  useEffect(() => {
    setCalls([]);
    if (status !== "ready" || !tenant) return;
    return shell().onToolCall(call => setCalls(previous => appendActivity(previous, call)));
  }, [tenant, status]);
  const demo = status !== "ready";
  const connected = status === "ready" && live;
  const rows = demo ? samples : calls;
  return <section aria-label="Agent activity" className="min-w-0 space-y-6">
    <div className="grid gap-3 sm:grid-cols-3">{["Cellar Master", "Dispatch Node", "Cedar Policy Engine"].map((name, i) => <div key={name} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-4"><span className="text-xs font-medium">{name}</span><span className={`flex items-center gap-1.5 text-[10px] ${connected ? "text-success" : "text-muted-foreground"}`}><span className={`size-1.5 rounded-full ${connected ? "bg-success" : "bg-muted-foreground"}`} />{demo ? "Sample" : !connected ? "Connecting" : i === 2 ? "Guarding" : "Active"}</span></div>)}</div>
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><h2 className="flex items-center gap-2 font-mono text-xs"><Terminal className="size-4 text-muted-foreground" />AI Team / event stream</h2><span className="flex items-center gap-2 text-[11px] text-muted-foreground"><Radio className={`size-3 ${connected ? "text-success" : ""}`} />{demo ? "Sample data" : connected ? "Live" : "Connecting…"}</span></header>
      <div className="min-h-[380px] max-h-[650px] overflow-y-auto p-4 sm:p-6">
        {rows.length === 0 ? <p className="py-8 font-mono text-xs text-muted-foreground">{live ? "Waiting for agent activity." : "Live activity isn't connected right now."}</p> : <ol aria-live="polite" className="space-y-5 font-mono text-xs">{rows.map(item => <li key={item.id} className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-3 leading-relaxed"><span className="pt-0.5 text-[10px] text-muted-foreground">{String(item.id).padStart(3, "0")}</span><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 [overflow-wrap:anywhere]"><span className="text-success">dispatch</span><span>{item.caller}</span><span className="text-muted-foreground">→</span><span>{item.tool}</span></div><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"><span className="text-muted-foreground">Cedar policy</span><span className={item.decision === "deny" ? "text-destructive" : "text-success"}>{item.decision}</span><span className="text-muted-foreground">status</span><span className={item.status === "error" || item.status === "denied" ? "text-destructive" : "text-muted-foreground"}>{item.status}</span><span className="text-muted-foreground">{item.latency_ms === null ? "—" : `${item.latency_ms} ms`}</span></div></div></li>)}</ol>}
      </div>
    </div>
  </section>;
  </section>;
}