// src/dev/use-desires.ts: Desires Feed state for Developer Mode (archable plan §8.5). A hook, not a component.
// After an unlink the feed re-reads the desires, so what the screen shows is what a refresh would show.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { tenantFromHost } from "@/chat/session";
import { fetchDesires, postUnlink, type DesireView } from "./desires";
import type { DevFailure } from "./api";
import { demoDesires, demoUnlink, resetDemoDesires } from "./demo-desires";

export type DesiresLoad =
  | { state: "loading" }
  | { state: "ready"; desires: DesireView[]; demo: boolean }
  | { state: "failed"; reason: DevFailure };

const demoHost = () => typeof window === "undefined" || !tenantFromHost(window.location.hostname);

export function useDesires(business: string) {
  const [load, setLoad] = useState<DesiresLoad>({ state: "loading" });
  const [unlinking, setUnlinking] = useState<string | null>(null);     // chapter id in flight
  const [error, setError] = useState<DevFailure | null>(null);
  const [n, setN] = useState(0);
  const refresh = useCallback(() => setN((x) => x + 1), []);

  useEffect(() => {
    let live = true;
    void (async () => {
      if (demoHost()) { if (live) setLoad({ state: "ready", desires: demoDesires(business), demo: true }); return; }
      const r = await fetchDesires(supabase);
      if (live) setLoad(r.ok ? { state: "ready", desires: r.data, demo: false } : { state: "failed", reason: r.reason });
    })();
    return () => { live = false; };
  }, [business, n]);

  /** Unlinks a chat from a desire, then re-reads the feed. Resolves true on success. */
  const unlink = useCallback(async (desireId: string, chapterId: string): Promise<boolean> => {
    if (unlinking) return false;
    setUnlinking(chapterId);
    setError(null);
    let ok: boolean;
    if (demoHost()) ok = demoUnlink(business, desireId, chapterId) !== null;
    else { const r = await postUnlink(supabase, desireId, chapterId); ok = r.ok; if (!r.ok) setError(r.reason); }
    setUnlinking(null);
    refresh();
    return ok;
  }, [business, refresh, unlinking]);

  /** Demo only: put the unlinked chats back. */
  const resetDemo = useCallback(() => { resetDemoDesires(business); refresh(); }, [business, refresh]);

  return { load, unlink, unlinking, error, refresh, resetDemo };
}
