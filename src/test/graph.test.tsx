import { describe, expect, it } from "vitest";
import { BUSINESSES } from "@/lib/businesses";
import { layoutNodes } from "@/components/archable/DevMode";

describe("agent graph", () => {
  it("sizes to each business", () => {
    const counts = Object.fromEntries(BUSINESSES.map((b) => [b.id, b.nodes.length]));
    expect(counts).toEqual({ flora: 4, marani: 5, smilecare: 3 });
  });
  it("positions every node and every edge endpoint", () => {
    for (const b of BUSINESSES) {
      const pos = layoutNodes(b.nodes.map((n) => n.id));
      for (const e of b.edges) { expect(pos[e.from]).toBeDefined(); expect(pos[e.to]).toBeDefined(); }
    }
  });
});
