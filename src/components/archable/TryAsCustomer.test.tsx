import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TryAsCustomer } from "./TryAsCustomer";

const { request, thread } = vi.hoisted(() => ({ request: vi.fn(), thread: vi.fn() }));
vi.mock("@/owner/try-turn", () => ({ tryTurn: request, newThread: thread }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

beforeEach(() => {
  vi.resetAllMocks();
  let n = 0;
  thread.mockImplementation(() => `conversation-${++n}`);
  request.mockResolvedValue({ ok: true, turnId: "1", reply: "Yes", sent: true, trace: "/dev/turns/1" });
});
afterEach(cleanup);

describe("Customer console interaction", () => {
  it("sends the trimmed input through the existing hook", async () => {
    render(<TryAsCustomer />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Is it available?  " } });
    fireEvent.submit(screen.getByRole("textbox").closest("form") as HTMLFormElement);
    await waitFor(() => expect(request).toHaveBeenCalledWith({}, "Is it available?", { thread: "conversation-1" }));
  });

  it("blocks additional messages while a request is pending and unlocks afterwards", async () => {
    let finish: ((value: unknown) => void) | undefined;
    request.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<TryAsCustomer />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => { finish?.({ ok: true, turnId: "1", reply: "Hello", sent: false, trace: "/dev/turns/1" }); });
    expect(input).not.toBeDisabled();
  });

  it("starts a different conversation after reset", async () => {
    render(<TryAsCustomer />);
    const input = screen.getByRole("textbox");
    const send = screen.getByRole("button", { name: "Send" });
    fireEvent.change(input, { target: { value: "First" } });
    fireEvent.click(send);
    await waitFor(() => expect(input).not.toBeDisabled());
    const firstThread = request.mock.calls[0]?.[2].thread;
    fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
    fireEvent.change(input, { target: { value: "Second" } });
    fireEvent.click(send);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1]?.[2].thread).not.toBe(firstThread);
  });

  it.each(["signed_out", "unavailable", "rejected"])("allows retry after %s", async (reason) => {
    request.mockResolvedValue({ ok: false, reason });
    render(<TryAsCustomer />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "First" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, { target: { value: "Retry" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1]?.[1]).toBe("Retry");
  });
});