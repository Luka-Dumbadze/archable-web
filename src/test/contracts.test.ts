import { describe, expect, it } from "vitest";
import type { ChatSessionResponse, Manifest } from "@/contracts";

// P1.D1.2: the copied contracts compile under this project's strict settings and are usable in the shell.
describe("contracts copy", () => {
  it("types a Manifest and a ChatSessionResponse", () => {
    const s: ChatSessionResponse = { token: "t", session_id: "s" };
    const slug = (m: Pick<Manifest, "slug">) => m.slug;
    expect(slug({ slug: "marani" })).toBe("marani");
    expect(s.session_id).toBe("s");
  });
});
