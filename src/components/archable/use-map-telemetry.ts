import { useEffect, useRef, useState } from "react";
import type { A2AGraph } from "@/contracts";
import { callOnEdge } from "@/dev/use-a2a";
import { shell, useShell } from "@/shell/use-shell";
import { recordMapCall, simulationCall, type MapCall } from "./map-telemetry";

export function useMapTelemetry(graph: A2AGraph | null, demo: boolean) {
  const { status, manifest, live } = useShell();
  const [calls, setCalls] = useState<MapCall[]>([]);
  const [flashes, setFlashes] = useState<Record<string, "allow" | "deny">>({});
  const sequence = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const connected = !demo && status === "ready" && live;
  const tenant = manifest?.tenant_id;
  const ingest = (item: MapCall) => {
    if (!graph) return;
    setCalls(previous => recordMapCall(previous, item));
    for (const edge of graph.edges.filter(edge => callOnEdge(edge, item.call))) {
      setFlashes(previous => ({ ...previous, [edge.id]: item.call.decision }));
      clearTimeout(timers.current.get(edge.id));
      timers.current.set(edge.id, setTimeout(() => {
        setFlashes(({ [edge.id]: _, ...rest }) => rest);
        timers.current.delete(edge.id);
      }, 600));
    }
  };
  useEffect(() => {
    setCalls([]); setFlashes({}); sequence.current = 0;
    const pending = timers.current;
    const off = graph && connected && tenant ? shell().onToolCall(call => {
      if (typeof call.id !== "number" || typeof call.caller !== "string" || typeof call.tool !== "string") return;
      ingest({ call, at: new Date().toISOString(), simulated: call.status === "simulated" });
    }) : () => {};
    return () => { off(); for (const timer of pending.values()) clearTimeout(timer); pending.clear(); };
  }, [graph, connected, tenant]);
  const simulate = () => {
    if (!graph?.edges.length) return;
    const index = sequence.current++;
    const edge = graph.edges[index % graph.edges.length];
    if (!edge) return;
    ingest({ call: simulationCall(edge, -(index + 1)), at: new Date().toISOString(), simulated: true });
  };
  return { calls, flashes, connected, simulate };
}