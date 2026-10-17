// src/dev/use-a2a.ts: Developer Mode hooks for the A2A graph and edge inspector (archable plan §8.3).
// Hooks, not components. On a tenant host they call the API; elsewhere (Lovable preview, localhost) they
// serve the compiled Marani fixture, so the screen is always demonstrable. Every load ends: data or a reason.
import { useEffect, useRef, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { A2AGraph, EdgeDetail } from "@/contracts";
import { supabase } from "@/lib/supabase";
import { tenantFromHost } from "@/chat/session";
import { shell } from "@/shell/use-shell";
import { fetchA2A, fetchEdgeDetail, type DevFailure } from "./api";
import { layoutA2A, type A2AEdgeData, type A2ANodeData } from "./layout";
import { MARANI_A2A, maraniEdgeDetail } from "./fixtures/marani";

export type Load<T> =
  | { state: "loading" }
  | { state: "ready"; data: T; demo: boolean }
  | { state: "failed"; reason: DevFailure };

const demoHost = () => typeof window === "undefined" || !tenantFromHost(window.location.hostname);

export interface LaidOutGraph { graph: A2AGraph; nodes: Node<A2ANodeData>[]; edges: Edge<A2AEdgeData>[] }

/** The graph, laid out. Call reload() after a failure. */
export function useA2A(): Load<LaidOutGraph> & { reload: () => void } {
  const [load, setLoad] = useState<Load<LaidOutGraph>>({ state: "loading" });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setLoad({ state: "loading" });
    void (async () => {
      const demo = demoHost();
      const r = demo ? { ok: true as const, data: MARANI_A2A } : await fetchA2A(supabase);
      if (!r.ok) { if (live) setLoad({ state: "failed", reason: r.reason }); return; }
      const laid = await layoutA2A(r.data);
      if (live) setLoad({ state: "ready", data: { graph: r.data, ...laid }, demo });
    })();
    return () => { live = false; };
  }, [n]);
  return { ...load, reload: () => setN((x) => x + 1) };
}

/** The inspector's data for one edge; idle while edgeId is null (panel closed). */
export function useEdgeDetail(edgeId: string | null): Load<EdgeDetail> | { state: "idle" } {
  const [load, setLoad] = useState<Load<EdgeDetail> | { state: "idle" }>({ state: "idle" });
  useEffect(() => {
    if (!edgeId) { setLoad({ state: "idle" }); return; }
    let live = true;
    setLoad({ state: "loading" });
    void (async () => {
      if (demoHost()) {
        const d = maraniEdgeDetail(edgeId);
        if (live) setLoad(d ? { state: "ready", data: d, demo: true } : { state: "failed", reason: "not_found" });
        return;
      }
      const r = await fetchEdgeDetail(supabase, edgeId);
      if (live) setLoad(r.ok ? { state: "ready", data: r.data, demo: false } : { state: "failed", reason: r.reason });
    })();
    return () => { live = false; };
  }, [edgeId]);
  return load;
}

export const PULSE_MS = 600;

/**
 * Live pulses: edge id → "allow" | "deny" for PULSE_MS after a matching tool_call broadcast. A call matches the
 * edges whose `via` is its tool (tool and connection edges; event edges carry trigger ids, not tools).
 */
export function useEdgePulses(graph: A2AGraph | null): Record<string, "allow" | "deny"> {
  const [pulses, setPulses] = useState<Record<string, "allow" | "deny">>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    if (!graph) return;
    const byTool = new Map<string, string[]>();
    for (const e of graph.edges) if (e.kind !== "event") byTool.set(e.via, [...(byTool.get(e.via) ?? []), e.id]);
    const off = shell().onToolCall((call) => {
      for (const id of byTool.get(call.tool) ?? []) {
        setPulses((p) => ({ ...p, [id]: call.decision }));
        clearTimeout(timers.current.get(id));
        timers.current.set(id, setTimeout(() => setPulses(({ [id]: _, ...rest }) => rest), PULSE_MS));
      }
    });
    const pending = timers.current;
    return () => { off(); for (const t of pending.values()) clearTimeout(t); pending.clear(); };
  }, [graph]);
  return pulses;
}
