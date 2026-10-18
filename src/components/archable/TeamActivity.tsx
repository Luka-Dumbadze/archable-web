import { useEffect, useState } from "react";
import { ArrowRight, Bot } from "lucide-react";
import { shell, useShell } from "@/shell/use-shell";
import type { ToolCallEvent } from "@/shell/shell";

const samples = [
  { from: "Contact Center Agent", to: "Operations Agent", text: "New order M-001 confirmed", tone: "app-contact" },
  { from: "Operations Agent", to: "Storage", text: "Stock reserved", tone: "app-operations" },
  { from: "Cedar", to: "Contact Center Agent", text: "Quote authorized", tone: "app-team" },
];

export function TeamActivity() {
  const { status, manifest, live } = useShell();
  const [calls, setCalls] = useState<ToolCallEvent[]>([]);
  const tenant = manifest?.tenant_id;
  useEffect(() => {
    setCalls([]);
    if (status !== "ready" || !tenant) return;
    return shell().onToolCall(call => setCalls(previous => [...previous.filter(item => item.id !== call.id), call]));
  }, [tenant, status]);
  const rows = status === "ready" ? calls.map(call => ({ from: call.caller, to: call.tool, text: call.decision === "deny" ? "Held back" : call.status === "ok" ? "Completed" : call.status === "error" ? "Could not complete" : call.status === "simulated" ? "Test completed" : "Held back", tone: "app-team" })) : samples;
  return <section aria-label="Agent activity">
    <div className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground"><span>Recent activity</span><span>{status === "ready" ? live ? "Live" : "Connecting…" : "Sample data"}</span></div>
    {rows.length === 0 ? <p className="py-8 text-sm text-muted-foreground">{live ? "Waiting for agent activity." : "Live activity isn't connected right now."}</p> : <ol className="divide-y divide-border" aria-live="polite">{rows.map((item, index) => <li key={index} className="flex min-w-0 gap-4 py-6"><span className={`app-badge ${item.tone} flex size-9 shrink-0 items-center justify-center rounded-full`}><Bot className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground [overflow-wrap:anywhere]"><span>{item.from}</span><ArrowRight className="size-3 shrink-0" /><span>{item.to}</span></div><p className="mt-2 break-words text-sm">{item.text}</p></div></li>)}</ol>}
  </section>;
}