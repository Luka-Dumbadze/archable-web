// src/chat/session.ts: the only stateful part of the chat page (archable plan §6.6). Not a component.
// The page keeps one thing: the session secret, in this origin's (partitioned) localStorage. Everything
// else (history, replies, staff messages) comes from the chat API with a 1 h bearer token.
import type { ChatMessage, ChatSessionResponse } from "@/contracts";

export const API = (import.meta.env["VITE_ARCHABLE_API_URL"] as string | undefined) ?? "https://api.archable.run";

export class ChatUnavailable extends Error {
  constructor(readonly status: number) {
    super(`chat unavailable (${status})`);
  }
}

const KEY = "archable.chat.secret";
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },   // blocked storage: memory only
  set: (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* reload starts a new session */ } },
};

export async function openSession(slug: string, env: string): Promise<ChatSessionResponse> {
  const r = await fetch(`${API}/v1/chat/sessions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant: slug, env, secret: store.get() ?? undefined, embed_origin: document.referrer || null }),
  });
  if (!r.ok) throw new ChatUnavailable(r.status);
  const s = (await r.json()) as ChatSessionResponse;
  if (s.secret) store.set(s.secret);
  return s;
}

// <slug>.archable.run → prod; pr-<n>--<slug>.archable.run → preview. Same rules as the API's origin.ts.
const TENANT_HOST = /^(?:pr-([1-9][0-9]{0,5})--)?([a-z][a-z0-9-]{1,30}[a-z0-9])\.archable\.run$/;
const RESERVED = new Set(["api", "www", "app", "admin", "docs", "status", "mcp", "widget", "chat", "auth", "static", "cdn"]);

export function tenantFromHost(host: string): { slug: string; env: string } | null {
  const m = TENANT_HOST.exec(host);
  const slug = m?.[2];
  if (!m || !slug || slug.includes("--") || RESERVED.has(slug)) return null;
  return { slug, env: m[1] ? `pr-${Number(m[1])}` : "prod" };
}

// Greeting and launcher copy from the tenant's spec (public; null when chat is off).
export async function loadGreeting(slug: string, lang: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/v1/widget/config/${slug}`);
    if (!r.ok) return null;
    const c = (await r.json()) as { greeting: Record<string, string> };
    return c.greeting[lang] ?? c.greeting["en"] ?? null;
  } catch {
    return null;
  }
}

export interface ChatClient {
  /** Opens or resumes the session. A resumed session comes back with its history. */
  start(): Promise<{ resumed: boolean; messages: ChatMessage[] }>;
  /** Sends one message. `pending` means the reply will arrive through poll(). */
  send(text: string): Promise<{ messages: ChatMessage[]; pending: boolean }>;
  /** Long poll (≤ 25 s) for staff replies and late agent replies after the newest message seen. */
  poll(signal?: AbortSignal): Promise<ChatMessage[]>;
}

export function chatClient(slug: string, env: string): ChatClient {
  let session: ChatSessionResponse | null = null;
  let lastId = 0;
  const seen = (ms: ChatMessage[]) => {
    for (const m of ms) lastId = Math.max(lastId, m.id);
    return ms;
  };
  const authed = (path: string, init: RequestInit = {}) =>
    fetch(`${API}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session?.token ?? ""}` } });

  async function events(signal?: AbortSignal): Promise<ChatMessage[]> {
    let r = await authed(`/v1/chat/events?after=${lastId}`, signal ? { signal } : {});
    if (r.status === 401) { session = await openSession(slug, env); r = await authed(`/v1/chat/events?after=${lastId}`, signal ? { signal } : {}); }
    if (!r.ok) throw new ChatUnavailable(r.status);
    return seen(((await r.json()) as { messages: ChatMessage[] }).messages);
  }

  return {
    async start() {
      session = await openSession(slug, env);
      if (session.secret) return { resumed: false, messages: [] };           // a new session has no history
      return { resumed: true, messages: await events() };
    },

    async send(text) {
      const body = JSON.stringify({ text, client_msg_id: crypto.randomUUID() });   // the same id on the retry
      const post = () => authed("/v1/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      let r = await post();
      if (r.status === 401) { session = await openSession(slug, env); r = await post(); }   // token expired: resume once
      if (r.status === 429) throw new ChatUnavailable(429);
      if (!r.ok) throw new ChatUnavailable(r.status);
      const j = (await r.json()) as { messages: ChatMessage[]; pending?: boolean };
      return { messages: seen(j.messages), pending: r.status === 202 || j.pending === true };
    },

    poll: events,
  };
}
