// src/dev/api.ts: Developer Mode data (archable plan §8.3, apps/api/src/routes/devmode.ts). Not a component.
// Both calls carry the signed-in member's Supabase session; the API takes the tenant from the page's origin
// and refuses staff (403). The graph comes from the active bundle, so it is always there when the API is.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { A2AGraph, EdgeDetail } from "@/contracts";
import { API } from "@/chat/session";

export type DevFailure = "signed_out" | "forbidden" | "not_found" | "unavailable";
export type DevResult<T> = { ok: true; data: T } | { ok: false; reason: DevFailure };

export const DEV_TIMEOUT_MS = 15_000;

async function get<T>(client: SupabaseClient | null, path: string, timeoutMs = DEV_TIMEOUT_MS): Promise<DevResult<T>> {
  if (!client) return { ok: false, reason: "unavailable" };
  const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
  const token = data.session?.access_token;
  if (!token) return { ok: false, reason: "signed_out" };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: abort.signal });
    if (r.status === 401) return { ok: false, reason: "signed_out" };
    if (r.status === 403) return { ok: false, reason: "forbidden" };
    if (r.status === 404) return { ok: false, reason: "not_found" };
    if (!r.ok) return { ok: false, reason: "unavailable" };
    return { ok: true, data: (await r.json()) as T };
  } catch {
    return { ok: false, reason: "unavailable" };          // network, CORS or timeout: never a spinner forever
  } finally {
    clearTimeout(timer);
  }
}

export const fetchA2A = (client: SupabaseClient | null, timeoutMs?: number) =>
  get<A2AGraph>(client, "/v1/dev/a2a", timeoutMs);

/** Edge ids contain ':', '>' and '.', so they are URL-encoded as one path segment. */
export const fetchEdgeDetail = (client: SupabaseClient | null, edgeId: string, timeoutMs?: number) =>
  get<EdgeDetail>(client, `/v1/dev/a2a/edges/${encodeURIComponent(edgeId)}`, timeoutMs);
