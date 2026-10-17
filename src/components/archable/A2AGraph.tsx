import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Node, type NodeProps, type EdgeProps } from "@xyflow/react";
import { Search } from "lucide-react";
import { useA2A, useEdgePulses } from "@/dev/use-a2a";
import type { A2ANodeData } from "@/dev/layout";
import { Button } from "@/components/ui/button";
import { EdgeInspector } from "./EdgeInspector";

function AppNode({ data, selected }: NodeProps<Node<A2ANodeData>>) {
  return <div className={`flex h-full w-full flex-col justify-center rounded-lg border bg-popover px-4 ${data.external ? "border-dashed" : ""} ${selected ? "border-primary ring-2 ring-primary/30" : ""}`}>
    <Handle type="target" position={Position.Left} />
    <div className="break-words text-sm font-medium">{data.title}</div>
    <div className="mt-1 break-words font-mono text-[11px] text-muted-foreground">{data.subtitle}</div>
    <Handle type="source" position={Position.Right} />
  </div>;
}

const SelectEdge = createContext<(id: string) => void>(() => {});
function ConnectionEdge(props: EdgeProps) {
  const select = useContext(SelectEdge);
  const lane = typeof props.data?.["lane"] === "number" ? props.data["lane"] : 0;
  const [defaultPath, defaultX, defaultY] = getSmoothStepPath(props);
  const path = lane ? `M ${props.sourceX} ${props.sourceY} C ${props.sourceX} ${props.sourceY + lane}, ${props.targetX} ${props.targetY + lane}, ${props.targetX} ${props.targetY}` : defaultPath;
  const x = lane ? (props.sourceX + props.targetX) / 2 : defaultX;
  const y = lane ? (props.sourceY + props.targetY) / 2 + lane * 0.75 : defaultY;
  return <><BaseEdge id={props.id} path={path} style={props.style ?? {}} interactionWidth={props.interactionWidth ?? 24} {...(props.markerEnd ? { markerEnd: props.markerEnd } : {})} />
    <EdgeLabelRenderer><div className="nodrag nopan graph-edge-label" style={{ transform: `translate(-50%, -50%) translate(${x}px,${y}px)` }}>
      <Button variant="outline" size="sm" className="h-auto max-w-[220px] whitespace-normal bg-background px-2 py-1 font-mono text-[11px] leading-relaxed" onClick={() => select(props.id)}>{props.label}</Button>
    </div></EdgeLabelRenderer></>;
}
const nodeTypes = { a2a: AppNode };
const edgeTypes = { smoothstep: ConnectionEdge };

export default function A2AGraph() {
  const g = useA2A();
  const pulses = useEdgePulses(g.state === "ready" ? g.data.graph : null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      const target = e.target;
      if (e.key === "/" && !(target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)))) { e.preventDefault(); search.current?.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); };
  }, []);
  const nodes = useMemo(() => g.state === "ready" ? g.data.nodes.map((n) => ({ ...n, selected: !!query.trim() && n.data.title.toLowerCase().includes(query.trim().toLowerCase()), className: query.trim() && !n.data.title.toLowerCase().includes(query.trim().toLowerCase()) ? "opacity-25" : "" })) : [], [g, query]);
  const edges = useMemo(() => {
    if (g.state !== "ready") return [];
    return g.data.edges.map((e) => {
      const siblings = g.data.edges.filter((other) => [other.source, other.target].sort().join("|") === [e.source, e.target].sort().join("|"));
      const index = siblings.findIndex((other) => other.id === e.id);
      const lane = siblings.length > 1 ? 130 + index * 120 : 0;
      return { ...e, data: { ...e.data, lane }, ...(pulses[e.id] ? { style: { ...e.style, stroke: pulses[e.id] === "deny" ? "var(--destructive)" : "var(--primary)", strokeWidth: Number(e.style?.strokeWidth ?? 1.5) + 2 } } : {}) };
    });
  }, [g, pulses]);
  if (g.state === "loading") return <div role="status" aria-label="Loading app map" className="graph-loading h-full bg-background p-6"><div className="h-8 w-44 rounded bg-muted motion-safe:animate-pulse" /><div className="mt-24 flex justify-around gap-6">{[0, 1, 2].map((i) => <div key={i} className="h-20 w-48 rounded-lg border bg-muted/50 motion-safe:animate-pulse" />)}</div></div>;
  if (g.state === "failed") return <div className="flex h-full flex-col items-center justify-center gap-4"><p className="text-sm text-muted-foreground">The app map isn't available right now.</p><Button variant="outline" onClick={g.reload}>Retry</Button></div>;
  const edge = g.data.graph.edges.find((e) => e.id === selected) ?? null;
  return <div className="a2a-map relative h-full min-w-0">
    <SelectEdge.Provider value={setSelected}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: 0.3 }} minZoom={0.15} maxZoom={2} nodesDraggable={false} nodesConnectable={false} onEdgeClick={(_, e) => setSelected(e.id)} onPaneClick={() => setSelected(null)}>
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