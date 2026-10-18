import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { D14_CARD } from "@/shared/fixtures/d14";
import { rationaleText } from "@/shared/rationale";
import { chatPrice, fetchDesires, gel, impactChip, postUnlink } from "./desires";
import { demoDesires, demoUnlink, resetDemoDesires } from "./demo-desires";
import { D14_CHATS, D14_DESIRE_ID } from "./fixtures/d14-desire";

const host = vi.hoisted(() => ({ tenant: false }));
vi.mock("@/chat/session", async (orig) => ({ ...(await orig<typeof import("@/chat/session")>()), tenantFromHost: () => (host.tenant ? { slug: "marani", env: "prod" } : null) }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "jwt-dev" } } }) } } }));
const { useDesires } = await import("./use-desires");

const [A, B, C] = D14_CHATS.map((c) => c.chapter_id) as [string, string, string];
const costLine = (d: ReturnType<typeof demoDesires>[number]) => rationaleText(d.rationale_card).split("\n").find((l) => l.includes("did not order")) ?? "(none)";

beforeEach(() => { localStorage.clear(); resetDemoDesires("marani"); });
afterEach(() => { host.tenant = false; vi.unstubAllGlobals(); });

describe("impact chip and prices", () => {
  it("formats like plan §8.5", () => {
    expect(impactChip({ chapters: 3, customers: 3, quoted: 2, abandoned: 2, abandoned_value: 14000, ordered: 0, first_seen: null, last_seen: null })).toBe("3 chats · 140 GEL quoted, not ordered");
    expect(impactChip({ chapters: 1, customers: 1, quoted: 0, abandoned: 0, abandoned_value: 0, ordered: 0, first_seen: null, last_seen: null })).toBe("1 chat · nothing quoted yet");
    expect(impactChip({ chapters: 0, customers: 0, quoted: 0, abandoned: 0, abandoned_value: 0, ordered: 0, first_seen: null, last_seen: null })).toBe("No linked chats");
    expect(gel(8050)).toBe("80.50 GEL");
    expect(D14_CHATS.map(chatPrice)).toEqual(["60 GEL quoted, not ordered", "80 GEL quoted, not ordered", "No price reached"]);
  });
});

describe("demo D-14: unlinking recomputes impact and card", () => {
  it("starts at 3 chats, 140 GEL, with the same card as the change (plan §1.3)", () => {
    const [d] = demoDesires("marani");
    expect(impactChip(d!.impact)).toBe("3 chats · 140 GEL quoted, not ordered");
    expect(d!.chats).toHaveLength(3);
    expect(rationaleText(d!.rationale_card)).toBe(rationaleText(D14_CARD));
  });

  it("unlinking chat A (60 GEL) drops 140 → 80 GEL, and the card's sentences follow", () => {
    const d = demoUnlink("marani", D14_DESIRE_ID, A)!;
    expect(impactChip(d.impact)).toBe("2 chats · 80 GEL quoted, not ordered");
    expect(d.chats.map((c) => c.chapter_id)).toEqual([B, C]);
    expect(costLine(d)).toBe("· 1 of 1 customers who got a price did not order: 80 GEL in baskets.");
    expect(rationaleText(d.rationale_card)).toContain("between 16 Oct and 17 Oct");
  });

  it("unlinking B instead leaves 60 GEL; unlinking both priced chats leaves nothing quoted", () => {
    expect(impactChip(demoUnlink("marani", D14_DESIRE_ID, B)!.impact)).toBe("2 chats · 60 GEL quoted, not ordered");
    const d = demoUnlink("marani", D14_DESIRE_ID, A)!;
    expect(impactChip(d.impact)).toBe("1 chat · nothing quoted yet");
    expect(costLine(d)).toBe("(none)");
  });

  it("unlinking the unpriced chat C changes the count but not the GEL figure", () => {
    expect(impactChip(demoUnlink("marani", D14_DESIRE_ID, C)!.impact)).toBe("2 chats · 140 GEL quoted, not ordered");
  });

  it("persists across a fresh read (a page refresh) and is idempotent", () => {
    demoUnlink("marani", D14_DESIRE_ID, A);
    demoUnlink("marani", D14_DESIRE_ID, A);
    expect(impactChip(demoDesires("marani")[0]!.impact)).toBe("2 chats · 80 GEL quoted, not ordered");
    expect(JSON.parse(localStorage.getItem("archable.demo.unlinked.marani")!)).toEqual([A]);
  });

  it("refuses unknown desires, chats and businesses; other businesses have no demo desires", () => {
    expect(demoUnlink("marani", "nope", A)).toBeNull();
    expect(demoUnlink("marani", D14_DESIRE_ID, "nope")).toBeNull();
    expect(demoUnlink("flora", D14_DESIRE_ID, A)).toBeNull();
    expect(demoDesires("flora")).toEqual([]);
  });

  it("works with blocked storage, in memory", () => {
    const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(impactChip(demoUnlink("marani", D14_DESIRE_ID, A)!.impact)).toBe("2 chats · 80 GEL quoted, not ordered");
    spy.mockRestore();
  });
});

describe("useDesires", () => {
  it("demo: unlink then re-read shows the lower figure; resetDemo restores it", async () => {
    const { result } = renderHook(() => useDesires("marani"));
    await waitFor(() => expect(result.current.load.state).toBe("ready"));
    const chip = () => { const l = result.current.load; return l.state === "ready" ? impactChip(l.desires[0]!.impact) : null; };
    expect(chip()).toBe("3 chats · 140 GEL quoted, not ordered");
    await act(async () => { expect(await result.current.unlink(D14_DESIRE_ID, A)).toBe(true); });
    await waitFor(() => expect(chip()).toBe("2 chats · 80 GEL quoted, not ordered"));
    act(() => result.current.resetDemo());
    await waitFor(() => expect(chip()).toBe("3 chats · 140 GEL quoted, not ordered"));
  });

  it("tenant host: GET the feed, POST the unlink to the chat's path, then re-read", async () => {
    host.tenant = true;
    const f = vi.fn(async (u: string, i?: RequestInit) => new Response(JSON.stringify(i?.method === "POST" ? demoDesires("marani")[0] : demoDesires("marani")), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => useDesires("marani"));
    await waitFor(() => expect(result.current.load).toMatchObject({ state: "ready", demo: false }));
    await act(async () => { await result.current.unlink(D14_DESIRE_ID, A); });
    await waitFor(() => expect(f).toHaveBeenCalledTimes(3));
    const calls = (f.mock.calls as unknown as [string, RequestInit | undefined][]).map(([u, i]) => `${i?.method ?? "GET"} ${u.replace("https://api.archable.run", "")}`);
    expect(calls).toEqual(["GET /v1/dev/desires", `POST /v1/dev/desires/${D14_DESIRE_ID}/chats/${A}/unlink`, "GET /v1/dev/desires"]);
  });

  it("tenant host: a failed unlink is reported and the feed is re-read", async () => {
    host.tenant = true;
    vi.stubGlobal("fetch", vi.fn(async (_u: string, i?: RequestInit) => new Response(i?.method === "POST" ? "{}" : JSON.stringify([]), { status: i?.method === "POST" ? 403 : 200 })));
    const { result } = renderHook(() => useDesires("marani"));
    await waitFor(() => expect(result.current.load.state).toBe("ready"));
    await act(async () => { expect(await result.current.unlink(D14_DESIRE_ID, A)).toBe(false); });
    expect(result.current.error).toBe("forbidden");
  });
});

describe("desires API", () => {
  const client = (token: string | null) => ({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } }) as unknown as SupabaseClient;
  it("sends the session; no session → signed_out without a request; outcomes mapped", async () => {
    const f = vi.fn(async () => new Response("[]"));
    vi.stubGlobal("fetch", f);
    expect(await fetchDesires(client("jwt"))).toEqual({ ok: true, data: [] });
    expect(((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>)["Authorization"]).toBe("Bearer jwt");
    expect(await postUnlink(client(null), "d", "c")).toEqual({ ok: false, reason: "signed_out" });
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));
    expect(await postUnlink(client("jwt"), "d", "c")).toEqual({ ok: false, reason: "not_found" });
  });
});
