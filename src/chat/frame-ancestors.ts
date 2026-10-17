// src/chat/frame-ancestors.ts: which sites may frame the chat page (decision Q3). Not a component.
// On a tenant host (<slug>.archable.run), /chat answers with
//   Content-Security-Policy: frame-ancestors 'self' https://*.archable.run <channels.web_chat.embed_origins>
// read from the public widget config and cached 60 s per tenant. If the config can't be read, only
// *.archable.run may frame the page (fail closed). Other hosts (Lovable preview, localhost) get no header,
// so the editor's own preview iframe keeps working.
import { createMiddleware } from "@tanstack/react-start";
import type { WidgetConfig } from "@/contracts";
import { API, tenantFromHost } from "./session";

const BASE = "frame-ancestors 'self' https://*.archable.run";
const ORIGIN = /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::[0-9]{1,5})?$/;
export const CACHE_MS = 60_000;

/** The header value. Anything that isn't a plain https origin is dropped, so a bad spec value can't widen it. */
export function frameAncestors(embedOrigins: readonly string[]): string {
  const extra = [...new Set(embedOrigins.filter((o) => ORIGIN.test(o)))];
  return extra.length ? `${BASE} ${extra.join(" ")}` : BASE;
}

type Lookup = (slug: string) => Promise<string[]>;

/** Embed origins for a tenant, cached CACHE_MS; [] when chat is off or the API can't be reached. */
export function embedOriginsLookup(fetchImpl: typeof fetch = fetch, now: () => number = Date.now): Lookup {
  const cache = new Map<string, { at: number; origins: string[] }>();
  return async (slug) => {
    const hit = cache.get(slug);
    if (hit && now() - hit.at < CACHE_MS) return hit.origins;
    let origins: string[] = [];
    try {
      const r = await fetchImpl(`${API}/v1/widget/config/${slug}`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) origins = ((await r.json()) as Partial<WidgetConfig>).embed_origins ?? [];
    } catch { /* fail closed */ }
    cache.set(slug, { at: now(), origins });
    return origins;
  };
}

/** Adds the header to a /chat response on a tenant host; returns the response unchanged otherwise. */
export async function withFrameAncestors(response: Response, url: URL, lookup: Lookup): Promise<Response> {
  const tenant = tenantFromHost(url.hostname);
  if (url.pathname !== "/chat" || !tenant) return response;
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", frameAncestors(await lookup(tenant.slug)));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const lookup = embedOriginsLookup();

/** Request middleware for src/start.ts. */
export const chatFrameAncestorsMiddleware = createMiddleware().server(async ({ request, next }) => {
  const result = await next();
  return withFrameAncestors(result.response, new URL(request.url), lookup);
});
