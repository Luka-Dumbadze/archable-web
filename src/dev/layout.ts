// src/dev/layout.ts: A2AGraph → positioned @xyflow/react nodes and edges (archable plan §8.3). Not a component.
// ELK "layered", left to right. Edge style by kind: tool = solid, event = dashed, connection (MCP to an outside
// server) = dotted; width grows with log(calls in 24 h) when counts are known. The component only renders these.
import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";
import type { A2AEdge, A2AGraph, A2ANode } from "@/contracts";

export const NODE_W = 220;
export const NODE_H = 84;

export type A2ANodeData = { node: A2ANode; title: string; subtitle: string; external: boolean };
export type A2AEdgeData = { edge: A2AEdge; dash: string | undefined; width: number };

const DASH: Record<A2AEdge["kind"], string | undefined> = { tool: undefined, event: "6 4", connection: "2 4" };

/** Edge width from 24 h call count: 1.5 px at 0 calls, +0.75 px per decade, at most 5 px. */
export const edgeWidth = (calls: number | undefined) =>
  Math.min(5, 1.5 + 0.75 * Math.log10(1 + Math.max(0, calls ?? 0)));

export function nodeSubtitle(n: A2ANode): string {
  if (n.kind === "external") return "outside system";
  const tools = `${n.tools.length} ${n.tools.length === 1 ? "tool" : "tools"}`;
  return n.agent ? `${n.agent} · ${tools}` : tools;
}

const elk = new ELK();

export async function layoutA2A(
  graph: A2AGraph,
  calls: Record<string, number> = {},
): Promise<{ nodes: Node<A2ANodeData>[]; edges: Edge<A2AEdgeData>[] }> {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const edges = graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to));   // never hand ELK a dangling edge
  const laid = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered", "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "140", "elk.spacing.nodeNode": "60",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)).map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
  });
  const pos = new Map((laid.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));

  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: "a2a",
      position: pos.get(n.id) ?? { x: 0, y: 0 },
      width: NODE_W,
      height: NODE_H,
      data: { node: n, title: n.title, subtitle: nodeSubtitle(n), external: n.kind === "external" },
    })),
    edges: edges.map((e) => {
      const width = edgeWidth(calls[e.id]);
      const dash = DASH[e.kind];
      return {
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.label,
        type: "smoothstep",
        data: { edge: e, dash, width },
        style: { strokeWidth: width, ...(dash ? { strokeDasharray: dash } : {}) },
        interactionWidth: 24,
      };
    }),
  };
}
