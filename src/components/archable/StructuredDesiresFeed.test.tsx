import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDesires, resetDemoDesires } from "@/dev/demo-desires";
import { StructuredDesiresFeed } from "./StructuredDesiresFeed";

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
});