import { describe, expect, it } from "vitest";
import type { A2AEdge } from "@/contracts";
import { medianLatency, recordMapCall, simulationCall, type MapCall } from "./map-telemetry";

const edge: A2AEdge = { id: "courier", from: "app:dispatch", to: "conn:courier_api", via: "delivery.status", kind: "connection", transport: "mcp", effect: "none", label: "Courier" };
describe("Map telemetry attribution", () => {
  it("simulation emits an explicitly simulated 18ms tool call without a real request", () => {
    expect(simulationCall(edge, -1)).toEqual({ id: -1, caller: "app:dispatch", tool: "delivery.status", decision: "allow", status: "simulated", latency_ms: 18, turn_id: null });
  });
  it("deduplicates received event IDs while keeping simulations separate", () => {
    const sample: MapCall = { call: simulationCall(edge, 1), at: "2026-10-18T02:32:00Z", simulated: true };
    const live = { ...sample, simulated: false };
    expect(recordMapCall(recordMapCall([sample], live), live)).toHaveLength(2);
  });
  it("calculates observed p50 from valid measurements only", () => {
    const rows = [null, 18, 24, 40, -1].map(latency_ms => ({ call: { ...simulationCall(edge, 1), latency_ms }, at: "now", simulated: false }));
    expect(medianLatency(rows)).toBe(24);
    expect(medianLatency([])).toBeNull();
  });
});