import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Node, type Edge, type EdgeProps, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import { Search } from "lucide-react";
import { useShell } from "@/shell/use-shell";
import { useA2A, useEdgePulses } from "@/dev/use-a2a";
import type { A2AEdgeData, A2ANodeData } from "@/dev/layout";
import { NODE_W, NODE_H, type Point } from "@/dev/layout";
import type { A2AGraph } from "@/contracts";
import { Button } from "@/components/ui/button";
import { EdgeInspector } from "./EdgeInspector";

function AppNode({ data, selected }: NodeProps<Node<A2ANodeData>>) {
  const { status, live } = useShell();
  return <div className={`flex h-full w-full flex-col justify-center rounded-lg border bg-popover px-4 ${data.external ? "border-dashed" : ""} ${selected ? "border-primary ring-2 ring-primary/30" : ""}`}>
    <Handle type="target" position={Position.Left} />
    <div className="flex items-start gap-2"><span title={status === "ready" && live ? "Connected" : "Sample topology"} className={`mt-1 size-1.5 shrink-0 rounded-full ${status === "ready" && live ? "bg-success" : "bg-muted-foreground"}`} /><span className="break-words text-sm font-medium">{data.title}</span></div>
    <div className="mt-1 break-words font-mono text-[11px] text-muted-foreground">{data.subtitle}</div>
    <Handle type="source" position={Position.Right} />
  </div>;
}

/** Polyline through the layout's route with slightly rounded corners (radius 8 px where the segments allow). */
export function roundedPath(points: Point[], radius = 8): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length < 2 || !first || !last) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];
    if (!p || !prev || !next) continue;
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y) || 1;
    const outLen = Math.hypot(next.x - p.x, next.y - p.y) || 1;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = { x: p.x - ((p.x - prev.x) / inLen) * r, y: p.y - ((p.y - prev.y) / inLen) * r };
    const b = { x: p.x + ((next.x - p.x) / outLen) * r, y: p.y + ((next.y - p.y) / outLen) * r };
    d += ` L ${a.x} ${a.y} Q ${p.x} ${p.y} ${b.x} ${b.y}`;
  }
  return `${d} L ${last.x} ${last.y}`;
}

const SelectEdge = createContext<(id: string) => void>(() => {});
export function ConnectionEdge(props: EdgeProps<Edge<A2AEdgeData>>) {
  const select = useContext(SelectEdge);
  const points = props.data?.points ?? [];
  const box = props.data?.label ?? null;
  const [fallback] = getSmoothStepPath({ sourceX: props.sourceX, sourceY: props.sourceY, targetX: props.targetX, targetY: props.targetY });
  const path = points.length >= 2 ? roundedPath(points) : fallback;
  return <><BaseEdge id={props.id} path={path} style={props.style ?? {}} interactionWidth={props.interactionWidth ?? 24} {...(props.markerEnd ? { markerEnd: props.markerEnd } : {})} />
    {box && <EdgeLabelRenderer><div className="graph-edge-label nodrag nopan" style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.width }}>
      <Button variant="outline" size="sm" className="h-auto w-full whitespace-normal bg-background px-2 py-1 font-mono text-[11px] leading-relaxed" onClick={() => select(props.id)}>{props.label}</Button>
    </div></EdgeLabelRenderer>}</>;
}
const nodeTypes = { a2a: AppNode };
const edgeTypes = { smoothstep: ConnectionEdge };

/** Smallest rectangle covering every node and every layout-placed label box (flow coordinates). */
export function contentBounds(nodes: Node<A2ANodeData>[], edges: { data?: A2AEdgeData }[]): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  };
  for (const n of nodes) grow(n.position.x, n.position.y, n.width ?? NODE_W, n.height ?? NODE_H);
  for (const e of edges) { const l = e.data?.label; if (l) grow(l.x, l.y, l.width, l.height); }
  return minX === Infinity ? null : { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export default function A2AGraph() {
  const g = useA2A();
  const pulses = useEdgePulses(g.state === "ready" ? g.data.graph : null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const fittedFor = useRef<A2AGraph | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      const target = e.target;
      if (e.key === "/" && !(target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)))) { e.preventDefault(); search.current?.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); };
  }, []);
  // Fit the view to nodes *and* layout-placed labels, so no label is cropped in the default view.
  useEffect(() => {
    if (!instance || g.state !== "ready" || fittedFor.current === g.data.graph) return;
    const bounds = contentBounds(g.data.nodes, g.data.edges);
    if (!bounds) return;
    fittedFor.current = g.data.graph;
    instance.fitBounds(bounds, { padding: 0.2 });
  }, [instance, g]);
  const nodes = useMemo(() => g.state === "ready" ? g.data.nodes.map((n) => ({ ...n, selected: !!query.trim() && n.data.title.toLowerCase().includes(query.trim().toLowerCase()), className: query.trim() && !n.data.title.toLowerCase().includes(query.trim().toLowerCase()) ? "opacity-25" : "" })) : [], [g, query]);
  const edges = useMemo(() => {
    if (g.state !== "ready") return [];
    // Routes, dashes and label boxes come straight from the maintained layout; only live pulses restyle here.
    return g.data.edges.map((e) => pulses[e.id]
      ? { ...e, style: { ...e.style, stroke: pulses[e.id] === "deny" ? "var(--destructive)" : "var(--primary)", strokeWidth: Number(e.style?.strokeWidth ?? 1.5) + 2 } }
      : e);
  }, [g, pulses]);
  if (g.state === "loading") return <div role="status" aria-label="Loading app map" className="graph-loading h-full bg-background p-6"><div className="h-8 w-44 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-24 flex justify-around gap-6">{[0, 1, 2].map((i) => <div key={i} className="h-20 w-48 rounded-lg border bg-muted/50 motion-safe:animate-pulse" />)}</div></div>;
  if (g.state === "failed") return <div className="flex h-full flex-col items-center justify-center gap-4"><p className="text-sm text-muted-foreground">The app map isn't available right now.</p><Button variant="outline" onClick={g.reload}>Retry</Button></div>;
  const edge = g.data.graph.edges.find((e) => e.id === selected) ?? null;
  return <div className="a2a-map relative h-full min-w-0">
    <SelectEdge.Provider value={setSelected}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onInit={setInstance} minZoom={0.15} maxZoom={2} nodesDraggable={false} nodesConnectable={false} onEdgeClick={(_, e) => setSelected(e.id)} onPaneClick={() => setSelected(null)}>
      <Background gap={24} color="var(--border)" /><Controls showInteractive={false} />
    </ReactFlow></SelectEdge.Provider>
    <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] items-center gap-2 rounded-md border bg-background px-3 py-2"><Search className="size-3.5 shrink-0 text-muted-foreground" /><input ref={search} aria-label="Search nodes" placeholder="Search nodes" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 w-36 bg-transparent text-xs outline-none" />{g.demo && <span className="shrink-0 border-l pl-2 text-[10px] text-muted-foreground">Sample data</span>}</div>
    {query.trim() && <div role="status" className="absolute left-3 top-16 rounded border bg-background px-2 py-1 text-xs text-muted-foreground">{nodes.filter((n) => n.selected).length} matches</div>}
    <details className="absolute bottom-3 right-3 w-[calc(100%-70px)] rounded-md border bg-background text-xs md:hidden">
      <summary className="cursor-pointer px-3 py-2">Connections</summary>
      <div className="max-h-64 overflow-y-auto border-t p-1">{g.data.edges.map((e) => <Button key={e.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left font-mono text-[11px]" onClick={() => setSelected(e.id)}>{e.label}</Button>)}</div>
    </details>
    <EdgeInspector edge={edge} graph={g.data.graph} onClose={() => setSelected(null)} />
  </div>;
}
