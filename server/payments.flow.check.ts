// Run: npx tsx server/payments.flow.check.ts
// The real API server against a local fake of Razorpay's API: every way a payment can be reported
// (browser verify, webhook, reconcile), duplicates, forgeries, and the account sign-in that recovers a paid wedding.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

type Order = { id: string; amount: number; currency: string; status: string; notes: Record<string, string> };
type Payment = { id: string; order_id: string; amount: number; currency: string; status: string; email?: string };
const orders = new Map<string, Order>();
const payments = new Map<string, Payment>();
let captures = 0;

const fake = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const send = (code: number, json: unknown) => (res.writeHead(code, { 'content-type': 'application/json' }), res.end(JSON.stringify(json)));
    const u = req.url ?? '';
    let m: RegExpMatchArray | null;
    if (req.method === 'POST' && u === '/orders') {
      const o = { ...JSON.parse(body), id: `order_${orders.size + 1}`, status: 'created' };
      orders.set(o.id, o);
      return send(200, o);
    }
    if ((m = u.match(/^\/orders\/([^/]+)\/payments$/))) return send(200, { items: [...payments.values()].filter((p) => p.order_id === m![1]) });
    if ((m = u.match(/^\/orders\/([^/]+)$/))) return orders.has(m[1]) ? send(200, orders.get(m[1])) : send(404, { error: { description: 'no order' } });
    if ((m = u.match(/^\/payments\/([^/]+)\/capture$/))) {
      const p = payments.get(m[1])!;
      if (p.status === 'captured') return send(400, { error: { description: 'This payment has already been captured' } });
      p.status = 'captured';
      captures++;
      return send(200, p);
    }
    if ((m = u.match(/^\/payments\/([^/]+)$/))) return payments.has(m[1]) ? send(200, payments.get(m[1])) : send(404, { error: { description: 'no payment' } });
    send(404, { error: { description: 'unknown' } });
  });
});
await new Promise<void>((r) => fake.listen(0, '127.0.0.1', r));
const fakePort = (fake.address() as { port: number }).port;

const PORT = 3000 + Math.floor(Math.random() * 900) + 4000;
const KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';
const server = spawn('npx', ['tsx', path.join(import.meta.dirname, 'index.ts')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    DATA_DIR: mkdtempSync(path.join(tmpdir(), 'wv-pay-')),
    DATABASE_URL: '',
    RAZORPAY_KEY_ID: 'rzp_test_fake',
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    RAZORPAY_API_URL: `http://127.0.0.1:${fakePort}`,
    RESEND_API_KEY: '',
    AUTH_DEV_CODES: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));
const done = (code: number) => (server.kill(), fake.close(), process.exit(code));
process.on('uncaughtException', (e) => (console.error(e, '\n--- server log ---\n', log), done(1)));
process.on('unhandledRejection', (e) => (console.error(e, '\n--- server log ---\n', log), done(1)));

const BASE = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 100 && !log.includes('API on'); i++) await new Promise((r) => setTimeout(r, 100));

async function call(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(BASE + url, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, json: (await res.json().catch(() => null)) as Record<string, any> };
}
const publish = async (names: [string, string], ref?: string) =>
  (await call('POST', '/api/weddings', { data: { partner1: { name: names[0] }, partner2: { name: names[1] }, weddingDate: '2026-12-14' }, ref })).json;
const own = async (slug: string, key: string) => (await call('GET', `/api/weddings/${slug}/own`, undefined, { 'x-edit-key': key })).json;
const signature = (orderId: string, paymentId: string) => createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const webhook = (payment: Payment, secret = WEBHOOK_SECRET) => {
  const raw = JSON.stringify({ event: 'order.paid', payload: { payment: { entity: payment } } });
  return fetch(`${BASE}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': createHmac('sha256', secret).update(raw).digest('hex') },
    body: raw,
  });
};
const pay = (orderId: string, status: string, over: Partial<Payment> = {}): Payment => {
  const o = orders.get(orderId)!;
  const p = { id: `pay_${payments.size + 1}`, order_id: orderId, amount: o.amount, currency: 'INR', status, email: 'Priya@Example.com', ...over };
  payments.set(p.id, p);
  return p;
};

const priya = await publish(['Priya Kapoor', 'Arjun Mehta']);
const friend = await publish(['Neha Rao', 'Kabir Shah'], priya.slug);

// Demo checkout is closed when real keys are set.
assert.equal((await call('POST', '/api/payments/demo', { plan: 'royal_suite', slug: priya.slug }, { 'x-edit-key': priya.editKey })).status, 403);

// 1. UPI QR: paid on the phone, the checkout tab was closed, the browser never called verify.
const o1 = (await call('POST', '/api/payments/order', { plan: 'digital_classic', slug: priya.slug })).json;
assert.equal(o1.amount, 29900); // priced by the server
pay(o1.orderId, 'captured');
assert.equal((await own(priya.slug, priya.editKey)).plan, 'free');
const rec = await call('POST', '/api/payments/reconcile', { slug: priya.slug });
assert.equal(rec.json.plan, 'digital_classic'); // recovered without the browser
assert.equal((await own(priya.slug, priya.editKey)).ownerEmail, 'priya@example.com'); // payer's email becomes their account
console.log('ok  UPI QR paid after the tab closed is recovered by reconcile; payer email linked');

// 2. Authorized but not captured: the server captures before granting the plan.
const o2 = (await call('POST', '/api/payments/order', { plan: 'royal_suite', slug: priya.slug })).json;
const p2 = pay(o2.orderId, 'authorized');
const v2 = await call('POST', '/api/payments/verify', { orderId: o2.orderId, paymentId: p2.id, signature: signature(o2.orderId, p2.id) });
assert.equal(v2.status, 200);
assert.equal(v2.json.plan, 'royal_suite');
assert.equal(payments.get(p2.id)!.status, 'captured');
assert.equal(captures, 1);
console.log('ok  authorized payment is captured, then the plan is granted');

// 3. Forgeries change nothing.
assert.equal((await call('POST', '/api/payments/verify', { orderId: o2.orderId, paymentId: p2.id, signature: 'f'.repeat(64) })).status, 400);
assert.equal((await webhook(p2, 'wrong_secret')).status, 400);
const fo = (await call('POST', '/api/payments/order', { plan: 'royal_suite', slug: friend.slug })).json;
assert.equal(fo.amount, 54900); // friend discount, from the server's copy of the wedding
const partial = pay(fo.orderId, 'captured', { amount: 100 });
assert.equal((await webhook(partial)).status, 200);
const partialVerify = await call('POST', '/api/payments/verify', { orderId: fo.orderId, paymentId: partial.id, signature: signature(fo.orderId, partial.id) });
assert.equal(partialVerify.status, 409);
assert.equal((await own(friend.slug, friend.editKey)).plan, 'free');
console.log('ok  bad signatures and a partial payment grant nothing');

// 4. One payment reported five times at once (browser verify, webhook retries, reconcile) is applied once.
const full = pay(fo.orderId, 'captured', { email: 'neha@example.com' });
payments.delete(partial.id);
await Promise.all([
  call('POST', '/api/payments/verify', { orderId: fo.orderId, paymentId: full.id, signature: signature(fo.orderId, full.id) }),
  webhook(full),
  webhook(full),
  call('POST', '/api/payments/reconcile', { slug: friend.slug }),
  call('POST', '/api/payments/verify', { orderId: fo.orderId, paymentId: full.id, signature: signature(fo.orderId, full.id) }),
]);
assert.equal((await own(friend.slug, friend.editKey)).plan, 'royal_suite');
const referrer = await call('GET', `/api/weddings/${priya.slug}/rsvps`, undefined, { 'x-edit-key': priya.editKey });
assert.equal(referrer.json.paidReferrals, 1); // the referrer is credited once, not five times
assert.equal(referrer.json.creditInr, 100);
console.log('ok  duplicate reports apply once; referral credited once');

// 5. Accounts: sign in on a new device with a one-time code.
assert.deepEqual((await call('POST', '/api/auth/code', { email: 'nobody@example.com' })).json, { sent: true }); // same answer, no code
const asked = (await call('POST', '/api/auth/code', { email: ' PRIYA@example.com ' })).json;
assert.match(asked.devCode, /^\d{6}$/);
const wrong = asked.devCode === '000000' ? '111111' : '000000';
assert.equal((await call('POST', '/api/auth/verify', { email: 'priya@example.com', code: wrong })).status, 400);
const signedIn = (await call('POST', '/api/auth/verify', { email: 'priya@example.com', code: asked.devCode })).json;
assert.equal(signedIn.weddings.length, 1);
const newKey = signedIn.weddings[0].editKey;
assert.equal((await own(priya.slug, newKey)).plan, 'royal_suite'); // the new device can open the paid wedding
assert.equal((await own(priya.slug, priya.editKey)).plan, 'royal_suite'); // the old device still works
assert.equal((await call('POST', '/api/auth/verify', { email: 'priya@example.com', code: asked.devCode })).status, 400); // single use
// Five wrong guesses burn the code.
const again = (await call('POST', '/api/auth/code', { email: 'priya@example.com' })).json.devCode;
for (let i = 0; i < 5; i++) await call('POST', '/api/auth/verify', { email: 'priya@example.com', code: again === '000000' ? '111111' : '000000' });
assert.equal((await call('POST', '/api/auth/verify', { email: 'priya@example.com', code: again })).status, 400);
// Changing the account email needs the edit key.
assert.equal((await call('PUT', `/api/weddings/${priya.slug}/owner`, { email: 'evil@example.com' }, { 'x-edit-key': 'guess' })).status, 403);
console.log('ok  account sign-in: one-time code, single use, 5 tries, new device key, old key kept');

console.log('payment flow checks passed');
done(0);
