import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeSignIn } from "@/auth/web-link";
import { tenantFromHost } from "@/chat/session";
import { supabase } from "@/lib/supabase";

type Status = "waiting" | "ok" | "expired" | "none" | "unavailable";

const messages: Record<Status, string> = {
  waiting: "Signing you in…",
  ok: "You're signed in.",
  expired: "This sign-in link has expired or was already used. Send /web to @ArchableBot for a new one.",
  none: "To sign in, open @ArchableBot in Telegram and send /web. You'll get a one-time link.",
  unavailable: "Sign-in is unavailable right now. Please try again later.",
};

/** Where "Open Owner Mode" leads: on a tenant host, straight into that tenant's workspace. */
export function ownerHomeSearch(host: string): { biz: string } {
  return { biz: tenantFromHost(host)?.slug ?? "" };
}

export function OwnerSignIn() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("waiting");
  const attempt = useRef<ReturnType<typeof completeSignIn> | null>(null);

  useEffect(() => {
    let mounted = true;
    // Keep one exchange per mount, including React's effect replay.
    attempt.current ??= completeSignIn(supabase);
    void attempt.current.then(
      (result) => { if (mounted) setStatus(result.ok ? "ok" : result.reason); },
      () => { if (mounted) setStatus("unavailable"); },
    );
    return () => { mounted = false; };
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <section aria-label="Owner sign-in" className="w-full min-w-0 max-w-sm rounded-lg border bg-card p-6 text-center">
        <h1 className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <Boxes aria-hidden="true" className="size-5 text-primary" />Archable
        </h1>
        <p role="status" aria-live="polite" className="text-sm leading-relaxed [overflow-wrap:anywhere]">{messages[status]}</p>
        {status === "ok" && (
          <Button className="mt-6 w-full" onClick={() => void navigate({ to: "/", search: { biz: tenantFromHost(window.location.hostname)?.slug ?? "" } })}>
            Open Owner Mode
          </Button>
        )}
      </section>
    </main>
  );
}