import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolCallEvent } from "@/shell/shell";
import { MARANI_A2A, maraniEdgeDetail } from "./fixtures/marani";

// The page's host decides demo vs API; the shell's onToolCall feeds pulses. Both are controlled here.
const host = vi.hoisted(() => ({ tenant: false }));
const feed = vi.hoisted(() => ({ listeners: new Set<(e: ToolCallEvent) => void>() }));
const api = vi.hoisted(() => ({ a2a: vi.fn(), edge: vi.fn() }));
vi.mock("@/chat/session", async (orig) => ({ ...(await orig<typeof import("@/chat/session")>()), tenantFromHost: () => (host.tenant ? { slug: "marani", env: "prod" } : null) }));
vi.mock("@/shell/use-shell", () => ({ shell: () => ({ onToolCall: (l: (e: ToolCallEvent) => void) => { feed.listeners.add(l); return () => feed.listeners.delete(l); } }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("./api", async (orig) => ({ ...(await orig<typeof import("./api")>()), fetchA2A: api.a2a, fetchEdgeDetail: api.edge }));
const { PULSE_MS, useA2A, useEdgeDetail, useEdgePulses, withLiveCall } = await import("./use-a2a");

const call = (tool: string, decision: "allow" | "deny" = "allow"): ToolCallEvent =>
  ({ id: 1, caller: "agent:cellar_master", tool, decision, status: decision === "deny" ? "denied" : "ok", latency_ms: 12, turn_id: "t" });

afterEach(() => { host.tenant = false; api.a2a.mockReset(); api.edge.mockReset(); vi.useRealTimers(); });

describe("useA2A", () => {
  it("serves the compiled Marani graph, laid out, on non-tenant hosts (demo)", async () => {
    const { result } = renderHook(() => useA2A());
    await waitFor(() => expect(result.current.state).toBe("ready"));
    const r = result.current as Extract<typeof result.current, { state: "ready" }>;
    expect(r.demo).toBe(true);
    expect(r.data.nodes).toHaveLength(4);
    expect(r.data.edges).toHaveLength(6);
    expect(api.a2a).not.toHaveBeenCalled();
  });

  it("on a tenant host calls the API, and a failure ends in a reason, not a spinner; reload retries", async () => {
    host.tenant = true;
    api.a2a.mockResolvedValueOnce({ ok: false, reason: "unavailable" }).mockResolvedValueOnce({ ok: true, data: MARANI_A2A });
    const { result } = renderHook(() => useA2A());
    await waitFor(() => expect(result.current).toMatchObject({ state: "failed", reason: "unavailable" }));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ state: "ready", demo: false }));
    expect(api.a2a).toHaveBeenCalledTimes(2);
  });
});

describe("useEdgeDetail", () => {
  const id = "tool:app:contact_center->app:quickshipper:delivery.status";
  it("is idle with no edge, loads the fixture in demo mode, and reports a missing edge", async () => {
    const { result, rerender } = renderHook(({ e }: { e: string | null }) => useEdgeDetail(e), { initialProps: { e: null as string | null } });
    expect(result.current.state).toBe("idle");
    rerender({ e: id });
    await waitFor(() => expect(result.current).toMatchObject({ state: "ready", data: { edge: { id } } }));
    rerender({ e: "tool:nope" });
    await waitFor(() => expect(result.current).toMatchObject({ state: "failed", reason: "not_found" }));
  });

  it("on a tenant host uses the API", async () => {
    host.tenant = true;
    api.edge.mockResolvedValue({ ok: true, data: maraniEdgeDetail(id) });
    const { result } = renderHook(() => useEdgeDetail(id));
    await waitFor(() => expect(result.current).toMatchObject({ state: "ready", demo: false }));
    expect(api.edge).toHaveBeenCalledWith(expect.anything(), id);
  });
});

describe("useEdgePulses", () => {
  it("pulses the edge whose via is the call's tool for 600 ms, red for deny; events and unknown tools don't pulse", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEdgePulses(MARANI_A2A));
    act(() => { for (const l of feed.listeners) l(call("delivery.status", "deny")); });
    expect(result.current).toEqual({ "tool:app:contact_center->app:quickshipper:delivery.status": "deny" });
    act(() => { for (const l of feed.listeners) l(call("delivery.dispatch")); });
    expect(result.current["connection:app:quickshipper->conn:courier_api:delivery.dispatch"]).toBe("allow");
    act(() => { for (const l of feed.listeners) { l(call("dispatch_on_confirm")); l(call("order.create")); } });
    expect(Object.keys(result.current)).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(PULSE_MS + 1); });
    expect(result.current).toEqual({});
  });

  it("stops listening when unmounted", () => {
    const { unmount } = renderHook(() => useEdgePulses(MARANI_A2A));
    expect(feed.listeners.size).toBe(1);
    unmount();
    expect(feed.listeners.size).toBe(0);
  });
});

describe("live calls in the inspector (P5.D1.3: a turn elsewhere increments the count)", () => {
  const id = "tool:app:contact_center->app:quickshipper:delivery.status";
  it("a matching call raises calls/denied and heads the recent list; other tools change nothing", async () => {
    const { result } = renderHook(() => useEdgeDetail(id));
    await waitFor(() => expect(result.current.state).toBe("ready"));
    const before = (result.current as { data: { stats: { calls: number; denied: number } } }).data.stats;
    act(() => { for (const l of feed.listeners) l({ ...call("delivery.status", "deny"), id: 77001 }); });
    act(() => { for (const l of feed.listeners) l({ ...call("order.create"), id: 77002 }); });
    const after = (result.current as { data: { stats: { calls: number; denied: number }; recent: { id: number }[] } }).data;
    expect(after.stats.calls).toBe(before.calls + 1);
    expect(after.stats.denied).toBe(before.denied + 1);
    expect(after.recent[0]?.id).toBe(77001);
    expect(after.recent.length).toBeLessThanOrEqual(20);
  });

  it("event edges count their trigger's calls; a repeated broadcast isn't counted twice", () => {
    const ev = maraniEdgeDetail("event:app:quickshipper->app:contact_center:notify_on_job_status")!;
    const c = { ...call("customer.notify"), id: 5, caller: "trigger:notify_on_job_status" };
    const once = withLiveCall(ev, c);
    expect(once.stats.calls).toBe(ev.stats.calls + 1);
    expect(withLiveCall(once, c)).toBe(once);
    expect(withLiveCall(ev, { ...c, caller: "agent:cellar_master" })).toBe(ev);
  });
});
