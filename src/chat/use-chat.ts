import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/contracts";
import { ChatUnavailable, chatClient, loadGreeting, tenantFromLocation } from "./session";

type Bubble = { key: string; id?: number; author: ChatMessage["author"]; text: string; optimistic?: boolean };

export function useChat(demoName: string, lang?: string) {
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    let mounted = true;
    let sequence = 0;
    let replyVersion = 0;
    const abort = new AbortController();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const tenant = tenantFromLocation(window.location);
    setTenantName(tenant?.slug ?? null);
    setMessages([]);
    setGreeting(null);
    setError(null);
    setPending(false);

    const report = (e: unknown) => {
      if (!mounted) return;
      setError(e instanceof ChatUnavailable && e.status === 429
        ? "You're sending messages quickly, please wait a moment."
        : "Chat is unavailable right now. Please try again later.");
    };
    const optimistic = (text: string) => {
      setMessages((previous) => [...previous, { key: `local-${++sequence}`, author: "customer", text, optimistic: true }]);
    };
    const append = (incoming: ChatMessage[]) => {
      if (!mounted) return;
      if (incoming.some((m) => m.author !== "customer")) {
        replyVersion++;
        setPending(false);
      }
      setMessages((previous) => {
        const next = [...previous];
        const ids = new Set(next.flatMap((m) => m.id === undefined ? [] : [m.id]));
        for (const message of incoming) {
          if (ids.has(message.id)) continue;
          ids.add(message.id);
          const bubble: Bubble = { ...message, key: `message-${message.id}` };
          const local = message.author === "customer"
            ? next.findIndex((m) => m.optimistic && m.text === message.text) : -1;
          if (local >= 0) next[local] = bubble;
          else next.push(bubble);
        }
        return next;
      });
    };

    if (!tenant) {
      setGreeting(`Hi! Welcome to ${demoName}. How can I help?`);
      sendRef.current = async (text) => {
        optimistic(text);
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (mounted) setMessages((previous) => [...previous, { key: `demo-${++sequence}`, author: "agent", text: "Got it — a teammate will confirm shortly." }]);
        }, 600);
        timers.add(timer);
      };
    } else {
      const client = chatClient(tenant.slug, tenant.env);
      let ready = false;
      let starting: Promise<void> | null = null;
      const start = () => {
        if (ready) return Promise.resolve();
        if (!starting) starting = client.start().then(({ messages: history }) => {
          ready = true;
          append(history);
        }).finally(() => { starting = null; });
        return starting;
      };
      const language = (lang || navigator.language).slice(0, 2).toLowerCase();
      void loadGreeting(tenant.slug, language).then((text) => {
        if (mounted) setGreeting(text);
      }).catch(report);

      const pause = () => new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          timers.delete(timer);
          abort.signal.removeEventListener("abort", finish);
          resolve();
        };
        const timer = setTimeout(finish, 3000);
        timers.add(timer);
        abort.signal.addEventListener("abort", finish, { once: true });
      });
      void (async () => {
        while (mounted) {
          try {
            await start();
            if (!mounted) break;
            append(await client.poll(abort.signal));
          } catch (e) {
            if (!mounted) break;
            report(e);
            await pause();
          }
        }
      })();

      sendRef.current = async (text) => {
        optimistic(text);
        setError(null);
        const beforeReply = replyVersion;
        try {
          await start();
          if (!mounted) return;
          const result = await client.send(text);
          if (!mounted) return;
          append(result.messages);
          if (result.pending && replyVersion === beforeReply) setPending(true);
        } catch (e) {
          report(e);
          if (mounted) setPending(false);
        }
      };
    }

    return () => {
      mounted = false;
      abort.abort();
      for (const timer of timers) clearTimeout(timer);
      sendRef.current = async () => {};
    };
  }, [demoName, lang]);

  return { messages, greeting, tenantName, error, pending, send: (text: string) => sendRef.current(text) };
}