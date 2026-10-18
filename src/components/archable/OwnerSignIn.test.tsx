import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OwnerSignIn, ownerHomeSearch } from "./OwnerSignIn";

const { complete, navigate, client } = vi.hoisted(() => ({
  complete: vi.fn(), navigate: vi.fn(), client: {},
}));
vi.mock("@/auth/web-link", () => ({ completeSignIn: complete }));
vi.mock("@/lib/supabase", () => ({ supabase: client }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("Owner sign-in lifecycle", () => {
  it("never exchanges a link during server rendering", () => {
    renderToString(<OwnerSignIn />);
    expect(complete).not.toHaveBeenCalled();
  });

  it("calls completeSignIn once with the existing client even with effect replay", async () => {
    complete.mockResolvedValue({ ok: false, reason: "none" });
    render(<StrictMode><OwnerSignIn /></StrictMode>);
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(complete).toHaveBeenCalledWith(client);
  });

  it("only permits opening Owner Mode after successful sign-in and navigates to /", async () => {
    let finish: ((result: unknown) => void) | undefined;
    complete.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<OwnerSignIn />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    finish?.({ ok: true, session: {} });
    const button = await screen.findByRole("button");
    fireEvent.click(button);
    expect(navigate).toHaveBeenCalledWith({ to: "/", search: { biz: "" } });
  });

  it("targets the tenant workspace from the host slug", () => {
    expect(ownerHomeSearch("flora.archable.run")).toEqual({ biz: "flora" });
    expect(ownerHomeSearch("pr-12--marani.archable.run")).toEqual({ biz: "marani" });
    expect(ownerHomeSearch("localhost")).toEqual({ biz: "" });
    expect(ownerHomeSearch("api.archable.run")).toEqual({ biz: "" });
  });

  it.each(["expired", "none", "unavailable"])("does not permit Owner Mode for %s", async (reason) => {
    complete.mockResolvedValue({ ok: false, reason });
    render(<OwnerSignIn />);
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});