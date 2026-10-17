import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/contracts";
import { API, ChatUnavailable, chatClient, loadGreeting, tenantFromHost } from "./session";

// A fake of the chat API contract (archable plan §6.5): sessions keyed by secret, a transcript per session,
// and an optional script of status codes to force 401/202/429 paths.
function fakeApi() {
  const sessions = new Map<string, { id: string; token: string; log: ChatMessage[] }>();
  const byToken = new Map<string, { id: string; token: string; log: ChatMessage[] }>();
  const script: number[] = [];
  const bodies: Record<string, unknown>[] = [];
  let n = 0;
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const headers = new Headers(init.headers);
    const s = byToken.get((headers.get("Authorization") ?? "").replace("Bearer ", ""));
    if (url.pathname === "/v1/chat/sessions") {
      const b = JSON.parse(String(init.body)) as { tenant: string; secret?: string };
      if (b.tenant !== "marani") return json(404, { error: "chat_unavailable" });
      const old = b.secret ? sessions.get(b.secret) : undefined;
      if (old) { old.token = `tok-${++n}`; byToken.set(old.token, old); return json(200, { token: old.token, session_id: old.id }); }
      const secret = `sec-${++n}`, fresh = { id: `ws-${n}`, token: `tok-${n}`, log: [] };
      sessions.set(secret, fresh); byToken.set(fresh.token, fresh);
      return json(201, { token: fresh.token, secret, session_id: fresh.id });
    }
    const forced = script.shift();
    if (forced === 401 || !s) return json(401, { error: "session_expired" });
    if (url.pathname === "/v1/chat/messages") {
      const b = JSON.parse(String(init.body)) as { text: string; client_msg_id: string };
      bodies.push(b);
      if (forced === 429) return json(429, { error: "slow_down" });
      s.log.push({ id: s.log.length + 1, author: "customer", text: b.text, at: "now" });
      if (forced === 202) return json(202, { messages: [], pending: true });
      const reply: ChatMessage = { id: s.log.length + 1, author: "agent", text: `echo: ${b.text}`, at: "now" };
      s.log.push(reply);
      return json(200, { messages: [reply] });
    }
    if (url.pathname === "/v1/chat/events") {
      const after = Number(url.searchParams.get("after"));
      return json(200, { messages: s.log.filter((m) => m.id > after) });
    }
    return json(404, {});
  });
  return { fetchImpl, script, bodies, sessions, byToken };
}

let api: ReturnType<typeof fakeApi>;
beforeEach(() => {
  localStorage.clear();
  api = fakeApi();
  vi.stubGlobal("fetch", api.fetchImpl);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("tenantFromHost", () => {
  it("reads tenant and preview hosts like the API does", () => {
    expect(tenantFromHost("marani.archable.run")).toEqual({ slug: "marani", env: "prod" });
    expect(tenantFromHost("pr-58--marani.archable.run")).toEqual({ slug: "marani", env: "pr-58" });
  });
  it.each(["api.archable.run", "a--b.archable.run", "archable.run", "marani.lovable.app", "localhost"])("refuses %s", (h) => {
    expect(tenantFromHost(h)).toBeNull();
  });
});

describe("chat client", () => {
  it("talks to the configured API origin", () => {
    expect(API).toBe("https://api.archable.run");
  });

  it("opens a new session, stores only the secret, and gets a reply", async () => {
    const c = chatClient("marani", "prod");
    expect(await c.start()).toEqual({ resumed: false, messages: [] });
    expect(localStorage.getItem("archable.chat.secret")).toMatch(/^sec-/);
    const r = await c.send("gamarjoba");
    expect(r).toEqual({ messages: [{ id: 2, author: "agent", text: "echo: gamarjoba", at: "now" }], pending: false });
  });

  it("after a reload, resumes the same session with its history", async () => {
    const a = chatClient("marani", "prod");
    await a.start();
    await a.send("gamarjoba");
    const b = chatClient("marani", "prod");                  // a reload: same storage, new page state
    const r = await b.start();
    expect(r.resumed).toBe(true);
    expect(r.messages.map((m) => `${m.author}: ${m.text}`)).toEqual(["customer: gamarjoba", "agent: echo: gamarjoba"]);
  });

  it("with blocked storage, still chats on a fresh session each load", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    const a = chatClient("marani", "prod");
    expect((await a.start()).resumed).toBe(false);
    expect((await a.send("hi")).messages[0]?.text).toBe("echo: hi");
    const b = chatClient("marani", "prod");
    expect((await b.start()).resumed).toBe(false);
    expect(api.sessions.size).toBe(2);
  });

  it("on 401 resumes the session and retries once with the same client_msg_id", async () => {
    const c = chatClient("marani", "prod");
    await c.start();
    api.script.push(401);
    const r = await c.send("still there?");
    expect(r.messages[0]?.text).toBe("echo: still there?");
    expect(api.sessions.size).toBe(1);
    const ids = api.bodies.map((b) => b["client_msg_id"]);
    expect(ids).toHaveLength(1);
    const calls = api.fetchImpl.mock.calls.filter(([u]) => String(u).endsWith("/v1/chat/messages"));
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[1]?.body).toBe(calls[1]?.[1]?.body);
  });

  it("reports pending on 202 and picks the reply up with poll()", async () => {
    const c = chatClient("marani", "prod");
    await c.start();
    api.script.push(202);
    expect(await c.send("where is M-00012?")).toEqual({ messages: [], pending: true });
    const s = [...api.sessions.values()][0]!;
    s.log.push({ id: s.log.length + 1, author: "staff", text: "Nino here: it left the cellar today.", at: "now" });
    expect((await c.poll()).map((m) => m.author)).toEqual(["customer", "staff"]);
    expect(await c.poll()).toEqual([]);                      // the cursor moved past what was seen
  });

  it("throws ChatUnavailable for an unknown tenant and for 429", async () => {
    await expect(chatClient("acme", "prod").start()).rejects.toBeInstanceOf(ChatUnavailable);
    const c = chatClient("marani", "prod");
    await c.start();
    api.script.push(429);
    await expect(c.send("spam")).rejects.toMatchObject({ status: 429 });
  });
});

describe("loadGreeting", () => {
  it("picks the customer's language, falls back to English, and is null when chat is off", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) =>
      u.endsWith("/marani")
        ? new Response(JSON.stringify({ greeting: { ka: "გამარჯობა! რა ღვინოს ეძებთ?", en: "Hi! Looking for a wine?" } }))
        : new Response("{}", { status: 404 })));
    expect(await loadGreeting("marani", "ka")).toBe("გამარჯობა! რა ღვინოს ეძებთ?");
    expect(await loadGreeting("marani", "de")).toBe("Hi! Looking for a wine?");
    expect(await loadGreeting("acme", "en")).toBeNull();
  });
});
