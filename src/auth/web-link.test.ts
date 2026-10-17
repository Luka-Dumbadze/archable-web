import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeSignIn, readWebLink, signInWithWebLink } from "./web-link";

const TOKEN = "4f2c9a7e1b3d5f60a8c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a5c7";
const session = { access_token: "a", refresh_token: "r", expires_in: 3600, token_type: "bearer", user: { id: "u" } };

// A stand-in for the parts of supabase-js this module calls.
function fakeClient(verify: () => Promise<unknown>, stored: unknown = null) {
  return {
    auth: {
      verifyOtp: vi.fn(verify),
      getSession: vi.fn(async () => ({ data: { session: stored }, error: null })),
    },
  } as unknown as SupabaseClient & { auth: { verifyOtp: ReturnType<typeof vi.fn> } };
}

afterEach(() => window.history.replaceState(null, "", "/"));

describe("readWebLink", () => {
  it("reads token_hash from the fragment", () => {
    expect(readWebLink(`#token_hash=${TOKEN}&type=magiclink`)).toEqual({ tokenHash: TOKEN });
    expect(readWebLink(`#token_hash=${TOKEN}`)).toEqual({ tokenHash: TOKEN });
  });
  it.each(["", "#", "#token_hash=", "#token_hash=short", `#token_hash=${TOKEN}&type=signup`, "#token_hash=<script>alert(1)</script>xxxxxxxx"])(
    "ignores %s", (h) => { expect(readWebLink(h)).toBeNull(); });
});

describe("signInWithWebLink", () => {
  it("exchanges the token with verifyOtp as a magic link", async () => {
    const c = fakeClient(async () => ({ data: { session, user: session.user }, error: null }));
    expect(await signInWithWebLink(c, TOKEN)).toEqual({ ok: true, session });
    expect(c.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: TOKEN, type: "magiclink" });
  });
  it("calls a used or expired token expired, a server failure unavailable", async () => {
    expect(await signInWithWebLink(fakeClient(async () => ({ data: { session: null, user: null }, error: { status: 403, message: "Token has expired or is invalid" } })), TOKEN))
      .toEqual({ ok: false, reason: "expired" });
    expect(await signInWithWebLink(fakeClient(async () => ({ data: { session: null, user: null }, error: { status: 502, message: "bad gateway" } })), TOKEN))
      .toEqual({ ok: false, reason: "unavailable" });
    expect(await signInWithWebLink(fakeClient(async () => { throw new TypeError("Failed to fetch"); }), TOKEN))
      .toEqual({ ok: false, reason: "unavailable" });
  });
  it("is unavailable without a Supabase client (env not set)", async () => {
    expect(await signInWithWebLink(null, TOKEN)).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("completeSignIn", () => {
  it("removes the token from the URL before exchanging it", async () => {
    window.history.replaceState(null, "", `/signin?x=1#token_hash=${TOKEN}&type=magiclink`);
    let urlDuringExchange = "";
    const c = fakeClient(async () => { urlDuringExchange = window.location.href; return { data: { session, user: session.user }, error: null }; });
    expect(await completeSignIn(c)).toEqual({ ok: true, session });
    expect(urlDuringExchange).not.toContain(TOKEN);
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("?x=1");
  });
  it("without a token, returns the stored session, or none", async () => {
    window.history.replaceState(null, "", "/signin");
    expect(await completeSignIn(fakeClient(async () => ({}), session))).toEqual({ ok: true, session });
    expect(await completeSignIn(fakeClient(async () => ({}), null))).toEqual({ ok: false, reason: "none" });
  });
});
