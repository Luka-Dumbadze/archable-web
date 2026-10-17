import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tryTurn } from "./try-turn";

const client = (token: string | null) =>
  ({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null }, error: null }) } }) as unknown as SupabaseClient;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("tryTurn", () => {
  it("posts the text with the owner's session and returns reply, sent and trace", async () => {
    const f = vi.fn(async () => json(200, { turn_id: "turn-1", reply: "Yes, we have Saperavi 2019.", sent: true, trace: "/dev/turns/turn-1" }));
    vi.stubGlobal("fetch", f);
    expect(await tryTurn(client("jwt-1"), "Do you have Saperavi 2019?", { thread: "abc123" }))
      .toEqual({ ok: true, turnId: "turn-1", reply: "Yes, we have Saperavi 2019.", sent: true, trace: "/dev/turns/turn-1" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.archable.run/v1/turns");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer jwt-1");
    expect(JSON.parse(String(init.body))).toEqual({ text: "Do you have Saperavi 2019?", env: "prod", thread: "abc123" });
  });

  it("reports a blocked draft as sent: false with the holding reply", async () => {
    vi.stubGlobal("fetch", async () => json(200, { turn_id: "t", reply: "One moment, a colleague will reply.", sent: false, trace: "/dev/turns/t" }));
    expect(await tryTurn(client("jwt"), "where is M-00012?")).toMatchObject({ ok: true, sent: false });
  });

  it("is signed_out without a session or on 401", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await tryTurn(client(null), "hi")).toEqual({ ok: false, reason: "signed_out" });
    expect(f).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", async () => json(401, { error: "unauthorized" }));
    expect(await tryTurn(client("expired"), "hi")).toEqual({ ok: false, reason: "signed_out" });
  });

  it("is rejected on 400", async () => {
    vi.stubGlobal("fetch", async () => json(400, { error: "bad_request" }));
    expect(await tryTurn(client("jwt"), "x".repeat(3000))).toEqual({ ok: false, reason: "rejected" });
  });

  it("is unavailable on 500, on a network error and without a Supabase client", async () => {
    vi.stubGlobal("fetch", async () => json(500, { error: "turn_failed", turn_id: "t" }));
    expect(await tryTurn(client("jwt"), "hi")).toEqual({ ok: false, reason: "unavailable" });
    vi.stubGlobal("fetch", async () => { throw new TypeError("Failed to fetch"); });
    expect(await tryTurn(client("jwt"), "hi")).toEqual({ ok: false, reason: "unavailable" });
    expect(await tryTurn(null, "hi")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("stops waiting after the timeout instead of hanging", async () => {
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) => new Promise((_, reject) =>
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))));
    const t0 = Date.now();
    expect(await tryTurn(client("jwt"), "hi", { timeoutMs: 50 })).toEqual({ ok: false, reason: "unavailable" });
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it("takes env from a preview host", async () => {
    window.history.replaceState(null, "", "/");
    const f = vi.fn(async () => json(200, { turn_id: "t", reply: "ok", sent: true, trace: "/dev/turns/t" }));
    vi.stubGlobal("fetch", f);
    await tryTurn(client("jwt"), "hi", { env: "pr-58" });
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).env).toBe("pr-58");
  });
});
