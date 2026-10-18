#!/usr/bin/env node
// live-check/live-check.mjs: the live runs still open on DEV-1's tasks (archable PROGRESS.md), against the deployed
// API and web app. Not part of the Lovable build: plain Node with its own package.json, Chrome via playwright-core.
//
//   P2.D1.1  Try as customer: POST /v1/turns as the owner, and the reply in the Try as customer window (plan §5.6)
//   P3.D1.6  /chat: a reply, a reload keeps the history, blocked storage still chats; CORS, webhook 404 and
//            frame-ancestors (plan §6.6, §6.7 step 3)
//   P5.D1.1  The shell boots from /v1/manifest and the UI projection; an epoch flip shows at the next navigation,
//            without a reload (v3 §2.4)
//   P5.D1.3  A turn pulses the delivery.status edge and raises its count in the open inspector; customer.upsert's
//            contract tree (plan §8.6 steps 2–4)
//
// Run it from this folder with Node 22+ and Google Chrome installed:
//   npm install
//   OWNER_TOKEN=$(pnpm -C <archable> -s tsx scripts/dev-session.ts --tenant marani --role owner) node live-check.mjs
// `node live-check.mjs --help` lists the options and environment variables.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright-core';

const USAGE = `Usage: node live-check.mjs [--only P2.D1.1,P3.D1.6,P5.D1.1,P5.D1.3] [--flip | --wait-flip <seconds>] [--headed]

  --only        run some of the checks (default: all four)
  --flip        P5.D1.1: flip the tenant's epoch to its current digest (a real write: epoch + 1, same bundle);
                needs DATABASE_URL_CONTROL
  --wait-flip   P5.D1.1: wait this long for a flip made elsewhere (e.g. an approved change going live)
  --headed      show the browser

Environment:
  OWNER_TOKEN           an owner's Supabase access token; P2.D1.1, P5.D1.1 and P5.D1.3 need it, P3.D1.6 doesn't
                        (archable: pnpm -s tsx scripts/dev-session.ts --tenant marani --role owner)
  API_URL               where the API is deployed (default https://api.archable.run)
  WEB_URL               where the web app is deployed (default https://<tenant>.archable.run)
                        The browser always shows https://<tenant>.archable.run and calls https://api.archable.run, as
                        in production. If either URL points elsewhere (DNS not live yet, a *.vercel.app deployment, a
                        local server), that origin is proxied there, so the Origin the API routes on stays the tenant's.
  TENANT                tenant slug (default marani)
  DATABASE_URL_CONTROL  only for --flip: flip_epoch() is granted to archable_control alone
  CHROME_PATH           Chrome binary (default: the installed Google Chrome)
  LIVE_CHECK_WIRE       a module whose default export receives every browser context first; only for rehearsing
                        against local stand-ins

Exit code: 0 when nothing failed (skips are fine), 1 when a check failed, 2 when the API isn't reachable.`;

const CHECKS = ['P2.D1.1', 'P3.D1.6', 'P5.D1.1', 'P5.D1.3'];
const { values: o } = parseArgs({
  options: {
    only: { type: 'string' }, flip: { type: 'boolean', default: false }, 'wait-flip': { type: 'string' },
    headed: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false },
  },
});
if (o.help) { console.log(USAGE); process.exit(0); }
const only = o.only ? o.only.split(',').map((s) => s.trim().toUpperCase()) : CHECKS;
if (only.some((id) => !CHECKS.includes(id))) { console.error(`--only takes ${CHECKS.join(', ')}`); process.exit(2); }
const waitFlipMs = o['wait-flip'] ? Number(o['wait-flip']) * 1000 : 0;
if (Number.isNaN(waitFlipMs)) { console.error('--wait-flip takes seconds'); process.exit(2); }

const TENANT = process.env.TENANT ?? 'marani';
const TENANT_ORIGIN = `https://${TENANT}.archable.run`;
const API_ORIGIN = 'https://api.archable.run';                      // the web build's default VITE_ARCHABLE_API_URL
const API_URL = (process.env.API_URL ?? API_ORIGIN).replace(/\/+$/, '');
const WEB_URL = (process.env.WEB_URL ?? TENANT_ORIGIN).replace(/\/+$/, '');
const TOKEN = process.env.OWNER_TOKEN?.trim() || null;
const ASK = 'gamarjoba, saperavi gaqvt 40 laramde?';                // plan §5.8: a seeded wine and its exact price
const WHERE = 'Where is my order M-00012? My phone is +995 599 000 000.';   // plan §6.7 step 4: delivery.status
const STATUS_EDGE = 'tool:app:contact_center->app:quickshipper:delivery.status';
const UPSERT_EDGE = 'tool:app:contact_center->app:customer_center:customer.upsert';
const FLIP_NOTE = 'Updated — changes appear when you open the next page';
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// The browser sees production origins; these two are proxied when the deployment lives somewhere else.
const upstream = new Map();
if (API_URL !== API_ORIGIN) upstream.set(API_ORIGIN, API_URL);
if (WEB_URL !== TENANT_ORIGIN) upstream.set(TENANT_ORIGIN, WEB_URL);
const HOP = new Set(['host', 'connection', 'keep-alive', 'content-length', 'content-encoding', 'transfer-encoding', 'accept-encoding']);

// ── results ──────────────────────────────────────────────────────────────────────────────────────────────────────
const results = [];
class Skip extends Error {}
const need = (ok, why) => { if (!ok) throw new Error(why); };
const skipIf = (cond, why) => { if (cond) throw new Skip(why); };
const clip = (s, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s).replace(/\s+/g, ' ');
function record(check, name, status, detail) {
  results.push({ check, name, status });
  console.log(`${{ pass: '✓', fail: '✗', skip: '–' }[status]} ${check}  ${name}${detail ? `: ${detail}` : ''}`);
}
async function step(check, name, fn, page) {
  try {
    record(check, name, 'pass', (await fn()) ?? '');
  } catch (e) {
    if (e instanceof Skip) return record(check, name, 'skip', e.message);
    const shot = `${OUT}${check}-${results.length + 1}.png`;
    if (page) await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    record(check, name, 'fail', `${String(e?.message ?? e).split('\n')[0]}${page ? ` (screenshot ${shot})` : ''}`);
  }
}

// ── API calls from Node: the Origin header is set explicitly, the way the browser would ───────────────────────────
async function api(path, { method = 'GET', origin = TENANT_ORIGIN, token = null, body } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(API_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: r.status, headers: r.headers, json, text };
}
const allowOrigin = (r) => r.headers.get('access-control-allow-origin');
async function corsCheck(path) {                                    // plan §6.7 step 3
  const preflight = (origin) => fetch(API_URL + path, {
    method: 'OPTIONS', signal: AbortSignal.timeout(15_000),
    headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
  });
  const [evil, mine] = await Promise.all([preflight('https://evil.example'), preflight(TENANT_ORIGIN)]);
  need(!allowOrigin(evil), `evil.example got Access-Control-Allow-Origin: ${allowOrigin(evil)}`);
  need(allowOrigin(mine) === TENANT_ORIGIN, `${TENANT_ORIGIN} got ${allowOrigin(mine) ?? 'no Access-Control-Allow-Origin'}`);
  return `evil.example gets none, ${TENANT_ORIGIN} is echoed`;
}
const turn = (text) => api('/v1/turns', { method: 'POST', token: TOKEN, body: { text, thread: `lc${Date.now().toString(36)}` } });

// ── the owner's session, as supabase-js keeps it in localStorage ─────────────────────────────────────────────────
function ownerSession() {
  if (!TOKEN) return null;
  let claims;
  try { claims = JSON.parse(Buffer.from(TOKEN.split('.')[1] ?? '', 'base64url').toString()); } catch { claims = null; }
  if (!claims?.sub || !claims.exp || !claims.iss) { console.error('OWNER_TOKEN is not a Supabase access token'); process.exit(2); }
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp - now < 300) { console.error(`OWNER_TOKEN expires in ${claims.exp - now} s; get a fresh one`); process.exit(2); }
  const key = process.env.SUPABASE_STORAGE_KEY ?? `sb-${new URL(claims.iss).hostname.split('.')[0]}-auth-token`;
  const user = { id: claims.sub, aud: claims.aud, role: claims.role, email: claims.email ?? '', phone: claims.phone ?? '', app_metadata: claims.app_metadata ?? {}, user_metadata: claims.user_metadata ?? {}, created_at: new Date().toISOString() };
  // refresh_token is a placeholder: supabase-js only refreshes in the last 90 s, and the run is over long before.
  const value = { access_token: TOKEN, token_type: 'bearer', expires_in: claims.exp - now, expires_at: claims.exp, refresh_token: 'live-check', user };
  return { key, value: JSON.stringify(value), who: claims.email || claims.sub, minutes: Math.floor((claims.exp - now) / 60) };
}
const session = ownerSession();

// ── browser ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function forward(route) {
  const req = route.request();
  const u = new URL(req.url());
  const base = upstream.get(u.origin);
  const headers = Object.fromEntries(Object.entries(req.headers()).filter(([k]) => !HOP.has(k)));
  try {
    // Page loads follow redirects here: Chrome doesn't route the follow-up of a fulfilled redirect (e.g. /chat's
    // 307 to its canonical search params), so it would leave the proxy and hit real DNS.
    const r = await fetch(base + u.pathname + u.search, {
      method: req.method(), headers, redirect: req.isNavigationRequest() ? 'follow' : 'manual', signal: AbortSignal.timeout(90_000),
      body: ['GET', 'HEAD'].includes(req.method()) ? undefined : (req.postDataBuffer() ?? undefined),
    });
    const out = {};
    r.headers.forEach((v, k) => { if (!HOP.has(k)) out[k] = k === 'location' ? v.replace(base, u.origin) : v; });
    await route.fulfill({ status: r.status, headers: out, body: Buffer.from(await r.arrayBuffer()) });
  } catch {
    await route.abort('connectionfailed').catch(() => {});
  }
}
const browser = await chromium.launch({ headless: !o.headed, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }) });
const wire = process.env.LIVE_CHECK_WIRE ? (await import(pathToFileURL(resolve(process.env.LIVE_CHECK_WIRE)).href)).default : null;
async function open({ owner = false, blockStorage = false, width = 1280, height = 800 } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  context.setDefaultTimeout(30_000);
  context.setDefaultNavigationTimeout(60_000);
  if (wire) await wire(context);
  if (upstream.size) await context.route((url) => upstream.has(url.origin), forward);
  if (owner) await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } }, [session.key, session.value]);
  if (blockStorage) await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { context, page, errors };
}
const noErrors = (errors) => { need(!errors.length, errors.slice(0, 2).map((e) => clip(e, 120)).join(' | ')); };
const dock = (page, label) => page.locator(`nav[aria-label="Quick launch"] [aria-label="${label}"]`);
// Server-rendered buttons exist before hydration; a click that lands too early does nothing, so retry it.
async function clickUntil(page, target, shown, tries = 4) {
  for (let i = 1; ; i++) {
    await target.click();
    try { await shown.first().waitFor({ timeout: 5_000 }); return; } catch (e) { if (i === tries) throw e; }
  }
}

// ── P2.D1.1 Try as customer ──────────────────────────────────────────────────────────────────────────────────────
async function p2() {
  const C = 'P2.D1.1';
  await step(C, 'POST /v1/turns without a session → 401', async () => {
    const r = await api('/v1/turns', { method: 'POST', body: { text: 'hi' } });
    need(r.status === 401, `got ${r.status} ${clip(r.text)}`);
  });
  await step(C, 'CORS on /v1/turns', () => corsCheck('/v1/turns'));
  await step(C, 'POST /v1/turns as the owner → reply, sent, trace', async () => {
    skipIf(!TOKEN, 'set OWNER_TOKEN');
    const t0 = Date.now();
    const r = await turn(ASK);
    need(r.status === 200, `got ${r.status} ${clip(r.text)}`);
    const j = r.json;
    need(typeof j?.turn_id === 'string' && typeof j.reply === 'string' && j.reply && typeof j.sent === 'boolean', `unexpected body ${clip(r.text)}`);
    need(j.trace === `/dev/turns/${j.turn_id}`, `trace is ${j.trace}`);
    return `sent=${j.sent} after ${Date.now() - t0} ms: "${clip(j.reply)}"`;
  });
  if (!TOKEN) return;
  const { context, page, errors } = await open({ owner: true });
  const tryWindow = (p) => p.locator('[role=dialog]').filter({ has: p.locator('section[aria-labelledby="try-customer-title"]') });
  await step(C, 'UI: the reply shows in the Try as customer window', async () => {
    await page.goto(`${TENANT_ORIGIN}/?biz=${TENANT}`);
    await clickUntil(page, dock(page, 'Try as customer'), tryWindow(page));
    const input = tryWindow(page).locator('input[aria-label="Customer message"]');
    await input.fill(ASK);
    await input.press('Enter');
    const verdicts = tryWindow(page).locator('p.pill', { hasText: /Would be sent|Held back for a person to answer/ });
    const settled = verdicts.or(tryWindow(page).locator('[role=alert]'));
    await settled.first().waitFor({ timeout: 45_000 });
    const alert = tryWindow(page).locator('[role=alert]');
    if (await alert.count()) {
      const text = await alert.first().innerText();
      throw new Error(`the window says "${text}"${/sign in/i.test(text)
        ? ': no owner session in the page (is OWNER_TOKEN from the Supabase project the web build uses?)'
        : ': the call failed (API unreachable from the page, CORS, or no Supabase env in the web build)'}`);
    }
    const verdict = await verdicts.last().innerText();
    const trace = await tryWindow(page).locator('a', { hasText: 'See what happened' }).last().getAttribute('href');
    need(/^\/dev\/turns\/[\w-]+$/.test(trace ?? ''), `trace link is ${trace}`);
    return `"${verdict}", trace ${trace}`;
  }, page);
  await step(C, 'UI: API down → "Unavailable right now" at once', async () => {
    const down = await context.newPage();
    await down.route('**/v1/turns', (r) => r.abort('connectionfailed'));
    await down.goto(`${TENANT_ORIGIN}/?biz=${TENANT}`);
    await clickUntil(down, dock(down, 'Try as customer'), tryWindow(down));
    const input = tryWindow(down).locator('input[aria-label="Customer message"]');
    await input.fill('hello?');
    const t0 = Date.now();
    await input.press('Enter');
    await tryWindow(down).getByText('Unavailable right now').waitFor({ timeout: 10_000 });
    need(await input.isEnabled(), 'the input stayed disabled');
    await down.close();
    return `after ${Date.now() - t0} ms, input usable`;
  }, page);
  await step(C, 'no page errors', () => noErrors(errors));
  await context.close();
}

// ── P3.D1.6 /chat ────────────────────────────────────────────────────────────────────────────────────────────────
// Bubbles are the log's non-empty divs: "typing…" is a status and the scroll anchor is an empty div.
const bubbles = (page) => page.$$eval('main[role=log] > div', (ds) => ds
  .filter((d) => d.textContent.trim() && !d.matches('[role=status]'))
  .map((d) => ({ customer: d.classList.contains('ml-auto'), text: d.textContent.trim() })));
const atLeast = (page, n, timeout) => page.waitForFunction((min) => !!document.querySelector('main[role=log] [role=alert]')
  || [...document.querySelectorAll('main[role=log] > div')].filter((d) => d.textContent.trim() && !d.matches('[role=status]')).length >= min, n, { timeout });
async function chatReady(page) {
  await atLeast(page, 1, 45_000);                                   // the greeting (or an error)
  const alert = page.locator('main[role=log] [role=alert]');
  need(!(await alert.count()), `the page says "${await alert.first().innerText().catch(() => '')}"`);
}
async function chatSend(page, text) {
  await page.fill('input[aria-label="Message"]', text);
  await page.click('button[type=submit]');
  // A reply is any non-customer bubble after this message; 202 replies arrive through the long poll.
  await page.waitForFunction((t) => {
    if (document.querySelector('main[role=log] [role=alert]')) return true;
    const ds = [...document.querySelectorAll('main[role=log] > div')].filter((d) => d.textContent.trim() && !d.matches('[role=status]'));
    const i = ds.findLastIndex((d) => d.classList.contains('ml-auto') && d.textContent.includes(t));
    return i >= 0 && ds.slice(i + 1).some((d) => !d.classList.contains('ml-auto'));
  }, text, { timeout: 60_000 });
  const alert = page.locator('main[role=log] [role=alert]');
  need(!(await alert.count()), `the page says "${await alert.first().innerText().catch(() => '')}"`);
  return (await bubbles(page)).at(-1).text;
}
async function p3() {
  const C = 'P3.D1.6';
  await step(C, 'CORS on /v1/chat/messages', () => corsCheck('/v1/chat/messages'));
  await step(C, 'unknown tenant-bot webhook → 404', async () => {
    const r = await api(`/v1/webhooks/telegram/b/${randomUUID()}`, { method: 'POST', origin: null, body: {} });
    need(r.status === 404, `got ${r.status}`);
  });
  await step(C, 'frame-ancestors on /chat', async () => {
    skipIf(upstream.has(TENANT_ORIGIN), `the web app is proxied from ${WEB_URL}, whose server never sees the tenant host`);
    const r = await fetch(`${TENANT_ORIGIN}/chat`, { signal: AbortSignal.timeout(30_000) });
    const csp = r.headers.get('content-security-policy') ?? '';
    need(/frame-ancestors 'self' https:\/\/\*\.archable\.run/.test(csp), `Content-Security-Policy is "${csp}"`);
    return clip(csp, 120);
  });

  const a = await open({ width: 360, height: 780 });
  let before = [];
  await step(C, 'UI: greeting, then a reply', async () => {
    await a.page.goto(`${TENANT_ORIGIN}/chat`);
    await chatReady(a.page);
    const greeting = (await bubbles(a.page))[0]?.text ?? '';
    const reply = await chatSend(a.page, ASK);
    before = await bubbles(a.page);
    return `greeting "${clip(greeting, 40)}", reply "${clip(reply, 60)}"`;
  }, a.page);
  await step(C, 'UI: a reload keeps the whole conversation', async () => {
    need(before.length >= 2, 'nothing to compare (the previous step failed)');
    await a.page.reload();
    await atLeast(a.page, before.length, 45_000).catch(() => {});
    const after = await bubbles(a.page);
    const kept = before.every((b, i) => after[i]?.text === b.text && after[i]?.customer === b.customer);
    need(kept, `before: ${JSON.stringify(before.map((b) => clip(b.text, 30)))} after: ${JSON.stringify(after.map((b) => clip(b.text, 30)))}`);
    return `${before.length} bubbles before and after, customer's own included`;
  }, a.page);
  await step(C, 'no page errors', () => noErrors(a.errors));
  await a.context.close();

  const b = await open({ width: 360, height: 780, blockStorage: true });
  await step(C, 'UI: blocked storage + ?embed=1&lang=ka still chats, a reload starts fresh', async () => {
    await b.page.goto(`${TENANT_ORIGIN}/chat?embed=1&lang=ka`);
    await chatReady(b.page);
    const greeting = (await bubbles(b.page))[0]?.text ?? '';
    need(await b.page.locator('button[aria-label="Close"]').count() === 1, 'no close button in embed mode');
    await chatSend(b.page, 'gamarjoba');
    await b.page.reload();
    await chatReady(b.page);
    await b.page.waitForTimeout(3_000);                             // a resumed session would bring its history by now
    const after = await bubbles(b.page);
    need(after.length === 1, `after the reload: ${JSON.stringify(after.map((x) => clip(x.text, 30)))}`);
    return `greeting "${clip(greeting, 40)}", close button, fresh session after reload`;
  }, b.page);
  await step(C, 'no page errors (blocked storage)', () => noErrors(b.errors));
  await b.context.close();
}

// ── P5.D1.1 shell boot and epoch flip ────────────────────────────────────────────────────────────────────────────
async function flipEpoch(m) {
  const url = process.env.DATABASE_URL_CONTROL;
  need(url, '--flip needs DATABASE_URL_CONTROL');
  const { default: postgres } = await import('postgres');
  const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 15 });
  try {
    const [row] = await sql`select public.flip_epoch(${m.tenant_id}::uuid, ${m.epoch}::bigint, ${m.digest}) as epoch`;
    return Number(row.epoch);
  } finally {
    await sql.end();
  }
}
async function p51() {
  const C = 'P5.D1.1';
  let m = null;
  await step(C, 'GET /v1/manifest from the tenant origin', async () => {
    const r = await api('/v1/manifest');
    need(r.status === 200, `got ${r.status} ${clip(r.text)}`);
    m = r.json;
    need(m?.slug === TENANT && Number.isInteger(m.epoch) && typeof m.digest === 'string' && m.topic === `tenant:${m.tenant_id}`, `unexpected body ${clip(r.text)}`);
    need(/s-maxage=5/.test(r.headers.get('cache-control') ?? ''), `Cache-Control is ${r.headers.get('cache-control')}`);
    need(allowOrigin(r) === TENANT_ORIGIN, `Access-Control-Allow-Origin is ${allowOrigin(r)}`);
    return `"${m.os_name}", epoch ${m.epoch}, ${clip(m.digest, 24)}`;
  });
  await step(C, 'GET /v1/manifest from evil.example → 400', async () => {
    const r = await api('/v1/manifest', { origin: 'https://evil.example' });
    need(r.status === 400, `got ${r.status}`);
  });
  await step(C, 'GET /v1/bundles/:digest/ui: immutable, and readable from the tenant page', async () => {
    need(m, 'no manifest');
    skipIf(!TOKEN, 'set OWNER_TOKEN to read the protected UI projection');
    const r = await api(`/v1/bundles/${encodeURIComponent(m.digest)}/ui`, { token: TOKEN });
    need(r.status === 200 && r.json !== null, `got ${r.status} ${clip(r.text)}`);
    need(/immutable/.test(r.headers.get('cache-control') ?? ''), `Cache-Control is ${r.headers.get('cache-control')}`);
    // The shell fetches this cross-origin; without the header the browser blocks it and the shell shows "unavailable".
    need([TENANT_ORIGIN, '*'].includes(allowOrigin(r)), `no Access-Control-Allow-Origin for ${TENANT_ORIGIN}: the browser would block the shell's fetch`);
    return `${r.headers.get('cache-control')}, Access-Control-Allow-Origin ${allowOrigin(r)}`;
  });
  if (!TOKEN) return record(C, 'UI boot and epoch flip', 'skip', 'set OWNER_TOKEN');
  if (!m) return record(C, 'UI boot and epoch flip', 'skip', 'no manifest');
  const { context, page, errors } = await open({ owner: true });
  await step(C, 'UI: boots from the live manifest', async () => {
    await page.goto(`${TENANT_ORIGIN}/?biz=${TENANT}`);
    await page.locator('header').getByText(m.os_name).first().waitFor({ timeout: 30_000 });
    await page.locator('header').getByText('Live', { exact: true }).waitFor({ timeout: 10_000 });
    return `header shows "${m.os_name}" and Live`;
  }, page);
  await step(C, 'UI: the header names the OS once', async () => {
    const name = (await page.locator('header button').first().innerText()).replace(/\s+/g, ' ').trim();
    need(!/\bOS\s*OS\b/.test(name), `the header reads "${name}": os_name already ends in "OS" and the header adds another`);
    return `"${name}"`;
  }, page);
  await step(C, 'UI: subscribed to the tenant topic (Developer Console shows Live)', async () => {
    await clickUntil(page, dock(page, 'Developer Console'), page.getByRole('heading', { name: 'Developer Console' }));
    const status = page.locator('section[aria-label="Agent activity"] header span').last();
    await page.waitForFunction(() => document.querySelector('section[aria-label="Agent activity"] header span:last-child')?.textContent?.trim() === 'Live', null, { timeout: 20_000 })
      .catch(async () => { throw new Error(`the event stream says "${await status.innerText()}"`); });
    return 'Live';
  }, page);
  await step(C, 'UI: an epoch flip waits for the next navigation, without a reload', async () => {
    skipIf(!o.flip && !waitFlipMs, 'pass --flip (needs DATABASE_URL_CONTROL) or --wait-flip <seconds>');
    await page.evaluate(() => { window.__liveCheck = 'same document'; });
    const reread = page.waitForResponse((r) => r.url().endsWith('/v1/manifest') && r.ok() && r.json().then((j) => j.epoch > m.epoch, () => false),
      { timeout: o.flip ? 30_000 : waitFlipMs });
    if (o.flip) await flipEpoch(m);
    else console.log(`  … waiting up to ${waitFlipMs / 1000} s for an epoch flip on ${TENANT}`);
    const next = await (await reread).json();
    await page.getByText(FLIP_NOTE).waitFor({ timeout: 15_000 });
    await clickUntil(page, dock(page, 'All apps'), page.locator('section[aria-labelledby=apps-title]'));
    await page.getByText(FLIP_NOTE).waitFor({ state: 'detached', timeout: 10_000 });
    need(await page.evaluate(() => window.__liveCheck) === 'same document', 'the page reloaded');
    await page.locator('header').getByText(next.os_name).first().waitFor({ timeout: 5_000 });
    return `epoch ${m.epoch} → ${next.epoch}: the note showed, the next navigation applied it, same document`;
  }, page);
  await step(C, 'no page errors', () => noErrors(errors));
  await context.close();
}

// ── P5.D1.3 graph and edge inspector ─────────────────────────────────────────────────────────────────────────────
async function p53() {
  const C = 'P5.D1.3';
  await step(C, 'GET /v1/dev/a2a without a session → 403', async () => {
    const r = await api('/v1/dev/a2a');
    need(r.status === 403, `got ${r.status}`);
  });
  if (!TOKEN) return record(C, 'graph, inspector and live pulse', 'skip', 'set OWNER_TOKEN');
  await step(C, 'GET /v1/dev/a2a: 3 app nodes, courier_api outside, 6 edges (plan §1.2)', async () => {
    const r = await api('/v1/dev/a2a', { token: TOKEN });
    need(r.status === 200, `got ${r.status} ${clip(r.text)}`);
    const g = r.json;
    const apps = g.nodes.filter((n) => n.kind === 'app').length;
    const outside = g.nodes.filter((n) => n.kind === 'external').map((n) => n.id);
    need(apps === 3 && outside.includes('conn:courier_api') && g.edges.length === 6, `${apps} apps, outside ${JSON.stringify(outside)}, ${g.edges.length} edges`);
    need([STATUS_EDGE, UPSERT_EDGE].every((id) => g.edges.some((e) => e.id === id)), 'delivery.status or customer.upsert edge missing');
    return `${apps} apps, ${outside.join(', ')}, ${g.edges.length} edges`;
  });
  const detail = () => api(`/v1/dev/a2a/edges/${encodeURIComponent(STATUS_EDGE)}`, { token: TOKEN });
  let apiBefore = null;
  await step(C, 'GET /v1/dev/a2a/edges/<delivery.status>', async () => {
    const r = await detail();
    need(r.status === 200, `got ${r.status} ${clip(r.text)}`);
    const d = r.json;
    need(d?.contract?.operation_id && Number.isInteger(d.stats?.calls) && Array.isArray(d.recent), `unexpected body ${clip(r.text)}`);
    apiBefore = d.stats.calls;
    return `${d.stats.calls} calls in 24 h, operation ${d.contract.operation_id}, Elva ${d.elva.sync}`;
  });

  const { context, page, errors } = await open({ owner: true });
  const inspector = page.locator('[role=dialog]');
  const calls = async () => Number((await inspector.locator('dl > div').first().locator('dd').innerText()).trim());
  await step(C, 'UI: the System Map draws the live graph, stream connected', async () => {
    await page.goto(`${TENANT_ORIGIN}/dev?biz=${TENANT}`);
    await clickUntil(page, page.getByRole('tab', { name: 'System Map' }), page.locator('.graph-edge-label button'));
    const bar = (await page.locator('.map-toolbar').innerText()).replace(/\s+/g, ' ');
    need(!/Sample system/.test(bar), `the map shows the sample system: "${clip(bar)}" (no shell session or manifest?)`);
    need(/Stream connected/.test(bar), `toolbar says "${clip(bar)}"`);
    return clip(bar);
  }, page);
  await step(C, 'UI: a turn pulses delivery.status and raises its count by one', async () => {
    await page.locator('.graph-edge-label button').filter({ hasText: 'delivery.status' }).first().click();
    await inspector.locator('dl dd').first().waitFor();
    const n = await calls();
    await page.evaluate(() => {                                     // pulses: a flash path or a recoloured edge
      window.__pulses = [];
      const edgeOf = (el) => el.closest('[data-id]')?.getAttribute('data-id') ?? el.closest('[data-testid^="rf__edge-"]')?.getAttribute('data-testid')?.slice(9) ?? null;
      new MutationObserver((ms) => {
        for (const m of ms) {
          for (const node of m.addedNodes) if (node instanceof Element && node.matches('path.telemetry-flash')) window.__pulses.push(edgeOf(node));
          if (m.type === 'attributes' && m.target instanceof SVGPathElement && /--(success|destructive)/.test(m.target.getAttribute('style') ?? '')) window.__pulses.push(edgeOf(m.target));
        }
      }).observe(document.querySelector('.react-flow'), { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    });
    const r = await turn(WHERE);                                    // "another tab": the same engine via the API
    need(r.status === 200, `the turn failed: ${r.status} ${clip(r.text)}`);
    try {
      await page.waitForFunction((before) => Number(document.querySelector('[role=dialog] dl > div dd')?.textContent) > before, n, { timeout: 45_000 });
    } catch {
      const now = (await detail()).json?.stats?.calls;
      throw new Error(apiBefore !== null && now > apiBefore
        ? `the API counted the call (${apiBefore} → ${now}) but the open inspector stayed at ${n}: no tool_call broadcast reached the page`
        : `no delivery.status call was recorded (API ${apiBefore} → ${now}); the turn replied "${clip(r.json?.reply ?? '')}"`);
    }
    const pulses = await page.evaluate(() => window.__pulses);
    need(pulses.includes(STATUS_EDGE), `the count rose but no pulse on the edge (pulses: ${JSON.stringify(pulses)})`);
    return `calls ${n} → ${await calls()}, edge pulsed; the turn replied "${clip(r.json.reply, 50)}"`;
  }, page);
  await step(C, 'UI: customer.upsert shows phone as required, the operation id and the Elva badge', async () => {
    await page.keyboard.press('Escape');
    await inspector.waitFor({ state: 'detached', timeout: 5_000 });
    await page.locator('.graph-edge-label button').filter({ hasText: 'customer.upsert' }).first().click();
    await inspector.locator('h4', { hasText: 'Input' }).waitFor();
    const phone = await inspector.locator('section:has(> h4:text-is("Input")) div').filter({ has: page.locator('span:text-is("phone")') }).last().innerText();
    need(/required/.test(phone), `phone row is "${clip(phone)}"`);
    const op = (await inspector.locator('section:has(> h3:text-is("Contract")) > p.font-mono').last().innerText()).trim();
    need(op && !/No (output|contract)/.test(op), `operation id is "${op}"`);
    const elva = (await inspector.locator('.pill').first().innerText()).trim();
    need(/^Elva · (In sync|Drift|Unknown)$/.test(elva), `badge is "${elva}"`);
    return `phone required, ${op}, ${elva}`;
  }, page);
  await step(C, 'no page errors', () => noErrors(errors));
  await context.close();
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`API     ${API_URL}${upstream.has(API_ORIGIN) ? `  (the browser's ${API_ORIGIN} is proxied here)` : ''}`);
console.log(`Web     ${WEB_URL}${upstream.has(TENANT_ORIGIN) ? `  (the browser's ${TENANT_ORIGIN} is proxied here)` : ''}`);
console.log(`Owner   ${session ? `${session.who}, token valid ${session.minutes} more min` : 'none (OWNER_TOKEN not set: owner steps are skipped)'}`);
const health = await fetch(`${API_URL}/healthz`, { signal: AbortSignal.timeout(15_000) }).then((r) => r.status, (e) => e.cause?.code ?? e.message);
if (health !== 200) {
  console.error(`✗ API not reachable: GET ${API_URL}/healthz → ${health}. Set API_URL to where it's deployed.`);
  await browser.close();
  process.exit(2);
}
const web = await fetch(`${WEB_URL}/`, { signal: AbortSignal.timeout(30_000) }).then((r) => r.status, (e) => e.cause?.code ?? e.message);
if (typeof web !== 'number' || web >= 400) console.warn(`! Web app answered ${web} at ${WEB_URL}/: the UI steps will fail. Set WEB_URL to where it's deployed.`);
console.log('');

const run = { 'P2.D1.1': p2, 'P3.D1.6': p3, 'P5.D1.1': p51, 'P5.D1.3': p53 };
for (const id of only) await run[id]();
await browser.close();

console.log('\nSummary');
for (const id of only) {
  const mine = results.filter((r) => r.check === id);
  const count = (s) => mine.filter((r) => r.status === s).length;
  console.log(`  ${id}  ${count('fail') ? 'FAIL' : 'ok  '}  ${count('pass')} passed, ${count('fail')} failed, ${count('skip')} skipped`);
}
process.exit(results.some((r) => r.status === 'fail') ? 1 : 0);
