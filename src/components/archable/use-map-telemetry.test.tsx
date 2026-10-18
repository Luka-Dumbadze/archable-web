import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolCallEvent } from "@/shell/shell";
import { MARANI_A2A } from "@/dev/fixtures/marani";
import { useMapTelemetry } from "./use-map-telemetry";
const mock = vi.hoisted(() => ({ listener: undefined as ((call: ToolCallEvent) => void) | undefined, off: vi.fn() }));
vi.mock("@/shell/use-shell", () => ({ useShell: () => ({ status: "ready", live: true, manifest: { tenant_id: "tenant" } }), shell: () => ({ onToolCall: (listener: (call: ToolCallEvent) => void) => { mock.listener = listener; return mock.off; } }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); mock.listener = undefined; });
describe("Map live and simulated activity", () => {
  it("receives matching broadcasts, deduplicates counts, and clears the flash after 600ms", () => {
    vi.useFakeTimers();
    const edge = MARANI_A2A.edges.find(item => item.kind === "tool");
    if (!edge) throw new Error("Missing tool edge");
    const { result, unmount } = renderHook(() => useMapTelemetry(MARANI_A2A, false));
    const call: ToolCallEvent = { id: 7, caller: edge.from, tool: edge.via, decision: "deny", status: "denied", latency_ms: 24, turn_id: null };
    act(() => { mock.listener?.(call); mock.listener?.(call); });
    expect(result.current.calls).toHaveLength(1);
    expect(result.current.calls[0]?.simulated).toBe(false);
    expect(result.current.flashes[edge.id]).toBe("deny");
    act(() => vi.advanceTimersByTime(599));
    expect(result.current.flashes[edge.id]).toBe("deny");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.flashes[edge.id]).toBeUndefined();
    unmount(); expect(mock.off).toHaveBeenCalledTimes(1);
  });
  it("increments only local simulated activity outside a live connection", () => {
    const { result } = renderHook(() => useMapTelemetry(MARANI_A2A, true));
    expect(mock.listener).toBeUndefined();
    act(() => result.current.simulate());
    expect(result.current.calls).toHaveLength(1);
    expect(result.current.calls[0]?.simulated).toBe(true);
    expect(result.current.calls[0]?.call.status).toBe("simulated");
    expect(result.current.connected).toBe(false);
  });
});