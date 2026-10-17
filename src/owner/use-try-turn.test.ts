import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TryTurnResult } from "./try-turn";

const calls: { text: string; thread: string | undefined }[] = [];
let next: TryTurnResult = { ok: true, turnId: "t1", reply: "We deliver to Vake.", sent: true, trace: "/dev/turns/t1" };
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("./try-turn", async (orig) => ({
  ...(await orig<typeof import("./try-turn")>()),
  tryTurn: vi.fn(async (_c: unknown, text: string, o: { thread?: string }) => { calls.push({ text, thread: o.thread }); return next; }),
}));
const { useTryTurn } = await import("./use-try-turn");

describe("useTryTurn", () => {
  it("adds the owner's message, then the reply with sent and trace", async () => {
    const { result } = renderHook(() => useTryTurn());
    await act(() => result.current.send("  do you deliver to Vake?  "));
    expect(result.current.entries.map((e) => e.kind)).toEqual(["you", "reply"]);
    expect(result.current.entries[0]).toMatchObject({ text: "do you deliver to Vake?" });
    expect(result.current.entries[1]).toMatchObject({ text: "We deliver to Vake.", sent: true, trace: "/dev/turns/t1" });
    expect(result.current.busy).toBe(false);
  });

  it("shows an error entry when the API is unavailable, and is ready again", async () => {
    next = { ok: false, reason: "unavailable" };
    const { result } = renderHook(() => useTryTurn());
    await act(() => result.current.send("hi"));
    expect(result.current.entries.at(-1)).toMatchObject({ kind: "error", reason: "unavailable" });
    expect(result.current.busy).toBe(false);
  });

  it("ignores empty input and keeps one thread until reset", async () => {
    next = { ok: true, turnId: "t", reply: "ok", sent: true, trace: "/dev/turns/t" };
    calls.length = 0;
    const { result } = renderHook(() => useTryTurn());
    await act(() => result.current.send("   "));
    expect(calls).toHaveLength(0);
    await act(() => result.current.send("one"));
    await act(() => result.current.send("two"));
    expect(calls[0]?.thread).toBe(calls[1]?.thread);
    act(() => result.current.reset());
    expect(result.current.entries).toEqual([]);
    await act(() => result.current.send("three"));
    expect(calls[2]?.thread).not.toBe(calls[0]?.thread);
  });
});
