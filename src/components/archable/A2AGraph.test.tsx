import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactFlowProps } from "@xyflow/react";
import type { LaidOutGraph, Load } from "@/dev/use-a2a";
import { MARANI_A2A } from "@/dev/fixtures/marani";

const ROUTE = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }];
const LABEL = { x: 10, y: 90, width: 120, height: 24 };

const mock = vi.hoisted(() => ({ load: { state: "loading" } as Load<LaidOutGraph>, reload: vi.fn(), pulses: {} as Record<string, "allow" | "deny">, flow: {} as ReactFlowProps, edge: null as Record<string, unknown> | null }));
vi.mock("@/dev/use-a2a", () => ({ useA2A: () => ({ ...mock.load, reload: mock.reload }), useEdgePulses: () => mock.pulses }));
vi.mock("./EdgeInspector", () => ({ EdgeInspector: () => null }));
vi.mock("@xyflow/react", () => ({
  ReactFlow: (props: ReactFlowProps) => { mock.flow = props; return <div />; },
  Background: () => null, Controls: () => null, Handle: () => null,
  BaseEdge: (props: Record<string, unknown>) => { mock.edge = props; return null; },
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Position: { Left: "left", Right: "right" }, getSmoothStepPath: () => ["M 0 0 L 10 10"],
}));
import A2AGraph, { ConnectionEdge, contentBounds } from "./A2AGraph";

afterEach(() => { cleanup(); mock.pulses = {}; mock.reload.mockClear(); mock.edge = null; });
function ready() {
  const node = MARANI_A2A.nodes[0];
  if (!node) throw new Error("Fixture node missing");
  mock.load = { state: "ready", demo: true, data: {
    graph: MARANI_A2A,
    nodes: [{ id: "app:contact_center", type: "a2a", position: { x: 127, y: 391 }, data: { node, title: "Contact Center", subtitle: "5 tools", external: false } }],
    edges: [{ id: "edge-one", source: "app:contact_center", target: "app:quickshipper", label: "Connection", type: "smoothstep", data: { edge: MARANI_A2A.edges[0]!, dash: "6 4", width: 1.5, points: ROUTE, label: LABEL }, style: { strokeDasharray: "6 4", strokeWidth: 1.5 } }],
  } };
}
function edgeProps(data: Record<string, unknown>) {
  return { id: "edge-one", label: "Connection", data, sourceX: 0, sourceY: 0, targetX: 100, targetY: 80 } as never;
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
  it("passes layout routes and label boxes through untouched (no lane offsets)", () => {
    ready(); render(<A2AGraph />);
    const edge = mock.flow.edges?.[0] as { data?: Record<string, unknown> };
    expect(edge.data?.points).toEqual(ROUTE);
    expect(edge.data?.label).toEqual(LABEL);
    expect(edge.data).not.toHaveProperty("lane");
  });
  it.each(["allow", "deny"] as const)("highlights %s pulses while preserving supplied dash styling", (decision) => {
    ready(); mock.pulses = { "edge-one": decision }; render(<A2AGraph />);
    expect(mock.flow.edges?.[0]?.style).toEqual({ strokeDasharray: "6 4", strokeWidth: 3.5, stroke: decision === "deny" ? "var(--destructive)" : "var(--primary)" });
  });
  it("draws a rounded polyline through the layout route", () => {
    render(<ConnectionEdge {...edgeProps({ edge: MARANI_A2A.edges[0]!, dash: undefined, width: 1.5, points: ROUTE, label: LABEL })} />);
    const path = String(mock.edge?.path);
    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path.endsWith("L 100 80")).toBe(true);
    expect(path).toContain("Q");
  });
  it("places the label box at its top-left with the layout width", () => {
    render(<ConnectionEdge {...edgeProps({ edge: MARANI_A2A.edges[0]!, dash: undefined, width: 1.5, points: ROUTE, label: LABEL })} />);
    const wrap = screen.getByRole("button", { name: "Connection" }).parentElement;
    expect(wrap?.style.transform).toBe("translate(10px, 90px)");
    expect(wrap?.style.width).toBe("120px");
  });
  it("falls back to a smooth step when the route has fewer than 2 points", () => {
    render(<ConnectionEdge {...edgeProps({ edge: MARANI_A2A.edges[0]!, dash: undefined, width: 1.5, points: [], label: null })} />);
    expect(mock.edge?.path).toBe("M 0 0 L 10 10");
  });
  it("bounds the default view to nodes and label boxes", () => {
    const node = MARANI_A2A.nodes[0]!;
    const bounds = contentBounds(
      [{ id: "app:contact_center", type: "a2a", position: { x: 127, y: 391 }, data: { node, title: "Contact Center", subtitle: "5 tools", external: false } }],
      [{ data: { edge: MARANI_A2A.edges[0]!, dash: undefined, width: 1.5, points: ROUTE, label: { x: 10, y: 100, width: 120, height: 24 } } }],
    );
    expect(bounds).toEqual({ x: 10, y: 100, width: 337, height: 375 });
  });
  it("retries failed loads through the maintained hook", () => {
    mock.load = { state: "failed", reason: "unavailable" }; render(<A2AGraph />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mock.reload).toHaveBeenCalledTimes(1);
  });
});
