// src/owner/owner-chat.ts: the owner's web chat with the Architect (archable plan §8.4). Not a component.
// Same conversation as @ArchableBot: POST /v1/owner/messages {text} → OwnerReply {text, buttons}. Buttons arrive
// as data and are classified here, so the UI only renders and the rules live in one place:
//   url  → "link": opens in a new tab (https only)
//   post /v1/owner/changes/<id>/rationale → "rationale": GET that path, show the RationaleCard in a sheet
//   post /v1/owner/… → "action": POST path + body, append the reply
// Anything else is dropped. Text and buttons only: no attachments, no audio.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnerButton, OwnerReply, RationaleCard } from "@/contracts";
import { API } from "@/chat/session";

export type ChatButton =
  | { kind: "link"; label: string; url: string }
  | { kind: "rationale"; label: string; changeId: string }
  | { kind: "action"; label: string; path: string; body: Record<string, unknown> };

export const MAX_TEXT = 2000;
const RATIONALE_PATH = /^\/v1\/owner\/changes\/([A-Za-z0-9_-]{1,64})\/rationale$/;
const OWNER_PATH = /^\/v1\/owner\/[A-Za-z0-9_\-/]{1,200}$/;

export function classifyButton(b: OwnerButton): ChatButton | null {
  if (b.action === "url") {
    try {
      const u = new URL(b.url);
      return u.protocol === "https:" ? { kind: "link", label: b.label, url: u.href } : null;
    } catch {
      return null;
    }
  }
  const r = RATIONALE_PATH.exec(b.path);
  if (r) return { kind: "rationale", label: b.label, changeId: r[1]! };
  if (OWNER_PATH.test(b.path) && !b.path.includes("..")) return { kind: "action", label: b.label, path: b.path, body: b.body };
  return null;
}

export type OwnerFailure = "signed_out" | "forbidden" | "rejected" | "not_found" | "unavailable";
export type OwnerResult<T> = { ok: true; data: T } | { ok: false; reason: OwnerFailure };
export const OWNER_TIMEOUT_MS = 30_000;

async function call<T>(client: SupabaseClient | null, path: string, init: RequestInit = {}, timeoutMs = OWNER_TIMEOUT_MS): Promise<OwnerResult<T>> {
  if (!client) return { ok: false, reason: "unavailable" };
  const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
  const token = data.session?.access_token;
  if (!token) return { ok: false, reason: "signed_out" };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const r = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` },
      signal: abort.signal,
    });
    if (r.status === 401) return { ok: false, reason: "signed_out" };
    if (r.status === 403) return { ok: false, reason: "forbidden" };
    if (r.status === 400) return { ok: false, reason: "rejected" };
    if (r.status === 404) return { ok: false, reason: "not_found" };
    if (!r.ok) return { ok: false, reason: "unavailable" };
    return { ok: true, data: (await r.json()) as T };
  } catch {
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

export const sendOwnerMessage = (client: SupabaseClient | null, text: string, timeoutMs?: number) =>
  call<OwnerReply>(client, "/v1/owner/messages", { method: "POST", body: JSON.stringify({ text }) }, timeoutMs);

export const pressOwnerAction = (client: SupabaseClient | null, path: string, body: Record<string, unknown>, timeoutMs?: number) =>
  call<OwnerReply>(client, path, { method: "POST", body: JSON.stringify(body) }, timeoutMs);

export const fetchChangeRationale = (client: SupabaseClient | null, changeId: string, timeoutMs?: number) =>
  call<RationaleCard>(client, `/v1/owner/changes/${encodeURIComponent(changeId)}/rationale`, {}, timeoutMs);
