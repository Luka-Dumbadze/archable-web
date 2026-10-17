import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactFlowProps } from "@xyflow/react";
import type { LaidOutGraph, Load } from "@/dev/use-a2a";
import { MARANI_A2A } from "@/dev/fixtures/marani";

const mock = vi.hoisted(() => ({ load: { state: "loading" } as Load<LaidOutGraph>, reload: vi.fn(), pulses: {} as Record<string, "allow" | "deny">, flow: {} as ReactFlowProps }));
vi.mock("@/dev/use-a2a", () => ({ useA2A: () => ({ ...mock.load, reload: mock.reload }), useEdgePulses: () => mock.pulses }));
vi.mock("./EdgeInspector", () => ({ EdgeInspector: () => null }));
vi.mock("@xyflow/react", () => ({
  ReactFlow: (props: ReactFlowProps) => { mock.flow = props; return <div />; },
  Background: () => null, Controls: () => null, Handle: () => null, BaseEdge: () => null, EdgeLabelRenderer: () => null,
  Position: { Left: "left", Right: "right" }, getSmoothStepPath: () => ["", 0, 0],
}));
import A2AGraph from "./A2AGraph";

afterEach(() => { cleanup(); mock.pulses = {}; mock.reload.mockClear(); });
function ready() {
  const node = MARANI_A2A.nodes[0];
  if (!node) throw new Error("Fixture node missing");
  mock.load = { state: "ready", demo: true, data: {
    graph: MARANI_A2A,
    nodes: [{ id: "app:contact_center", type: "a2a", position: { x: 127, y: 391 }, data: { node, title: "Contact Center", subtitle: "5 tools", external: false } }],
    edges: [{ id: "edge-one", source: "app:contact_center", target: "app:quickshipper", label: "Connection", style: { strokeDasharray: "6 4", strokeWidth: 1.5 } }],
  } };
}
describe("Developer map controls", () => {
  it("preserves supplied positions and highlights title search matches", () => {
    ready(); render(<A2AGraph />);
    expect(mock.flow.nodes?.[0]?.position).toEqual({ x: 127, y: 391 });
    fireEvent.keyDown(document, { key: "/" });
    const search = screen.getByRole("textbox", { name: "Search nodes" });
    expect(document.activeElement).toBe(search);
    fireEvent.change(search, { target: { value: "contact" } });
    expect(mock.flow.nodes?.[0]?.selected).toBe(true);
    fireEvent.change(search, { target: { value: "missing" } });
    expect(mock.flow.nodes?.[0]?.selected).toBe(false);
  });
  it.each(["allow", "deny"] as const)("highlights %s pulses while preserving supplied dash styling", (decision) => {
    ready(); mock.pulses = { "edge-one": decision }; render(<A2AGraph />);
    expect(mock.flow.edges?.[0]?.style).toEqual({ strokeDasharray: "6 4", strokeWidth: 3.5, stroke: decision === "deny" ? "var(--destructive)" : "var(--primary)" });
  });
  it("retries failed loads through the maintained hook", () => {
    mock.load = { state: "failed", reason: "unavailable" }; render(<A2AGraph />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mock.reload).toHaveBeenCalledTimes(1);
  });
});