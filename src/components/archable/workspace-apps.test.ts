import { describe, expect, it } from "vitest";
import { WORKSPACE_APPS } from "./workspace-apps";
import { bizSearch } from "@/lib/biz-search";

describe("Workspace apps", () => {
  it("provides exactly five core business apps without AI Team", () => {
    expect(WORKSPACE_APPS.map((app) => app.title)).toEqual(["Contact Center", "Operations", "CRM", "Storage", "Analytics"]);
  });
  it.each(["contact", "crm", "operations"])("preserves the selected business when opening %s", (view) => {
    expect(bizSearch.parse({ biz: "marani", view })).toEqual({ biz: "marani", view });
  });
  it("rejects an unavailable app selection", () => {
    expect(bizSearch.safeParse({ biz: "flora", view: "builder" }).success).toBe(false);
  });
  it("maps the removed owner view to the desktop", () => {
    expect(bizSearch.parse({ biz: "marani", view: "owner" })).toEqual({ biz: "marani", view: "apps" });
  });
});