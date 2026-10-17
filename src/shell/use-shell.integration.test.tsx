import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/archable/AppShell";

const mock = vi.hoisted(() => ({
  boot: vi.fn(), applyPending: vi.fn(), tenant: vi.fn(), navigate: vi.fn(),
  unsubscribe: vi.fn(),
  snapshot: { status: "booting", manifest: null, ui: null, pendingEpoch: null, live: false },
}));
vi.mock("@/lib/supabase", () => ({ supabase: null }));
vi.mock("@/chat/session", () => ({ tenantFromHost: mock.tenant }));
vi.mock("@tanstack/react-router", () => ({ useRouter: () => router }));
vi.mock("./shell", () => ({ createShell: () => ({
  boot: mock.boot, applyPending: mock.applyPending,
  getSnapshot: () => mock.snapshot,
  subscribe: () => () => {},
}) }));
const router = { subscribe: mock.navigate };

beforeEach(() => {
  vi.clearAllMocks();
  mock.tenant.mockReturnValue(null);
  mock.boot.mockResolvedValue(mock.snapshot);
  mock.navigate.mockReturnValue(mock.unsubscribe);
});
afterEach(cleanup);

describe("App shell lifecycle", () => {
  it("does not boot or subscribe to navigation on demo hosts", () => {
    render(<AppShell><div /></AppShell>);
    expect(mock.tenant).toHaveBeenCalledWith(window.location.hostname);
    expect(mock.boot).not.toHaveBeenCalled();
    expect(mock.navigate).not.toHaveBeenCalled();
  });

  it("boots once for a tenant and applies staged changes only on navigation", () => {
    mock.tenant.mockReturnValue({ slug: "marani", env: "prod" });
    const view = render(<AppShell><div /></AppShell>);
    view.rerender(<AppShell><div /></AppShell>);
    expect(mock.boot).toHaveBeenCalledTimes(1);
    expect(mock.navigate).toHaveBeenCalledTimes(1);
    expect(mock.navigate.mock.calls[0]?.[0]).toBe("onBeforeNavigate");
    expect(mock.applyPending).not.toHaveBeenCalled();
    act(() => { mock.navigate.mock.calls[0]?.[1](); });
    expect(mock.applyPending).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
});