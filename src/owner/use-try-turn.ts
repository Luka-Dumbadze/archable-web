// src/owner/use-try-turn.ts: state for the "Try as customer" console. A hook, not a component: Owner Mode's
// UI (Lovable) renders `entries` and calls `send`. One request at a time; every request ends, so nothing hangs.
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { newThread, tryTurn } from "./try-turn";

export type TryEntry =
  | { kind: "you"; key: string; text: string }
  | { kind: "reply"; key: string; text: string; sent: boolean; trace: string }
  | { kind: "error"; key: string; reason: "signed_out" | "unavailable" | "rejected" };

export function useTryTurn() {
  const [entries, setEntries] = useState<TryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const thread = useRef(newThread());
  const n = useRef(0);
  const key = () => `t${++n.current}`;

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    setEntries((e) => [...e, { kind: "you", key: key(), text }]);
    const r = await tryTurn(supabase, text, { thread: thread.current });
    setEntries((e) => [...e, r.ok
      ? { kind: "reply", key: key(), text: r.reply, sent: r.sent, trace: r.trace }
      : { kind: "error", key: key(), reason: r.reason }]);
    setBusy(false);
  }, [busy]);

  /** Starts a fresh test conversation: the agent forgets the previous one. */
  const reset = useCallback(() => {
    thread.current = newThread();
    setEntries([]);
  }, []);

  return { entries, busy, send, reset };
}
