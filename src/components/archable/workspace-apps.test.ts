import { describe, expect, it } from "vitest";
import { WORKSPACE_APPS } from "./workspace-apps";
import { bizSearch } from "@/lib/biz-search";

describe("Workspace apps", () => {
  it("provides exactly the six requested business apps", () => {
    expect(WORKSPACE_APPS.map((app) => app.title)).toEqual(["Contact Center", "CRM", "Storage", "AI Team", "Analytics", "Operations"]);
  });
  it.each(["contact", "crm", "operations"])("preserves the selected business when opening %s", (view) => {
    expect(bizSearch.parse({ biz: "marani", view })).toEqual({ biz: "marani", view });
  });
  it("rejects an unavailable app selection", () => {
    expect(bizSearch.safeParse({ biz: "flora", view: "builder" }).success).toBe(false);
  });
});