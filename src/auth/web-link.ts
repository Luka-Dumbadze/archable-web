// src/auth/web-link.ts: owner sign-in from the one-time /web link (archable plan §1.4). Not a component.
// @ArchableBot's /web answers with a URL button: https://<slug>.archable.run/signin#token_hash=<t>&type=magiclink,
// where <t> is the hashed_token from Supabase Auth's admin generateLink (no email is sent). The token rides in
// the fragment, so it never reaches a server log and Telegram's link preview can't spend it. This module
// exchanges it for a Supabase session; supabase-js then keeps the session in localStorage across reloads.
import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type SignInResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "expired" | "unavailable" };

const TOKEN_HASH = /^[A-Za-z0-9_-]{16,128}$/;

/** Reads the one-time token from a location hash ("#token_hash=…&type=magiclink"). */
export function readWebLink(hash: string): { tokenHash: string } | null {
  const p = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const tokenHash = p.get("token_hash");
  if (!tokenHash || !TOKEN_HASH.test(tokenHash) || (p.get("type") ?? "magiclink") !== "magiclink") return null;
  return { tokenHash };
}

/** Removes the token from the address bar and history, so a reload or "back" never replays it. */
export function scrubWebLink(): void {
  history.replaceState(history.state, "", window.location.pathname + window.location.search);
}

/** Exchanges the one-time token for a session. A used, expired or unknown token is "expired". */
export async function signInWithWebLink(client: SupabaseClient | null, tokenHash: string): Promise<SignInResult> {
  if (!client) return { ok: false, reason: "unavailable" };
  try {
    const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (error || !data.session) return { ok: false, reason: error && error.status !== undefined && error.status >= 500 ? "unavailable" : "expired" };
    return { ok: true, session: data.session };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** The session supabase-js restored from storage, if any. */
export async function currentSession(client: SupabaseClient | null): Promise<Session | null> {
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

/**
 * The whole /signin flow for the page: take the token out of the URL first, then exchange it; without a token,
 * report the stored session. "none" means: ask the owner to send /web to @ArchableBot.
 */
export async function completeSignIn(client: SupabaseClient | null): Promise<SignInResult | { ok: false; reason: "none" }> {
  const link = readWebLink(window.location.hash);
  if (link) {
    scrubWebLink();
    return signInWithWebLink(client, link.tokenHash);
  }
  const session = await currentSession(client);
  return session ? { ok: true, session } : { ok: false, reason: "none" };
}
