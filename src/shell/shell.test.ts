import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Manifest } from "@/contracts";
import { createShell } from "./shell";

const TENANT = "11111111-1111-1111-1111-111111111111";
const manifest = (epoch: number, digest: string): Manifest => ({
  tenant_id: TENANT, slug: "marani", env: "prod", digest, epoch, os_name: "Marani OS",
  branding: { brand: "#7B1E3A", font: "Noto Sans Georgian", radius: "md" }, extension_url: null, topic: `tenant:${TENANT}`,
});

// The API: a manifest that a flip can move, and UI projections by digest.
function api(start: Manifest) {
  const state = { manifest: start, delayManifest: 0 };
  const ui = (digest: string) => ({ screens: [`home@${digest}`] });
  const fetchImpl = vi.fn(async (u: RequestInfo | URL) => {
    const url = String(u);
    if (url.endsWith("/v1/manifest")) {
      const m = state.manifest;
      if (state.delayManifest) await new Promise((r) => setTimeout(r, state.delayManifest));
      return new Response(JSON.stringify(m));
    }
    const d = /\/v1\/bundles\/([^/]+)\/ui$/.exec(url)?.[1];
    if (d) return new Response(JSON.stringify(ui(decodeURIComponent(d))));
    return new Response("{}", { status: 404 });
  });
  const calls = (part: string) => fetchImpl.mock.calls.filter(([u]) => String(u).includes(part)).length;
  return { state, fetchImpl: fetchImpl as unknown as typeof fetch, calls, ui };
}

// Supabase Realtime: captures the channel options, the epoch_flip handler and the status callback.
function realtime(session: { access_token: string } | null = { access_token: "jwt-owner" }) {
  const rt: { topic?: string; opts?: unknown; flip?: (m: { payload?: { epoch?: unknown; digest?: unknown } }) => void; status?: (s: string) => void; removed: boolean } = { removed: false };
  const channel = {
    on: vi.fn((_type: string, filter: { event: string }, cb: (m: { payload?: { epoch?: unknown; digest?: unknown } }) => void) => { if (filter.event === "epoch_flip") rt.flip = cb; return channel; }),
    subscribe: vi.fn((cb: (s: string) => void) => { rt.status = cb; return channel; }),
  };
  const client = {
    auth: { getSession: vi.fn(async () => ({ data: { session } })) },
    realtime: { setAuth: vi.fn(async () => {}) },
    channel: vi.fn((topic: string, opts: unknown) => { rt.topic = topic; rt.opts = opts; return channel; }),
    removeChannel: vi.fn(async () => { rt.removed = true; return "ok"; }),
  };
  return { client: client as unknown as SupabaseClient & typeof client, rt };
}
const settle = () => new Promise((r) => setTimeout(r, 20));

describe("shell boot", () => {
  it("loads the manifest and its UI projection, then joins the private tenant topic with the owner's session", async () => {
    const a = api(manifest(7, "sha256:aaa"));
    const r = realtime();
    const s = createShell({ supabase: r.client, fetch: a.fetchImpl });
    const snap = await s.boot();
    expect(snap).toMatchObject({ status: "ready", manifest: { epoch: 7, digest: "sha256:aaa" }, ui: a.ui("sha256:aaa"), pendingEpoch: null });
    expect(r.client.realtime.setAuth).toHaveBeenCalledWith("jwt-owner");
    expect(r.rt.topic).toBe(`tenant:${TENANT}`);
    expect(r.rt.opts).toEqual({ config: { private: true } });
    r.rt.status?.("SUBSCRIBED");
    expect(s.getSnapshot().live).toBe(true);
  });

  it("boots without Realtime for a visitor with no session", async () => {
    const r = realtime(null);
    const s = createShell({ supabase: r.client, fetch: api(manifest(7, "sha256:aaa")).fetchImpl });
    expect(await s.boot()).toMatchObject({ status: "ready", live: false });
    expect(r.client.channel).not.toHaveBeenCalled();
  });

  it("is unavailable when the manifest can't be read", async () => {
    const s = createShell({ supabase: null, fetch: (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch });
    expect((await s.boot()).status).toBe("unavailable");
  });
});

describe("epoch_flip", () => {
  async function booted() {
    const a = api(manifest(7, "sha256:aaa"));
    const r = realtime();
    const s = createShell({ supabase: r.client, fetch: a.fetchImpl });
    await s.boot();
    return { a, r, s };
  }

  it("stages the new epoch without touching the screen, and swaps on the next navigation", async () => {
    const { a, r, s } = await booted();
    const seen: number[] = [];
    s.subscribe(() => seen.push(s.getSnapshot().manifest!.epoch));
    a.state.manifest = manifest(8, "sha256:bbb");
    r.rt.flip?.({ payload: { epoch: 8, digest: "sha256:bbb" } });
    await settle();
    expect(s.getSnapshot()).toMatchObject({ manifest: { epoch: 7 }, ui: a.ui("sha256:aaa"), pendingEpoch: 8 });
    expect(s.applyPending()).toBe(true);
    expect(s.getSnapshot()).toMatchObject({ manifest: { epoch: 8, digest: "sha256:bbb" }, ui: a.ui("sha256:bbb"), pendingEpoch: null });
    expect(s.applyPending()).toBe(false);
    expect(seen.at(-1)).toBe(8);
  });

  it("ignores a stale or repeated flip without calling the API", async () => {
    const { a, r } = await booted();
    const before = a.calls("/v1/manifest");
    r.rt.flip?.({ payload: { epoch: 7 } });
    r.rt.flip?.({ payload: { epoch: 3 } });
    await settle();
    expect(a.calls("/v1/manifest")).toBe(before);
  });

  it("trusts the manifest over the broadcast: nothing is staged if the manifest hasn't moved", async () => {
    const { r, s } = await booted();
    r.rt.flip?.({ payload: { epoch: 8 } });
    await settle();
    expect(s.getSnapshot().pendingEpoch).toBeNull();
  });

  it("two quick flips end on the newest epoch", async () => {
    const { a, r, s } = await booted();
    a.state.delayManifest = 30;
    a.state.manifest = manifest(8, "sha256:bbb");
    r.rt.flip?.({ payload: { epoch: 8 } });
    await new Promise((x) => setTimeout(x, 5));
    a.state.manifest = manifest(9, "sha256:ccc");
    r.rt.flip?.({ payload: { epoch: 9 } });
    await new Promise((x) => setTimeout(x, 120));
    expect(s.getSnapshot().pendingEpoch).toBe(9);
    s.applyPending();
    expect(s.getSnapshot().manifest?.digest).toBe("sha256:ccc");
  });

  it("an Undo back to an earlier digest reuses the cached projection", async () => {
    const { a, r, s } = await booted();
    a.state.manifest = manifest(8, "sha256:aaa");                 // epoch moves on, digest is one already seen
    r.rt.flip?.({ payload: { epoch: 8 } });
    await settle();
    expect(s.getSnapshot().pendingEpoch).toBe(8);
    expect(a.calls("/v1/bundles/")).toBe(1);
  });

  it("re-reads the manifest after (re)subscribing, to catch a flip missed while offline", async () => {
    const { a, r, s } = await booted();
    a.state.manifest = manifest(8, "sha256:bbb");
    r.rt.status?.("SUBSCRIBED");
    await settle();
    expect(s.getSnapshot().pendingEpoch).toBe(8);
  });

  it("dispose leaves the channel", async () => {
    const { r, s } = await booted();
    await s.dispose();
    expect(r.rt.removed).toBe(true);
  });
});
