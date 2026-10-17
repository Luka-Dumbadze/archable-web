import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EdgeDetail } from "@/contracts";
import type { Load } from "@/dev/use-a2a";
import { MARANI_A2A, maraniEdgeDetail } from "@/dev/fixtures/marani";

const mock = vi.hoisted(() => ({ detail: { state: "idle" } as Load<EdgeDetail> | { state: "idle" } }));
vi.mock("@/dev/use-a2a", () => ({ useEdgeDetail: () => mock.detail }));
import { EdgeInspector } from "./EdgeInspector";
afterEach(cleanup);
function show(kind: "event" | "connection") {
  const edge = MARANI_A2A.edges.find((e) => e.kind === kind);
  if (!edge) throw new Error("Fixture edge missing");
  const data = maraniEdgeDetail(edge.id);
  if (!data) throw new Error("Fixture detail missing");
  data.recent = [];
  mock.detail = { state: "ready", demo: true, data };
  render(<EdgeInspector edge={edge} graph={MARANI_A2A} onClose={() => {}} />);
  return data;
}
describe("Connection details", () => {
  it("does not offer a playground for events and renders null percentiles as missing", () => {
    show("event");
    expect(screen.queryByRole("link", { name: "Open in Elva Playground" })).toBeNull();
    expect(screen.getByText("p50 ms").nextElementSibling?.textContent).toBe("—");
    expect(screen.getByText("p95 ms").nextElementSibling?.textContent).toBe("—");
  });
  it("opens only the supplied playground URL in a new tab", () => {
    const data = show("connection");
    const link = screen.getByRole("link", { name: "Open in Elva Playground" });
    expect(link.getAttribute("href")).toBe(data.elva.playground_url);
    expect(link.getAttribute("target")).toBe("_blank");
  });
});