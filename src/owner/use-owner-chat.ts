// src/owner/use-owner-chat.ts: state for Owner Mode's chat with the Architect (archable plan §8.4). A hook, not a
// component: Lovable's OwnerChat renders `entries`, calls `send` and `press`, and shows `rationale` in a sheet.
// On a tenant host it talks to the API; elsewhere it uses the demo Architect. Every request ends.
import { useCallback, useMemo, useRef, useState } from "react";
import type { OwnerReply, RationaleCard } from "@/contracts";
import { supabase } from "@/lib/supabase";
import { tenantFromHost } from "@/chat/session";
import { classifyButton, fetchChangeRationale, MAX_TEXT, pressOwnerAction, sendOwnerMessage, type ChatButton, type OwnerFailure } from "./owner-chat";
import { createDemoArchitect } from "./demo-architect";

export type ChatEntry =
  | { kind: "owner"; key: string; text: string }
  | { kind: "architect"; key: string; text: string; buttons: ChatButton[]; answered: boolean }
  | { kind: "error"; key: string; reason: OwnerFailure };

export type RationaleSheet =
  | { state: "closed" }
  | { state: "loading"; title: string }
  | { state: "ready"; title: string; card: RationaleCard }
  | { state: "failed"; title: string };

type Backend = {
  message(text: string): Promise<{ ok: true; data: OwnerReply } | { ok: false; reason: OwnerFailure }>;
  press(path: string, body: Record<string, unknown>): Promise<{ ok: true; data: OwnerReply } | { ok: false; reason: OwnerFailure }>;
  rationale(changeId: string): Promise<RationaleCard | null>;
};

function backendFor(business: string): { backend: Backend; demo: boolean } {
  const demo = typeof window === "undefined" || !tenantFromHost(window.location.hostname);
  if (!demo) {
    return {
      demo,
      backend: {
        message: (t) => sendOwnerMessage(supabase, t),
        press: (p, b) => pressOwnerAction(supabase, p, b),
        rationale: async (id) => { const r = await fetchChangeRationale(supabase, id); return r.ok ? r.data : null; },
      },
    };
  }
  const a = createDemoArchitect(business);
  return {
    demo,
    backend: {
      message: async (t) => ({ ok: true, data: await a.message(t) }),
      press: async (p) => { const r = await a.press(p); return r ? { ok: true, data: r } : { ok: false, reason: "not_found" }; },
      rationale: a.rationale,
    },
  };
}

/** The chat for one business. `title` is the change card's first line, used as the rationale sheet's title. */
export function useOwnerChat(business: string) {
  const { backend, demo } = useMemo(() => backendFor(business), [business]);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [rationale, setRationale] = useState<RationaleSheet>({ state: "closed" });
  const n = useRef(0);
  const key = () => `m${++n.current}`;

  const answer = (r: Awaited<ReturnType<Backend["message"]>>): ChatEntry => r.ok
    ? { kind: "architect", key: key(), text: r.data.text, buttons: r.data.buttons.map(classifyButton).filter((b): b is ChatButton => b !== null), answered: false }
    : { kind: "error", key: key(), reason: r.reason };

  const send = useCallback(async (raw: string) => {
    const text = raw.trim().slice(0, MAX_TEXT);
    if (!text || busy) return;
    setBusy(true);
    setEntries((e) => [...e, { kind: "owner", key: key(), text }]);
    const r = await backend.message(text);
    setEntries((e) => [...e, answer(r)]);
    setBusy(false);
  }, [backend, busy]);

  const press = useCallback(async (entryKey: string, b: ChatButton) => {
    if (b.kind === "link") { window.open(b.url, "_blank", "noopener,noreferrer"); return; }
    if (b.kind === "rationale") {
      const title = (entries.find((e) => e.key === entryKey && e.kind === "architect") as { text?: string } | undefined)?.text?.split("\n")[0]?.replace(/^Ready for you: /, "").replace(/\.$/, "") ?? "Why this change";
      setRationale({ state: "loading", title });
      const card = await backend.rationale(b.changeId);
      setRationale(card ? { state: "ready", title, card } : { state: "failed", title });
      return;
    }
    const target = entries.find((e) => e.key === entryKey);
    if (busy || !target || target.kind !== "architect" || target.answered) return;   // one tap per question
    setBusy(true);
    setEntries((e) => e.map((x) => (x.key === entryKey && x.kind === "architect" ? { ...x, answered: true } : x)));
    const r = await backend.press(b.path, b.body);
    setEntries((e) => [...e, answer(r)]);
    setBusy(false);
  }, [backend, busy, entries]);

  const closeRationale = useCallback(() => setRationale({ state: "closed" }), []);

  return { entries, busy, demo, send, press, rationale, closeRationale };
}
