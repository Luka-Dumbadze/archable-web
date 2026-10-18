import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RationaleCard } from "@/contracts";
import { demoDesires, resetDemoDesires } from "@/dev/demo-desires";
import { StructuredDesiresFeed } from "./StructuredDesiresFeed";

function openRationale() {
  const tab = screen.getAllByRole("tab", { name: "Rationale" })[0];
  if (!tab) throw new Error("Missing rationale tab");
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
}

afterEach(cleanup);

function props() {
  resetDemoDesires("marani");
  return {
    load: { state: "ready" as const, desires: demoDesires("marani"), demo: true },
    unlink: vi.fn().mockResolvedValue(true), unlinking: null as string | null,
    error: null, resetDemo: vi.fn(),
  };
}

describe("Structured desire controls", () => {
  it("unlinks the selected chapter from its desire", () => {
    const feed = props();
    render(<StructuredDesiresFeed {...feed} />);
    const control = screen.getAllByRole("button", { name: /^Unlink$/ })[0];
    if (!control) throw new Error("Missing unlink control");
    fireEvent.click(control);
    expect(feed.unlink).toHaveBeenCalledExactlyOnceWith("dddddddd-0000-0000-0000-000000000014", "c0000000-0000-0000-0000-00000000000a");
  });

  it("disables every unlink control while any chapter is pending", () => {
    const feed = props();
    feed.unlinking = "c0000000-0000-0000-0000-00000000000a";
    render(<StructuredDesiresFeed {...feed} />);
    const controls = screen.getAllByRole("button", { name: /^Unlink/ });
    expect(controls).toHaveLength(3);
    for (const control of controls) {
      expect(control).toBeDisabled();
      fireEvent.click(control);
    }
    expect(feed.unlink).not.toHaveBeenCalled();
  });

  it("delegates sample reset to the supplied helper", () => {
    const feed = props();
    render(<StructuredDesiresFeed {...feed} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset sample" }));
    expect(feed.resetDemo).toHaveBeenCalledTimes(1);
  });

  it("renders the rationale card when the desire has one", () => {
    const feed = props();
    render(<StructuredDesiresFeed {...feed} />);
    openRationale();
    expect(screen.getByText("What happened")).toBeInTheDocument();
    expect(screen.queryByText("Rationale is being drafted...")).not.toBeInTheDocument();
  });

  it("says the rationale is being drafted when the desire has no card yet", () => {
    const feed = props();
    feed.load.desires = feed.load.desires.map((desire) => ({ ...desire, rationale_card: null as unknown as RationaleCard }));
    render(<StructuredDesiresFeed {...feed} />);
    openRationale();
    expect(screen.getByText("Rationale is being drafted...")).toBeInTheDocument();
    expect(screen.queryByText("What happened")).not.toBeInTheDocument();
  });
});