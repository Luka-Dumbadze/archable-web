import { describe, expect, it } from "vitest";
import { BUSINESSES } from "@/lib/businesses";
import { layoutA2A } from "@/dev/layout";
import { MARANI_A2A } from "@/dev/fixtures/marani";

describe("agent graph", () => {
  it("sizes to each business", () => {
    const counts = Object.fromEntries(BUSINESSES.map((b) => [b.id, b.nodes.length]));
    expect(counts).toEqual({ flora: 4, marani: 5, smilecare: 3 });
  });
  it("uses the compiled app map with every edge endpoint positioned", async () => {
    const { nodes, edges } = await layoutA2A(MARANI_A2A);
    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(6);
    for (const edge of edges) {
      expect(nodes.find((node) => node.id === edge.source)?.position.x).toEqual(expect.any(Number));
      expect(nodes.find((node) => node.id === edge.target)?.position.y).toEqual(expect.any(Number));
    }
  });
});
