// src/owner/try-turn.ts: Owner Mode's "Try as customer" client for POST /v1/turns (archable plan §5.6).
// Not a component. The caller is the signed-in owner: the request carries their Supabase session as a bearer
// token, and the API takes the tenant from the page's origin, never from the body. Same engine, same Cedar,
// same pre-send checks as a real customer turn; nothing is sent to a real customer (ReplyTarget "console").
import type { SupabaseClient } from "@supabase/supabase-js";
import { API, tenantFromHost } from "@/chat/session";

/** POST /v1/turns 200 body (archable apps/api/src/routes/turn.ts). */
export interface TryTurnResponse {
  turn_id: string;
  reply: string;     // what the customer would have received: the draft, or the holding reply
  sent: boolean;     // Cedar's message.send verdict: false means the pre-send check blocked the draft
  trace: string;     // shell path to the turn's trace, e.g. /dev/turns/<id>
}

export type TryTurnResult =
  | { ok: true; turnId: string; reply: string; sent: boolean; trace: string }
  | { ok: false; reason: "signed_out" | "unavailable" | "rejected" };

export const TURN_TIMEOUT_MS = 30_000;     // the engine's own deadlines are shorter; past this, stop waiting

/** A short random conversation name: a new thread starts a fresh test conversation. */
export function newThread(): string {
  return Math.random().toString(36).slice(2, 10) || "main";
}

export async function tryTurn(
  client: SupabaseClient | null,
  text: string,
  o: { thread?: string; env?: string; timeoutMs?: number } = {},
): Promise<TryTurnResult> {
  if (!client) return { ok: false, reason: "unavailable" };
  const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
  const token = data.session?.access_token;
  if (!token) return { ok: false, reason: "signed_out" };

  const env = o.env ?? tenantFromHost(window.location.hostname)?.env ?? "prod";
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), o.timeoutMs ?? TURN_TIMEOUT_MS);
  try {
    const r = await fetch(`${API}/v1/turns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, env, thread: o.thread ?? "main" }),
      signal: abort.signal,
    });
    if (r.status === 401) return { ok: false, reason: "signed_out" };
    if (r.status === 400) return { ok: false, reason: "rejected" };
    if (!r.ok) return { ok: false, reason: "unavailable" };
    const j = (await r.json()) as TryTurnResponse;
    return { ok: true, turnId: j.turn_id, reply: j.reply, sent: j.sent, trace: j.trace };
  } catch {
    return { ok: false, reason: "unavailable" };          // network error, CORS refusal or timeout
  } finally {
    clearTimeout(timer);
  }
}
