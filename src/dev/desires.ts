// src/dev/desires.ts: the Structured Desires Feed's data (archable plan §8.5). Not a component.
// A desire carries its impact (public.desire_impact(): linked, not-unlinked chats only), the linked chats
// (desire_chapters) and its current rationale card. Unlinking a chat goes through the API, which sets
// unlinked_at, records who unlinked it and recomputes the card; the feed then re-reads the desire.
// The two routes below are DEV-1's proposal for DEV-2's routes/devmode.ts (see PROGRESS.md, Blocked on).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RationaleCard } from "@/contracts";
import { API } from "@/chat/session";
import type { DevResult } from "./api";

/** One row of public.desire_impact(); money in tetri. */
export interface DesireImpact {
  chapters: number; customers: number; quoted: number; abandoned: number;
  abandoned_value: number; ordered: number; first_seen: string | null; last_seen: string | null;
}

export interface LinkedChat {
  chapter_id: string;
  customer: string;                  // display name or masked phone; never a raw phone number
  opened_at: string;
  last_quote_total: number | null;   // tetri; null when the chat never reached a price
  ordered: boolean;
  linked_by: string;                 // 'jev:desire.dedupe' | 'owner' | 'developer'
  excerpt: string;                   // the customer's words that linked it
}

export interface DesireView {
  id: string;
  number: number;
  statement: string;
  status: string;                    // 'Ready for you', 'With your developer', 'Live', …
  tier: 1 | 2 | 3 | 4;
  impact: DesireImpact;
  chats: LinkedChat[];
  rationale_card: RationaleCard;
}

/** "140 GEL", "80.50 GEL" from tetri. */
export const gel = (tetri: number) => `${tetri % 100 === 0 ? String(tetri / 100) : (tetri / 100).toFixed(2)} GEL`;

/** The impact chip (plan §8.5): "3 chats · 140 GEL quoted, not ordered". */
export function impactChip(i: DesireImpact): string {
  if (i.chapters === 0) return "No linked chats";
  const chats = `${i.chapters} ${i.chapters === 1 ? "chat" : "chats"}`;
  return i.abandoned_value > 0 ? `${chats} · ${gel(i.abandoned_value)} quoted, not ordered` : `${chats} · nothing quoted yet`;
}

/** A chat's price line in the Linked chats list. */
export const chatPrice = (c: LinkedChat) =>
  c.last_quote_total === null ? "No price reached" : `${gel(c.last_quote_total)} quoted${c.ordered ? ", ordered" : ", not ordered"}`;

async function req<T>(client: SupabaseClient | null, path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<DevResult<T>> {
  if (!client) return { ok: false, reason: "unavailable" };
  const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
  const token = data.session?.access_token;
  if (!token) return { ok: false, reason: "signed_out" };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}` }, signal: abort.signal });
    if (r.status === 401) return { ok: false, reason: "signed_out" };
    if (r.status === 403) return { ok: false, reason: "forbidden" };
    if (r.status === 404) return { ok: false, reason: "not_found" };
    if (!r.ok) return { ok: false, reason: "unavailable" };
    return { ok: true, data: (r.status === 204 ? null : await r.json()) as T };
  } catch {
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

/** GET /v1/dev/desires (proposed): open desires with impact, linked chats and card. */
export const fetchDesires = (client: SupabaseClient | null, timeoutMs?: number) => req<DesireView[]>(client, "/v1/dev/desires", {}, timeoutMs);

/** POST /v1/dev/desires/:id/chats/:chapterId/unlink (proposed): returns the recomputed desire. */
export const postUnlink = (client: SupabaseClient | null, desireId: string, chapterId: string, timeoutMs?: number) =>
  req<DesireView>(client, `/v1/dev/desires/${encodeURIComponent(desireId)}/chats/${encodeURIComponent(chapterId)}/unlink`, { method: "POST" }, timeoutMs);
