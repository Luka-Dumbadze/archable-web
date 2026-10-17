import { describe, expect, it, vi } from "vitest";
import { CACHE_MS, embedOriginsLookup, frameAncestors, withFrameAncestors } from "./frame-ancestors";

const BASE = "frame-ancestors 'self' https://*.archable.run";

describe("frameAncestors", () => {
  it("is only *.archable.run when the tenant lists no sites", () => {
    expect(frameAncestors([])).toBe(BASE);
  });
  it("adds the tenant's embed origins", () => {
    expect(frameAncestors(["https://marani.ge", "https://www.marani.ge"])).toBe(`${BASE} https://marani.ge https://www.marani.ge`);
  });
  it.each(["*", "https://*.marani.ge", "http://marani.ge", "https://marani.ge/path", "https://marani.ge; script-src *", "'unsafe-inline'", "marani.ge", "https://marani.ge "])(
    "drops %j", (bad) => { expect(frameAncestors([bad, "https://marani.ge"])).toBe(`${BASE} https://marani.ge`); });
});

describe("embedOriginsLookup", () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  it("reads embed_origins from the public widget config and caches it for 60 s", async () => {
    let t = 0;
    const f = vi.fn(async () => json(200, { embed_origins: ["https://marani.ge"] }));
    const lookup = embedOriginsLookup(f as unknown as typeof fetch, () => t);
    expect(await lookup("marani")).toEqual(["https://marani.ge"]);
    t = CACHE_MS - 1; await lookup("marani");
    expect(f).toHaveBeenCalledTimes(1);
    expect(String((f.mock.calls[0] as unknown as [string])[0])).toBe("https://api.archable.run/v1/widget/config/marani");
    t = CACHE_MS + 1; await lookup("marani");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("fails closed: chat off, API down or an old config without the field → []", async () => {
    expect(await embedOriginsLookup((async () => json(404, { error: "chat_unavailable" })) as unknown as typeof fetch)("acme")).toEqual([]);
    expect(await embedOriginsLookup((async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch)("marani")).toEqual([]);
    expect(await embedOriginsLookup((async () => json(200, { greeting: {} })) as unknown as typeof fetch)("marani")).toEqual([]);
  });
});

describe("withFrameAncestors", () => {
  const page = () => new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
  const lookup = vi.fn(async () => ["https://marani.ge"]);

  it("sets the header on /chat at a tenant host, keeping the response", async () => {
    const r = await withFrameAncestors(page(), new URL("https://marani.archable.run/chat?embed=1"), lookup);
    expect(r.headers.get("content-security-policy")).toBe(`${BASE} https://marani.ge`);
    expect(r.headers.get("content-type")).toBe("text/html");
    expect(await r.text()).toBe("<html></html>");
    expect(lookup).toHaveBeenCalledWith("marani");
  });

  it("covers preview hosts too", async () => {
    const r = await withFrameAncestors(page(), new URL("https://pr-58--marani.archable.run/chat"), lookup);
    expect(r.headers.get("content-security-policy")).toBe(`${BASE} https://marani.ge`);
  });

  it("leaves other paths and non-tenant hosts alone", async () => {
    for (const u of ["https://marani.archable.run/", "https://marani.archable.run/dev", "https://archable-web.lovable.app/chat", "http://localhost:4320/chat"]) {
      expect((await withFrameAncestors(page(), new URL(u), lookup)).headers.get("content-security-policy")).toBeNull();
    }
  });
});
