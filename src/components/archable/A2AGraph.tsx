import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Node, type Edge, type EdgeProps, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import { Search, Zap, Radio } from "lucide-react";
import { useA2A, useEdgePulses, callOnEdge } from "@/dev/use-a2a";
import type { A2AEdgeData, A2ANodeData } from "@/dev/layout";
import { NODE_W, NODE_H, type Point } from "@/dev/layout";
import type { A2AGraph } from "@/contracts";
import { Button } from "@/components/ui/button";
import { EdgeInspector } from "./EdgeInspector";
import { useMapTelemetry } from "./use-map-telemetry";
import { medianLatency, nodeCalls, type MapCall } from "./map-telemetry";
import { maraniEdgeDetail } from "@/dev/fixtures/marani";

const Telemetry = createContext<{ graph: A2AGraph | null; calls: MapCall[]; flashes: Record<string, "allow" | "deny">; demo: boolean; connected: boolean }>({ graph: null, calls: [], flashes: {}, demo: false, connected: false });

function AppNode({ data, selected }: NodeProps<Node<A2ANodeData>>) {
  const telemetry = useContext(Telemetry);
  const received = telemetry.graph ? nodeCalls(telemetry.graph, data.node.id, telemetry.calls.filter(item => !item.simulated)) : [];
  const samples = telemetry.demo && telemetry.graph ? telemetry.graph.edges.filter(edge => edge.to === data.node.id || edge.from === data.node.id).flatMap(edge => maraniEdgeDetail(edge.id)?.recent ?? []).map(call => ({ call, at: call.at, simulated: false })) : [];
  const latency = medianLatency(received.length ? received : samples);
  return <div className={`telemetry-node ${data.external ? "telemetry-external border-dashed" : ""} ${selected ? "ring-2 ring-primary/30" : ""}`}>
    <Handle type="target" position={Position.Left} />
    <div className="flex min-w-0 items-center justify-between gap-1"><span className="min-w-0 break-words text-[11px] font-semibold leading-tight">{data.title}</span><span className={`telemetry-health ${telemetry.connected || telemetry.demo ? "is-active" : ""}`}><span className="radar-dot"><span /></span>{telemetry.demo ? "SAMPLE" : telemetry.connected ? received.length ? "ACTIVE" : "CONNECTED" : "OFFLINE"}</span></div>
    <div className="mt-1 font-mono text-[8px] text-muted-foreground">{data.external ? "MCP External" : "In-Process Engine"}</div>
    <div className="mt-1 flex flex-wrap items-center justify-between gap-1 font-mono text-[9px]"><span>p50: {latency === null ? "—" : `${latency}ms`}{telemetry.demo && latency !== null ? " · sample" : ""}</span><span className="rounded-full border px-1 text-muted-foreground">{data.node.tools.length} Tools Mounted</span></div>
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
  const telemetry = useContext(Telemetry);
  const edge = props.data?.edge;
  const external = edge?.transport === "mcp";
  const received = edge ? telemetry.calls.filter(item => !item.simulated && callOnEdge(edge, item.call)) : [];
  const simulated = edge ? telemetry.calls.filter(item => item.simulated && callOnEdge(edge, item.call)) : [];
  const stats = telemetry.demo && edge ? maraniEdgeDetail(edge.id)?.stats : null;
  const latency = received.length ? medianLatency(received) : stats?.p50_ms ?? null;
  const flash = telemetry.flashes[props.id];
  const active = telemetry.connected || telemetry.demo || !!flash;
  const points = props.data?.points ?? [];
  const box = props.data?.label ?? null;
  const [fallback] = getSmoothStepPath({ sourceX: props.sourceX, sourceY: props.sourceY, targetX: props.targetX, targetY: props.targetY });
  const path = points.length >= 2 ? roundedPath(points) : fallback;
  return <><BaseEdge id={props.id} path={path} style={props.style ?? {}} interactionWidth={props.interactionWidth ?? 24} {...(props.markerEnd ? { markerEnd: props.markerEnd } : {})} />
    {active && <path d={path} className={`telemetry-flow ${external ? "telemetry-external" : ""}`} fill="none" pointerEvents="none" />}
    {flash && <path key={`${flash}-${telemetry.calls.at(-1)?.at}`} d={path} className={`telemetry-flash flash-${flash}`} fill="none" pointerEvents="none" />}
    {box && <EdgeLabelRenderer><div className="graph-edge-label nodrag nopan" style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.width }}>
      <Button variant="outline" size="sm" className="h-auto w-full whitespace-normal bg-background px-1 py-1 font-mono text-[9px] leading-3" onClick={() => select(props.id)}><span className="block w-full"><span className="block">{props.label}</span><span className={`telemetry-edge-metric ${external ? "telemetry-external" : ""}`}>{stats ? `${stats.calls + received.length} calls · ${latency ?? "—"}ms · sample` : `${received.length} observed · ${latency === null ? "—" : `${latency}ms`}`}{simulated.length > 0 && <span className="block text-warning">+{simulated.length} simulated</span>}</span></span></Button>
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
  for (const e of edges) { const l = e.data?.label; if (l) grow(l.x, l.y, l.width, l.height + 32); }
  return minX === Infinity ? null : { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export default function A2AGraph() {
  const g = useA2A();
  const graph = g.state === "ready" ? g.data.graph : null;
  const telemetry = useMapTelemetry(graph, g.state === "ready" && g.demo);
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
      ? { ...e, style: { ...e.style, stroke: pulses[e.id] === "deny" ? "var(--destructive)" : "var(--success)", strokeWidth: Number(e.style?.strokeWidth ?? 1.5) + 2 } }
      : e);
  }, [g, pulses]);
  if (g.state === "loading") return <div role="status" aria-label="Loading app map" className="graph-loading h-full bg-background p-6"><div className="h-8 w-44 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-24 flex justify-around gap-6">{[0, 1, 2].map((i) => <div key={i} className="h-20 w-48 rounded-lg border bg-muted/50 motion-safe:animate-pulse" />)}</div></div>;
  if (g.state === "failed") return <div className="flex h-full flex-col items-center justify-center gap-4"><p className="text-sm text-muted-foreground">The app map isn't available right now.</p><Button variant="outline" onClick={g.reload}>Retry</Button></div>;
  const edge = g.data.graph.edges.find((e) => e.id === selected) ?? null;
  const latest = telemetry.calls.at(-1);
  const telemetryValue = { ...telemetry, graph: g.data.graph, demo: g.demo };
  return <Telemetry.Provider value={telemetryValue}><div className="a2a-map telemetry-map relative flex h-full min-w-0 flex-col">
    <div className="map-toolbar flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-2"><Search className="size-3.5 shrink-0 text-muted-foreground" /><input ref={search} aria-label="Search nodes" placeholder="Search nodes" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 w-28 bg-transparent text-xs outline-none" /></div>
      <div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"><Radio className={`size-3 ${telemetry.connected ? "text-success" : "text-warning"}`} />{g.demo ? `Sample system · ${g.data.graph.edges.length} connections` : telemetry.connected ? `Stream connected · ${g.data.graph.edges.length} mapped connections` : "Telemetry disconnected"}</span><Button size="sm" variant="outline" onClick={telemetry.simulate} disabled={!g.data.graph.edges.length}><Zap className="size-3.5 text-warning" />Simulate Traffic</Button><span role="status" aria-label="Simulated calls" className="font-mono text-[10px] text-warning">{telemetry.calls.filter(item => item.simulated).length} simulated</span></div>
    </div>
    <div className="relative min-h-0 flex-1">
    <SelectEdge.Provider value={setSelected}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onInit={setInstance} minZoom={0.15} maxZoom={2} nodesDraggable={false} nodesConnectable={false} onEdgeClick={(_, e) => setSelected(e.id)} onPaneClick={() => setSelected(null)}>
      <Background gap={24} color="var(--telemetry-grid)" /><Controls showInteractive={false} />
    </ReactFlow></SelectEdge.Provider>
    {query.trim() && <div role="status" className="absolute left-3 top-3 rounded-full border bg-card px-2 py-1 text-xs text-muted-foreground">{nodes.filter((n) => n.selected).length} matches</div>}
    <details className="absolute bottom-3 right-3 w-[calc(100%-70px)] rounded-md border bg-background text-xs md:hidden">
      <summary className="cursor-pointer px-3 py-2">Connections</summary>
      <div className="max-h-64 overflow-y-auto border-t p-1">{g.data.edges.map((e) => <Button key={e.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left font-mono text-[11px]" onClick={() => setSelected(e.id)}>{e.label}</Button>)}</div>
    </details>
    </div>
    <div className="map-event-ticker flex min-h-11 items-center gap-2 px-3 py-2 font-mono text-[10px]" role="log" aria-label="Latest map event"><span className="shrink-0 text-success">●</span>{latest ? <span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="text-muted-foreground">[{new Date(latest.at).toLocaleTimeString("en-GB")}]</span> {latest.simulated ? "SIMULATED · " : "LIVE · "}{latest.call.caller} → {latest.call.tool} <span className={latest.call.decision === "deny" ? "text-destructive" : "text-success"}>({latest.call.status}, {latest.call.latency_ms ?? "—"}ms)</span></span> : <span className="text-muted-foreground">{g.demo ? "Sample topology · Waiting for test traffic" : "Waiting for live tool calls"}</span>}</div>
    <EdgeInspector edge={edge} graph={g.data.graph} onClose={() => setSelected(null)} />
  </div></Telemetry.Provider>;
}
