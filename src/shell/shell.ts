// src/shell/shell.ts: shell boot and live epoch swaps (archable v3 §2.4, plan P5.D1.1). Not a component.
//   1. GET /v1/manifest: the API resolves the tenant from this page's Origin (never from the client).
//   2. GET /v1/bundles/:digest/ui: the UI projection. A digest never changes meaning, so it's cached forever.
//   3. Subscribe to the private Realtime topic tenant:<id> (members only, via RLS on realtime.messages).
//   4. On epoch_flip: re-read the manifest (the source of truth), fetch the new projection and hold it as
//      `pending`. The UI swaps when the app calls applyPending(), on the next navigation: no reload, and
//      nothing changes under the owner's hands mid-screen.
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Manifest } from "@/contracts";
import { API } from "@/chat/session";

export interface ShellSnapshot {
  status: "booting" | "ready" | "unavailable";
  manifest: Manifest | null;
  ui: unknown;                       // the bundle's UI projection (v3 §2.4); shape owned by the compiler
  pendingEpoch: number | null;       // a newer epoch is loaded and will apply on the next navigation
  live: boolean;                     // subscribed to epoch_flip
}

export interface ShellDeps {
  supabase: SupabaseClient | null;   // null: no Realtime (env not set); the shell still boots
  fetch?: typeof fetch;
}

type Staged = { manifest: Manifest; ui: unknown };

/** A tool_calls row as broadcast on tenant:<id> (migration 20261018000000, private.tool_calls_broadcast). */
export interface ToolCallEvent {
  id: number; caller: string; tool: string; decision: "allow" | "deny";
  status: "ok" | "error" | "denied" | "simulated"; latency_ms: number | null; turn_id: string | null;
}

export function createShell(d: ShellDeps) {
  const f = d.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const uiCache = new Map<string, unknown>();
  const listeners = new Set<() => void>();
  const toolCallListeners = new Set<(e: ToolCallEvent) => void>();
  let snap: ShellSnapshot = { status: "booting", manifest: null, ui: null, pendingEpoch: null, live: false };
  let pending: Staged | null = null;
  let channel: RealtimeChannel | null = null;
  let refreshing: Promise<void> | null = null;
  let again = false;

  const set = (patch: Partial<ShellSnapshot>) => { snap = { ...snap, ...patch }; for (const l of listeners) l(); };

  async function getManifest(): Promise<Manifest> {
    const r = await f(`${API}/v1/manifest`, { cache: "no-store" });
    if (!r.ok) throw new Error(`manifest ${r.status}`);
    return (await r.json()) as Manifest;
  }
  async function getUi(digest: string): Promise<unknown> {
    if (uiCache.has(digest)) return uiCache.get(digest);
    const r = await f(`${API}/v1/bundles/${encodeURIComponent(digest)}/ui`);
    if (!r.ok) throw new Error(`ui ${r.status}`);
    const ui: unknown = await r.json();
    uiCache.set(digest, ui);
    return ui;
  }

  // After a flip: stage the newest epoch the manifest reports. Stale or duplicate broadcasts change nothing.
  async function refresh(): Promise<void> {
    const m = await getManifest();
    const shown = snap.manifest?.epoch ?? -1;
    const staged = pending?.manifest.epoch ?? -1;
    if (m.epoch <= Math.max(shown, staged)) return;
    pending = { manifest: m, ui: await getUi(m.digest) };
    set({ pendingEpoch: m.epoch });
  }
  function onFlip(payload: { epoch?: unknown }) {
    const epoch = typeof payload.epoch === "number" ? payload.epoch : Infinity;   // unknown: let the manifest decide
    if (epoch <= (pending?.manifest.epoch ?? snap.manifest?.epoch ?? -1)) return;
    if (refreshing) { again = true; return; }                  // a flip during a refresh: read the manifest once more after
    refreshing = (async () => {
      do { again = false; await refresh().catch(() => {}); } while (again);
    })().finally(() => { refreshing = null; });
  }

  async function subscribe(topic: string) {
    const sb = d.supabase;
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    if (!data.session) return;                                  // members only: anonymous visitors don't subscribe
    await sb.realtime.setAuth(data.session.access_token);
    channel = sb.channel(topic, { config: { private: true } })
      .on("broadcast", { event: "epoch_flip" }, (msg: { payload?: { epoch?: unknown } }) => onFlip(msg.payload ?? {}))
      .on("broadcast", { event: "tool_call" }, (msg: { payload?: Partial<ToolCallEvent> }) => {
        const e = msg.payload;
        if (!e || typeof e.tool !== "string" || (e.decision !== "allow" && e.decision !== "deny")) return;
        for (const l of toolCallListeners) l(e as ToolCallEvent);
      })
      .subscribe((status) => {
        set({ live: status === "SUBSCRIBED" });
        if (status === "SUBSCRIBED") onFlip({});               // catch a flip that happened while (re)connecting
      });
  }

  return {
    getSnapshot: () => snap,
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },

    /** Boots once: manifest, projection, then the live subscription. */
    async boot(): Promise<ShellSnapshot> {
      try {
        const m = await getManifest();
        set({ status: "ready", manifest: m, ui: await getUi(m.digest) });
        await subscribe(m.topic).catch(() => set({ live: false }));
      } catch {
        set({ status: "unavailable" });
      }
      return snap;
    },

    /** Live tool calls on this tenant (Developer Mode's graph pulses). One channel serves both events. */
    onToolCall(l: (e: ToolCallEvent) => void): () => void {
      toolCallListeners.add(l);
      return () => { toolCallListeners.delete(l); };
    },

    /** Call on navigation: shows the newer epoch if one is staged. Returns whether it swapped. */
    applyPending(): boolean {
      if (!pending) return false;
      const p = pending;
      pending = null;
      set({ manifest: p.manifest, ui: p.ui, pendingEpoch: null });
      return true;
    },

    async dispose() {
      if (channel && d.supabase) await d.supabase.removeChannel(channel);
      channel = null;
      listeners.clear();
      toolCallListeners.clear();
    },
  };
}

export type Shell = ReturnType<typeof createShell>;
