import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchA2A, fetchEdgeDetail } from "./api";
import { edgeWidth, layoutA2A, nodeSubtitle } from "./layout";
import { MARANI_A2A, MARANI_TOOLS, maraniEdgeDetail } from "./fixtures/marani";

describe("Marani fixture (compiler output, plan §1.2)", () => {
  it("has the 4 nodes and the 6 edges of plan §1.2, with their transports", () => {
    expect(MARANI_A2A.nodes.map((n) => [n.id, n.kind])).toEqual([
      ["app:contact_center", "app"], ["app:customer_center", "app"], ["app:quickshipper", "app"], ["conn:courier_api", "external"],
    ]);
    expect(MARANI_A2A.edges.map((e) => `${e.from} ──[${e.label}]──▶ ${e.to} (${e.transport})`).sort()).toEqual([
      "app:contact_center ──[A2A event: order.status → confirmed]──▶ app:quickshipper (in_process)",
      "app:contact_center ──[A2A tool: customer.upsert]──▶ app:customer_center (in_process)",
      "app:contact_center ──[A2A tool: delivery.status]──▶ app:quickshipper (in_process)",
      "app:quickshipper ──[A2A event: delivery_job.status → picked_up|delivered|failed]──▶ app:contact_center (in_process)",
      "app:quickshipper ──[A2A tool: handoff.staff]──▶ app:contact_center (in_process)",
      "app:quickshipper ──[MCP: delivery.dispatch]──▶ conn:courier_api (mcp)",
    ]);
  });

  it("gives tool and MCP edges their contract, event edges none, and at most 20 recent calls", () => {
    for (const e of MARANI_A2A.edges) {
      const d = maraniEdgeDetail(e.id)!;
      if (e.kind === "event") { expect(d.contract).toBeNull(); expect(d.elva.playground_url).toBeNull(); }
      else { expect(d.contract).toMatchObject({ tool: e.via, operation_id: MARANI_TOOLS[e.via]!.operation_id }); expect(d.elva.playground_url).toContain(encodeURIComponent(e.via)); }
      expect(d.recent.length).toBeLessThanOrEqual(20);
      expect(d.stats.window).toBe("24h");
    }
    expect(maraniEdgeDetail("tool:nope")).toBeNull();
  });

  it("denied calls on delivery.status cite the privacy policy", () => {
    const d = maraniEdgeDetail("tool:app:contact_center->app:quickshipper:delivery.status")!;
    expect(d.stats).toMatchObject({ calls: 142, denied: 9 });
    expect(d.recent.filter((c) => c.decision === "deny").every((c) => c.policies.includes("privacy.status_needs_phone"))).toBe(true);
  });
});

describe("layoutA2A", () => {
  it("positions every node, left to right along the flow, with no overlaps", async () => {
    const { nodes } = await layoutA2A(MARANI_A2A);
    expect(nodes).toHaveLength(4);
    const x = Object.fromEntries(nodes.map((n) => [n.id, n.position.x]));
    expect(x["app:contact_center"]).toBeLessThan(x["app:customer_center"]!);
    expect(x["app:quickshipper"]).toBeLessThan(x["conn:courier_api"]!);
    const boxes = nodes.map((n) => [n.position.x, n.position.y, n.position.x + n.width!, n.position.y + n.height!] as const);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i]!, boxes[j]!];
      expect(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]).toBe(true);
    }
  });

  it("styles edges by kind: tool solid, event dashed, MCP dotted; labels and data kept", async () => {
    const { edges } = await layoutA2A(MARANI_A2A);
    const byKind = (k: string) => edges.filter((e) => e.data!.edge.kind === k);
    expect(byKind("tool").every((e) => !("strokeDasharray" in (e.style ?? {})))).toBe(true);
    expect(byKind("event").every((e) => e.style?.strokeDasharray === "6 4")).toBe(true);
    expect(byKind("connection").map((e) => [e.label, e.style?.strokeDasharray, e.target])).toEqual([["MCP: delivery.dispatch", "2 4", "conn:courier_api"]]);
    expect(edges).toHaveLength(6);
  });

  it("widens edges with log(calls) and is deterministic", async () => {
    const id = "tool:app:contact_center->app:quickshipper:delivery.status";
    const a = await layoutA2A(MARANI_A2A, { [id]: 142 });
    const b = await layoutA2A(MARANI_A2A, { [id]: 142 });
    expect(a).toEqual(b);
    expect(a.edges.find((e) => e.id === id)!.data!.width).toBeCloseTo(edgeWidth(142));
    expect(edgeWidth(0)).toBe(1.5);
    expect(edgeWidth(1e9)).toBe(5);
    expect(edgeWidth(142)).toBeGreaterThan(edgeWidth(6));
  });

  it("drops an edge to a node that isn't in the graph instead of failing", async () => {
    const g = { nodes: MARANI_A2A.nodes, edges: [...MARANI_A2A.edges, { ...MARANI_A2A.edges[0]!, id: "x", to: "conn:missing" }] };
    expect((await layoutA2A(g)).edges.map((e) => e.id)).not.toContain("x");
  });

  it("node cards: agent and tool count for apps, 'outside system' for external", () => {
    expect(MARANI_A2A.nodes.map(nodeSubtitle)).toEqual(["cellar_master · 5 tools", "1 tool", "dispatch_node · 4 tools", "outside system"]);
  });
});

describe("dev API", () => {
  const client = (token: string | null) =>
    ({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } }) as unknown as SupabaseClient;
  afterEach(() => vi.unstubAllGlobals());

  it("sends the session and encodes the edge id as one path segment", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(maraniEdgeDetail(MARANI_A2A.edges[0]!.id))));
    vi.stubGlobal("fetch", f);
    const id = "connection:app:quickshipper->conn:courier_api:delivery.dispatch";
    expect((await fetchEdgeDetail(client("jwt"), id)).ok).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.archable.run/v1/dev/a2a/edges/${encodeURIComponent(id)}`);
    expect(url).not.toContain(">");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer jwt");
  });

  it.each([[401, "signed_out"], [403, "forbidden"], [404, "not_found"], [500, "unavailable"]] as const)("maps %i to %s", async (status, reason) => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status }));
    expect(await fetchA2A(client("jwt"))).toEqual({ ok: false, reason });
  });

  it("no session → signed_out without a request; no client or a hang → unavailable", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await fetchA2A(client(null))).toEqual({ ok: false, reason: "signed_out" });
    expect(f).not.toHaveBeenCalled();
    expect(await fetchA2A(null)).toEqual({ ok: false, reason: "unavailable" });
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) => new Promise((_, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted")))));
    expect(await fetchA2A(client("jwt"), 30)).toEqual({ ok: false, reason: "unavailable" });
  });
});
