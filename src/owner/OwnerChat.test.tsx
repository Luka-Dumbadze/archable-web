import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OwnerChat } from "./OwnerChat";

const { message, press, rationale } = vi.hoisted(() => ({ message: vi.fn(), press: vi.fn(), rationale: vi.fn() }));
vi.mock("./demo-architect", () => ({ createDemoArchitect: () => ({ message, press, rationale }) }));
vi.mock("@/lib/supabase", () => ({ supabase: null }));

beforeEach(() => {
  vi.resetAllMocks();
  message.mockResolvedValue({ text: "Which change?", buttons: [] });
  press.mockResolvedValue({ text: "Done", buttons: [] });
  rationale.mockResolvedValue(null);
});
afterEach(cleanup);

function submit(text = "  Allow cash on delivery  ") {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  return input;
}

describe("Owner Architect chat controls", () => {
  it("sends trimmed text and blocks duplicate submissions while busy", async () => {
    let finish: ((reply: unknown) => void) | undefined;
    message.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<OwnerChat business={{ id: "marani" }} />);
    const input = submit();
    expect(message).toHaveBeenCalledWith("Allow cash on delivery");
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    const form = input.closest("form");
    if (!form) throw new Error("Missing message form");
    fireEvent.submit(form);
    expect(message).toHaveBeenCalledTimes(1);
    await act(async () => { finish?.({ text: "Done", buttons: [] }); });
    expect(input).not.toBeDisabled();
  });

  it("allows only one action answer per Architect entry", async () => {
    message.mockResolvedValue({ text: "Choose", buttons: [
      { action: "post", label: "Draft it", path: "/v1/owner/draft", body: { choice: "draft" } },
      { action: "post", label: "Not this", path: "/v1/owner/dismiss", body: {} },
    ] });
    render(<OwnerChat business={{ id: "marani" }} />);
    submit();
    const draft = await screen.findByRole("button", { name: "Draft it" });
    fireEvent.click(draft);
    await waitFor(() => expect(screen.getByRole("textbox")).not.toBeDisabled());
    expect(draft).toBeDisabled();
    expect(screen.getByRole("button", { name: "Not this" })).toBeDisabled();
    fireEvent.click(draft);
    expect(press).toHaveBeenCalledTimes(1);
    expect(press).toHaveBeenCalledWith("/v1/owner/draft");
  });

  it("delegates links without marking the entry answered", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    message.mockResolvedValue({ text: "Choose", buttons: [
      { action: "url", label: "Open Telegram", url: "https://t.me/ArchableBot" },
      { action: "post", label: "Draft it", path: "/v1/owner/draft", body: {} },
    ] });
    render(<OwnerChat business={{ id: "marani" }} />);
    submit();
    fireEvent.click(await screen.findByRole("button", { name: "Open Telegram" }));
    expect(open).toHaveBeenCalledWith("https://t.me/ArchableBot", "_blank", "noopener,noreferrer");
    expect(screen.getByRole("button", { name: "Draft it" })).not.toBeDisabled();
    open.mockRestore();
  });

  it("loads reasons on request and closing clears the sheet", async () => {
    message.mockResolvedValue({ text: "Ready for you: Cash on delivery.", buttons: [
      { action: "post", label: "View rationale", path: "/v1/owner/changes/D-14/rationale", body: {} },
    ] });
    render(<OwnerChat business={{ id: "marani" }} />);
    submit();
    fireEvent.click(await screen.findByRole("button", { name: "View rationale" }));
    await waitFor(() => expect(rationale).toHaveBeenCalledWith("D-14"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});