import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { D14_CARD, D14_TELEGRAM_TEXT } from "@/shared/fixtures/d14";
import { rationaleText } from "@/shared/rationale";
import { classifyButton, fetchChangeRationale, pressOwnerAction, sendOwnerMessage } from "./owner-chat";

const host = vi.hoisted(() => ({ tenant: false }));
vi.mock("@/chat/session", async (orig) => ({ ...(await orig<typeof import("@/chat/session")>()), tenantFromHost: () => (host.tenant ? { slug: "marani", env: "prod" } : null) }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "jwt-owner" } } }) } } }));
const { useOwnerChat } = await import("./use-owner-chat");

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => { host.tenant = false; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("classifyButton", () => {
  it("url → link (https only)", () => {
    expect(classifyButton({ label: "Approve in Telegram", action: "url", url: "https://t.me/archable_prod_bot?start=cr_abc" }))
      .toEqual({ kind: "link", label: "Approve in Telegram", url: "https://t.me/archable_prod_bot?start=cr_abc" });
    for (const url of ["javascript:alert(1)", "http://t.me/x", "data:text/html,hi", "not a url"]) expect(classifyButton({ label: "x", action: "url", url })).toBeNull();
  });
  it("post to a change's rationale → rationale; other /v1/owner posts → action; anything else dropped", () => {
    expect(classifyButton({ label: "View rationale", action: "post", path: "/v1/owner/changes/cr-58/rationale", body: {} })).toEqual({ kind: "rationale", label: "View rationale", changeId: "cr-58" });
    expect(classifyButton({ label: "Draft it", action: "post", path: "/v1/owner/desires/16/draft", body: { ref: "r" } })).toEqual({ kind: "action", label: "Draft it", path: "/v1/owner/desires/16/draft", body: { ref: "r" } });
    for (const path of ["/v1/dev/a2a", "/v1/owner/../dev/a2a", "https://evil.example/v1/owner/x", "/v1/turns"]) expect(classifyButton({ label: "x", action: "post", path, body: {} })).toBeNull();
  });
});

describe("owner chat API", () => {
  const client = (token: string | null) => ({ auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } }) as unknown as SupabaseClient;

  it("POST /v1/owner/messages with the session; action posts go to their path; rationale is a GET", async () => {
    const f = vi.fn(async (u: string) => json(200, u.endsWith("/rationale") ? D14_CARD : { text: "ok", buttons: [] }));
    vi.stubGlobal("fetch", f);
    await sendOwnerMessage(client("jwt"), "allow cash on delivery up to 300 lari");
    await pressOwnerAction(client("jwt"), "/v1/owner/desires/16/draft", { ref: "r" });
    expect((await fetchChangeRationale(client("jwt"), "cr-58")).ok).toBe(true);
    const calls = f.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([u, i]) => [u.replace("https://api.archable.run", ""), i.method ?? "GET", i.body ?? null])).toEqual([
      ["/v1/owner/messages", "POST", JSON.stringify({ text: "allow cash on delivery up to 300 lari" })],
      ["/v1/owner/desires/16/draft", "POST", JSON.stringify({ ref: "r" })],
      ["/v1/owner/changes/cr-58/rationale", "GET", null],
    ]);
    expect(calls.every(([, i]) => (i.headers as Record<string, string>)["Authorization"] === "Bearer jwt")).toBe(true);
  });

  it.each([[401, "signed_out"], [403, "forbidden"], [400, "rejected"], [404, "not_found"], [502, "unavailable"]] as const)("maps %i to %s", async (s, reason) => {
    vi.stubGlobal("fetch", async () => json(s, {}));
    expect(await sendOwnerMessage(client("jwt"), "hi")).toEqual({ ok: false, reason });
  });

  it("no session → signed_out without a request; a hang → unavailable", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    expect(await sendOwnerMessage(client(null), "hi")).toEqual({ ok: false, reason: "signed_out" });
    expect(f).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", (_u: string, i: RequestInit) => new Promise((_, rej) => i.signal?.addEventListener("abort", () => rej(new Error("abort")))));
    expect(await sendOwnerMessage(client("jwt"), "hi", 30)).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("useOwnerChat, demo (plan §8.6 step 5)", () => {
  it("cash on delivery → Draft it → change card → View rationale shows the D-14 card; Approve in Telegram is a t.me link", async () => {
    const { result } = renderHook(() => useOwnerChat("marani"));
    expect(result.current.demo).toBe(true);
    await act(() => result.current.send("allow cash on delivery up to 300 lari"));
    const ask = result.current.entries[1]!;
    expect(ask).toMatchObject({ kind: "architect", text: expect.stringContaining("Shall I draft this change?") });
    if (ask.kind !== "architect") throw new Error();
    expect(ask.buttons.map((b) => [b.kind, b.label])).toEqual([["action", "Draft it"], ["action", "Not this"]]);

    await act(() => result.current.press(ask.key, ask.buttons[0]!));
    const card = result.current.entries[2]!;
    if (card.kind !== "architect") throw new Error();
    expect(card.text.startsWith("Ready for you: Customers can pay cash on delivery up to 300 GEL.")).toBe(true);
    expect(card.buttons.map((b) => [b.kind, b.label])).toEqual([["rationale", "View rationale"], ["link", "Approve in Telegram"]]);
    expect((card.buttons[1] as { url: string }).url).toMatch(/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=cr_[A-Za-z0-9]{1,22}$/);
    expect(result.current.entries[1]).toMatchObject({ answered: true });

    await act(() => result.current.press(card.key, card.buttons[0]!));
    await waitFor(() => expect(result.current.rationale.state).toBe("ready"));
    const sheet = result.current.rationale as { state: "ready"; title: string; card: typeof D14_CARD };
    expect(sheet.title).toBe("Customers can pay cash on delivery up to 300 GEL");
    expect(rationaleText(sheet.card)).toBe(D14_TELEGRAM_TEXT);
    act(() => result.current.closeRationale());
    expect(result.current.rationale.state).toBe("closed");
  });

  it("a question is answered once: Not this after Draft it does nothing", async () => {
    const { result } = renderHook(() => useOwnerChat("marani"));
    await act(() => result.current.send("customers want to pay the courier in cash"));
    const ask = result.current.entries[1]!; if (ask.kind !== "architect") throw new Error();
    await act(() => result.current.press(ask.key, ask.buttons[0]!));
    await act(() => result.current.press(ask.key, ask.buttons[1]!));
    expect(result.current.entries).toHaveLength(3);
  });

  it("Approve in Telegram opens a new tab; empty input is ignored; text is capped", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { result } = renderHook(() => useOwnerChat("marani"));
    await act(() => result.current.send("   "));
    expect(result.current.entries).toEqual([]);
    await act(() => result.current.send("x".repeat(5000)));
    expect((result.current.entries[0] as { text: string }).text).toHaveLength(2000);
    await act(() => result.current.press("m0", { kind: "link", label: "Approve in Telegram", url: "https://t.me/archable_prod_bot?start=cr_x" }));
    expect(open).toHaveBeenCalledWith("https://t.me/archable_prod_bot?start=cr_x", "_blank", "noopener,noreferrer");
  });
});

describe("useOwnerChat, tenant host", () => {
  it("uses the API and turns failures into error entries", async () => {
    host.tenant = true;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(200, { text: "Here's what I understood…", buttons: [{ label: "Draft it", action: "post", path: "/v1/owner/desires/16/draft", body: { ref: "a" } }, { label: "Evil", action: "url", url: "javascript:alert(1)" }] }))
      .mockResolvedValueOnce(json(502, {})));
    const { result } = renderHook(() => useOwnerChat("marani"));
    expect(result.current.demo).toBe(false);
    await act(() => result.current.send("allow cash on delivery up to 300 lari"));
    const ask = result.current.entries[1]!; if (ask.kind !== "architect") throw new Error();
    expect(ask.buttons.map((b) => b.label)).toEqual(["Draft it"]);
    await act(() => result.current.press(ask.key, ask.buttons[0]!));
    expect(result.current.entries.at(-1)).toEqual({ kind: "error", key: expect.any(String), reason: "unavailable" });
    expect(result.current.busy).toBe(false);
  });
});
