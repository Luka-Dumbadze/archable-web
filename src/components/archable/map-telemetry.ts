import type { A2AEdge, A2AGraph } from "@/contracts";
import type { ToolCallEvent } from "@/shell/shell";
import { callOnEdge } from "@/dev/use-a2a";

export interface MapCall { call: ToolCallEvent; at: string; simulated: boolean }
export function recordMapCall(previous: MapCall[], next: MapCall): MapCall[] {
  return [...previous.filter(item => item.call.id !== next.call.id || item.simulated !== next.simulated), next].slice(-200);
}
export function medianLatency(calls: MapCall[]): number | null {
  const values = calls.map(item => item.call.latency_ms).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (!values.length) return null;
  return values[Math.floor((values.length - 1) / 2)] ?? null;
}
export function nodeCalls(graph: A2AGraph, id: string, calls: MapCall[]): MapCall[] {
  const routes = graph.edges.filter(edge => edge.from === id || edge.to === id);
  return calls.filter(item => routes.some(edge => callOnEdge(edge, item.call)));
}
export function simulationCall(edge: A2AEdge, id: number): ToolCallEvent {
  return { id, caller: edge.kind === "event" ? `trigger:${edge.via}` : edge.from, tool: edge.via, decision: "allow", status: "simulated", latency_ms: 18, turn_id: null };
}