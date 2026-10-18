import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appendActivity, TeamActivity } from "./TeamActivity";
import type { ToolCallEvent } from "@/shell/shell";

const mock = vi.hoisted(() => ({ listener: undefined as undefined | ((call: ToolCallEvent) => void), unsubscribe: vi.fn(), status: "ready", live: true }));
vi.mock("@/shell/use-shell", () => ({ useShell: () => ({ status: mock.status, live: mock.live, manifest: { tenant_id: "marani" } }), shell: () => ({ onToolCall: (listener: (call: ToolCallEvent) => void) => { mock.listener = listener; return mock.unsubscribe; } }) }));
afterEach(() => { cleanup(); mock.status = "ready"; mock.listener = undefined; vi.clearAllMocks(); });

describe("AI Team broadcast activity", () => {
  it("receives real collaborating agent calls and unsubscribes on close", () => {
    const { unmount } = render(<TeamActivity />);
    expect(screen.queryByText("New order M-001 confirmed")).not.toBeInTheDocument();
    act(() => mock.listener?.({ id: 1, caller: "Contact Center Agent", tool: "Operations Agent", decision: "allow", status: "ok", latency_ms: 15, turn_id: null }));
    expect(screen.getByText("Contact Center Agent")).toBeInTheDocument();
    expect(screen.getByText("Operations Agent")).toBeInTheDocument();
    unmount();
    expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it("never displays samples when a ready tenant has no received calls", () => {
    render(<TeamActivity />);
    expect(screen.queryByText("cellar.reserve")).not.toBeInTheDocument();
    expect(screen.getByText("Waiting for agent activity.")).toBeInTheDocument();
  });
  it("replaces repeat broadcasts rather than duplicating events", () => {
    const call: ToolCallEvent = { id: 7, caller: "dispatch", tool: "delivery.dispatch", decision: "allow", status: "ok", latency_ms: 15, turn_id: null };
    expect(appendActivity([call], { ...call, status: "error" })).toEqual([{ ...call, status: "error" }]);
  });
});