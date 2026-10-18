import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "./use-chat";
import { ChatUnavailable, chatClient, loadGreeting, tenantFromLocation } from "./session";
import type { ChatClient } from "./session";
import type { Mock } from "vitest";
import type { ChatMessage } from "@/contracts";

vi.mock("./session", async (original) => ({
  ...await original<typeof import("./session")>(),
  chatClient: vi.fn(), loadGreeting: vi.fn(), tenantFromLocation: vi.fn(),
}));

const message = (id: number, author: ChatMessage["author"], text: string): ChatMessage => ({ id, author, text, at: "now" });
let deliver: (messages: ChatMessage[]) => void;
let signal: AbortSignal | undefined;
let client: { [K in keyof ChatClient]: Mock<ChatClient[K]> };

beforeEach(() => {
  vi.mocked(tenantFromLocation).mockReturnValue({ slug: "marani", env: "pr-58" });
  vi.mocked(loadGreeting).mockResolvedValue("გამარჯობა!");
  client = {
    start: vi.fn().mockResolvedValue({ resumed: true, messages: [message(1, "agent", "History")] }),
    send: vi.fn().mockResolvedValue({ messages: [], pending: false }),
    poll: vi.fn().mockImplementation((abortSignal?: AbortSignal) => {
      signal = abortSignal;
      return new Promise<ChatMessage[]>((resolve, reject) => {
        deliver = resolve;
        abortSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    }),
  };
  vi.mocked(chatClient).mockReturnValue(client);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

async function open(lang?: string) {
  const hook = renderHook(() => useChat("Flora", lang));
  await waitFor(() => expect(client.poll).toHaveBeenCalled());
  return hook;
}

describe("chat page lifecycle", () => {
  it("uses tenant/environment and query language, with greeting separate from history", async () => {
    const { result } = await open("ka-GE");
    expect(chatClient).toHaveBeenCalledWith("marani", "pr-58");
    expect(loadGreeting).toHaveBeenCalledWith("marani", "ka");
    expect(result.current.greeting).toBe("გამარჯობა!");
    expect(result.current.messages.map((m) => m.id)).toEqual([1]);
  });

  it("falls back to the first two navigator language letters", async () => {
    await open();
    expect(loadGreeting).toHaveBeenCalledWith("marani", navigator.language.slice(0, 2).toLowerCase());
  });

  it("keeps demo sends off the API on preview hosts", async () => {
    vi.mocked(tenantFromLocation).mockReturnValue(null);
    vi.useFakeTimers();
    const { result } = renderHook(() => useChat("Flora"));
    expect(result.current.greeting).toBe("Hi! Welcome to Flora. How can I help?");
    await act(() => result.current.send("Hello"));
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(result.current.messages.map((m) => m.author)).toEqual(["customer", "agent"]);
    expect(chatClient).not.toHaveBeenCalled();
    expect(loadGreeting).not.toHaveBeenCalled();
  });

  it("shows optimistic sends and reconciles duplicated customer IDs from send and poll", async () => {
    let finish: (value: { messages: ChatMessage[]; pending: boolean }) => void = () => {};
    client.send.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = await open();
    let sending: Promise<void> = Promise.resolve();
    act(() => { sending = result.current.send("Hello"); });
    expect(result.current.messages.at(-1)?.text).toBe("Hello");
    await waitFor(() => expect(client.send).toHaveBeenCalled());
    await act(async () => {
      finish({ messages: [message(2, "customer", "Hello"), message(3, "agent", "Reply")], pending: false });
      await sending;
    });
    await act(async () => { deliver([message(2, "customer", "Hello"), message(3, "agent", "Reply"), message(4, "staff", "Nino here")]); });
    expect(result.current.messages.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(result.current.messages.at(-1)?.author).toBe("staff");
  });

  it("keeps typing through customer-only polls and clears it on a staff reply", async () => {
    client.send.mockResolvedValue({ messages: [], pending: true });
    const { result } = await open();
    await act(() => result.current.send("Hello"));
    expect(result.current.pending).toBe(true);
    await act(async () => { deliver([message(2, "customer", "Hello")]); });
    expect(result.current.pending).toBe(true);
    await act(async () => { deliver([message(3, "staff", "Reply")]); });
    expect(result.current.pending).toBe(false);
    expect(result.current.messages.filter((m) => m.text === "Hello")).toHaveLength(1);
  });

  it("does not leave typing stuck when the poll reply precedes the pending send response", async () => {
    let finish: (value: { messages: ChatMessage[]; pending: boolean }) => void = () => {};
    client.send.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = await open();
    let sending: Promise<void> = Promise.resolve();
    act(() => { sending = result.current.send("Hello"); });
    await act(async () => { deliver([message(2, "staff", "Reply")]); });
    await act(async () => { finish({ messages: [], pending: true }); await sending; });
    expect(result.current.pending).toBe(false);
  });

  it("reports 429 and still allows another send", async () => {
    const { result } = await open();
    client.send.mockRejectedValueOnce(new ChatUnavailable(429));
    await act(() => result.current.send("Hello"));
    expect(result.current.error).toBe("You're sending messages quickly, please wait a moment.");
    await act(() => result.current.send("Again"));
    expect(client.send).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it.each([new ChatUnavailable(503), new TypeError("Network")])("reports other API or network failures", async (error) => {
    const { result } = await open();
    client.send.mockRejectedValueOnce(error);
    await act(() => result.current.send("Hello"));
    expect(result.current.error).toBe("Chat is unavailable right now. Please try again later.");
  });

  it("retries polling after 3 seconds and aborts on unmount", async () => {
    const hook = await open();
    vi.useFakeTimers();
    client.poll.mockRejectedValueOnce(new TypeError("Network"));
    await act(async () => { deliver([]); });
    expect(client.poll).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(2999));
    expect(client.poll).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(client.poll).toHaveBeenCalledTimes(3);
    hook.unmount();
    expect(signal?.aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(client.poll).toHaveBeenCalledTimes(3);
  });
});