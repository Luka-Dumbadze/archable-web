// src/shell/use-shell.ts: the shell store in React. A hook, not a component: Lovable's provider calls
// useShellBoot() once at the root on tenant hosts, and screens read useShell(). A staged epoch is applied
// when the router starts a navigation, so the swap happens between screens, with no reload.
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { tenantFromHost } from "@/chat/session";
import { createShell, type Shell, type ShellSnapshot } from "./shell";

let shared: Shell | null = null;
/** The one shell store per page (also used by Developer Mode for live tool calls). */
export const shell = () => (shared ??= createShell({ supabase }));

const SERVER: ShellSnapshot = { status: "booting", manifest: null, ui: null, pendingEpoch: null, live: false };

/** Root-level: boots on <slug>.archable.run hosts and swaps staged epochs on navigation. */
export function useShellBoot(): ShellSnapshot {
  const router = useRouter();
  useEffect(() => {
    if (!tenantFromHost(window.location.hostname)) return;     // Lovable preview / localhost: demo mode
    const s = shell();
    if (s.getSnapshot().status === "booting") void s.boot();
    return router.subscribe("onBeforeNavigate", () => { s.applyPending(); });
  }, [router]);
  return useShell();
}

/** Any screen: the manifest and UI projection currently shown. */
export function useShell(): ShellSnapshot {
  const s = shell();
  return useSyncExternalStore(s.subscribe, s.getSnapshot, () => SERVER);
}
