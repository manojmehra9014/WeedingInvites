import 'dotenv/config';
import { SITE } from '../site.config';
import path from 'node:path';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import express from 'express';
import { entitlements, isPlanId, PlanId, REFERRER_CREDIT_INR } from '../src/data/pricing';
import {
  betterPlan, capturePayment, checkPayment, createOrder, fetchOrder, fetchOrderPayments, fetchPayment, isValidSignature, isValidWebhookSignature,
  Perks, quote, RazorpayKeys, RazorpayPayment,
} from './payments';
import { openStore, WeddingDoc } from './store';
import { keepAwake, startUptime, uptimeReport } from './uptime';
import { healthPage } from './healthPage';
import { isFunnelEvent } from '../src/utils/analytics';
import { emailEnabled, sendInviteEmail, sendLoginCode } from './email';
import { cleanData, cleanEmail, cleanGuestRsvp, cleanGuests, freeSlug, guestStatuses, isSlug, issueKey, keyMatches, newWedding, publicView, visibleRsvps } from './weddings';

const PORT = Number(process.env.PORT) || 3001;
const keys: RazorpayKeys | null =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET }
    : null;

const store = await openStore();
await startUptime(store);
const paymentsMode = !keys ? 'demo mode (no keys)' : keys.keyId.startsWith('rzp_test_') ? 'Razorpay TEST mode' : 'Razorpay LIVE';
const app = express();
app.set('trust proxy', 1); // Render/Railway/Nginx put the guest's IP in X-Forwarded-For

// Razorpay webhook: registered before the JSON parser because its signature covers the exact raw bytes.
// Covers payments whose browser never came back (UPI QR paid on the phone after the tab closed, a dropped connection).
app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!keys || !secret) return res.status(503).json({ error: 'Webhook not configured' });
  if (!Buffer.isBuffer(req.body) || !isValidWebhookSignature(req.body, req.get('x-razorpay-signature') ?? '', secret)) {
    return res.status(400).json({ error: 'Bad signature' });
  }
  let event: { event?: string; payload?: { payment?: { entity?: RazorpayPayment } } };
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Bad JSON' });
  }
  const payment = event.payload?.payment?.entity;
  if (['payment.authorized', 'payment.captured', 'order.paid'].includes(event.event ?? '') && payment?.order_id) {
    try {
      const r = await settle(payment.order_id, payment.id);
      if (!r.ok) console.warn('[payments] webhook not applied:', payment.id, r.reason);
    } catch (err) {
      console.error('[payments] webhook failed', err);
      return res.status(500).json({ error: 'Retry later' }); // Razorpay retries non-2xx
    }
  }
  res.json({ ok: true });
});

app.use('/api/payments', express.json({ limit: '10kb' }));
app.use('/api/auth', express.json({ limit: '2kb' }));
app.use('/api/admin', express.json({ limit: '10kb' }));
app.use('/api/events', express.json({ limit: '2kb' }));
// Published weddings carry the couple's resized photos as data URLs; everything guests send stays tiny.
const bigJson = express.json({ limit: '8mb' });
const midJson = express.json({ limit: '1mb' }); // guest lists
const smallJson = express.json({ limit: '10kb' });
app.use('/api/weddings', (req, res, next) =>
  (/\/(rsvp|seen)$/.test(req.path) ? smallJson : /\/guests/.test(req.path) ? midJson : bigJson)(req, res, next),
);

// Sign-in codes go by email. Without an email provider they are only printed in the server log, or
// (AUTH_DEV_CODES=1, tests only) returned in the response.
const devCodes = () => !emailEnabled() && process.env.AUTH_DEV_CODES === '1';
// Status for monitors (JSON) and people (a page, when a browser opens it). Only a browser visit or ?db=1
// touches the database, so the frequent keep-awake/host health pings never wake a sleeping serverless DB.
app.get('/api/health', async (req, res) => {
  const page = req.query.format !== 'json' && req.accepts(['json', 'html']) === 'html';
  let database: { ok: boolean; ms: number; error?: string } | undefined;
  if (page || req.query.db === '1') {
    const t = Date.now();
    try {
      await store.getMeta('uptime');
      database = { ok: true, ms: Date.now() - t };
    } catch (err) {
      database = { ok: false, ms: Date.now() - t, error: (err as Error).message };
    }
  }
  const body = {
    status: database?.ok === false ? 'degraded' : 'ok',
    app: SITE.name,
    version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    node: process.version,
    storage: process.env.DATABASE_URL ? 'Postgres' : 'JSON file',
    payments: paymentsMode,
    email: emailEnabled(),
    memoryMb: Math.round(process.memoryUsage().rss / 1e6),
    ...(database && { database }),
    ...uptimeReport(),
  };
  res.set('Cache-Control', 'no-store');
  if (page) return res.type('html').send(healthPage(body));
  res.status(database?.ok === false ? 503 : 200).json(body);
});
app.get('/api/config', (_req, res) => res.json({ payments: !!keys, email: emailEnabled(), accounts: emailEnabled() || devCodes() }));

/* ─────────────────────────────── helpers ──────────────────────────────── */

const editKey = (req: express.Request) => req.get('x-edit-key');
const load = async (slug: unknown) => (isSlug(slug) ? store.get(slug) : null);
const now = () => new Date().toISOString();

/** Loads the wedding and checks the edit key; sends the error response itself and returns null on failure. */
async function owned(req: express.Request, res: express.Response): Promise<WeddingDoc | null> {
  const doc = await load(req.params.slug);
  if (!doc) return res.status(404).json({ error: 'Not found' }), null;
  if (!keyMatches(doc, editKey(req))) return res.status(403).json({ error: 'Wrong edit key' }), null;
  return doc;
}

// ponytail: in-memory limiter, resets on restart; move to the DB or a proxy rule if abused at scale.
const hits = new Map<string, number[]>();
const limited = (key: string, max: number, windowMs: number) => {
  const t = Date.now();
  const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
  recent.push(t);
  hits.set(key, recent);
  if (hits.size > 50_000) hits.clear();
  return recent.length > max;
};

// Funnel steps only the server can vouch for; browsers can't report them.
const SERVER_EVENTS = new Set(['wedding_published', 'rsvp_received', 'payment_completed']);
/** Never awaited by callers' success path: a failed analytics write must not fail a publish, RSVP or payment. */
const trackSafe = (name: string, sid: string, detail = '') =>
  store.track(name, sid, /^[\w:.-]{1,60}$/.test(detail) ? detail : '').catch((err) => console.error('[events] failed', err));

const perksOf = (doc: WeddingDoc): Perks => ({
  referred: !!doc.referredBy && doc.plan === 'free', // the friend discount is for a first purchase
  creditInr: (doc.paidReferrals ?? 0) * REFERRER_CREDIT_INR - (doc.creditSpentInr ?? 0),
});

// ponytail: in-process lock, correct for one server process; use a DB row lock if you run several.
const locks = new Map<string, Promise<unknown>>();
function serial<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(key) ?? Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => {});
  locks.set(key, tail);
  tail.then(() => locks.get(key) === tail && locks.delete(key));
  return run;
}

/**
 * Applies a confirmed payment exactly once, however many times it is reported (browser verify, webhook,
 * reconcile, retries): spends referral credit, rewards the referrer once, links the payer's email as the
 * couple's account if they have none. Re-reads the wedding inside the lock so concurrent reports can't double-count.
 */
async function recordPurchase(slug: string, plan: PlanId, paymentId: string, amountInr: number, perk: string | null, orderId?: string, email = '') {
  await serial(`wedding:${slug}`, async () => {
    const doc = await store.get(slug);
    if (!doc || doc.paymentIds?.includes(paymentId) || doc.paymentId === paymentId) return;
    const spent = perk === 'CREDIT' ? quote(plan, '', { creditInr: perksOf(doc).creditInr }).discountInr : 0;
    trackSafe('payment_completed', doc.slug, plan);
    await store.patch(doc.slug, {
      plan: betterPlan(doc.plan, plan),
      paymentId,
      amountInr,
      paidAt: now(),
      creditSpentInr: (doc.creditSpentInr ?? 0) + spent,
      paymentIds: [...(doc.paymentIds ?? []), paymentId],
      pendingOrders: (doc.pendingOrders ?? []).filter((o) => o !== orderId),
      ...(!doc.ownerEmail && cleanEmail(email) ? { ownerEmail: cleanEmail(email) } : {}),
    });
    if (doc.plan === 'free' && doc.referredBy) {
      await serial(`wedding:${doc.referredBy}`, async () => {
        const referrer = await store.get(doc.referredBy!);
        if (referrer) await store.patch(referrer.slug, { paidReferrals: (referrer.paidReferrals ?? 0) + 1 });
      });
    }
  });
}

/**
 * The one place a real payment becomes a plan. Asks Razorpay (never the browser) for the order and payment,
 * captures an authorized payment, and applies it only if it is captured, for this order, in full.
 */
async function settle(orderId: string, paymentId?: string) {
  if (!keys) throw new Error('Payments are not configured');
  const order = await fetchOrder(keys, orderId);
  let payment = paymentId
    ? await fetchPayment(keys, paymentId)
    : (await fetchOrderPayments(keys, orderId)).items.find((p) => p.status === 'captured' || p.status === 'authorized');
  if (!payment) return { ok: false as const, reason: 'No payment for this order yet' };
  if (payment.status === 'authorized' && payment.order_id === order.id && payment.amount === order.amount) {
    // Accounts without auto-capture: an uncaptured payment is refunded after a few days, so capture it now.
    payment = await capturePayment(keys, payment).catch(() => fetchPayment(keys!, payment!.id)); // already captured by a parallel report
  }
  const checked = checkPayment(order, payment);
  if (!checked.ok) return checked;
  await recordPurchase(checked.slug, checked.plan, checked.paymentId, checked.amountInr, checked.coupon, order.id, checked.email);
  return checked;
}

/* ─────────────────────────────── weddings ─────────────────────────────── */

// Publish for the first time: claims a slug and returns the edit key exactly once.
app.post('/api/weddings', async (req, res) => {
  const data = cleanData(req.body?.data);
  if (!data) return res.status(400).json({ error: 'Missing couple names or wedding date' });
  const p1 = (data.partner1 as { name: string }).name.split(/\s+/)[0];
  const p2 = (data.partner2 as { name: string }).name.split(/\s+/)[0];
  const slug = await freeSlug(store, `${p1}-and-${p2}`);
  const { doc, editKey: key } = newWedding(slug, { ...data, customSlug: slug });
  // Arrived via another couple's invitation or referral link: remember it for the friend discount and their credit.
  const referrer = await load(req.body?.ref);
  if (referrer) {
    doc.referredBy = referrer.slug;
    await store.patch(referrer.slug, { referrals: (referrer.referrals ?? 0) + 1 });
  }
  await store.put(doc);
  trackSafe('wedding_published', slug, String(data.selectedTemplateId ?? ''));
  res.status(201).json({ slug, editKey: key, plan: doc.plan });
});

// Later edits: the live site updates for every guest immediately.
app.put('/api/weddings/:slug', async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const data = cleanData(req.body?.data);
  if (!data) return res.status(400).json({ error: 'Missing couple names or wedding date' });
  await store.patch(doc.slug, { data: { ...data, customSlug: doc.slug }, updatedAt: now() });
  res.json({ slug: doc.slug, plan: doc.plan });
});

app.get('/api/weddings/:slug', async (req, res) => {
  const doc = await load(req.params.slug);
  if (!doc) return res.status(404).json({ error: 'This invitation does not exist or was removed.' });
  res.json(publicView(doc, req.query.g));
});

// A personal link was opened: first open per guest is recorded, the rest ignored.
app.post('/api/weddings/:slug/seen', async (req, res) => {
  const doc = await load(req.params.slug);
  const token = req.body?.g;
  if (!doc || limited(`seen|${req.ip}`, 60, 10 * 60_000)) return res.status(204).end();
  if (doc.guests.some((g) => g.token === token) && !doc.opens.some((o) => o.token === token) && doc.opens.length < 20_000) {
    await store.append(doc.slug, 'opens', { token, at: now() });
  }
  res.status(204).end();
});

app.get('/api/weddings/:slug/rsvps', async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  res.json({
    ...visibleRsvps(doc),
    paymentId: doc.paymentId,
    amountInr: doc.amountInr,
    paidAt: doc.paidAt,
    referrals: doc.referrals ?? 0,
    paidReferrals: doc.paidReferrals ?? 0,
    creditInr: perksOf(doc).creditInr,
    referred: !!doc.referredBy,
    ownerEmail: doc.ownerEmail ?? null,
  });
});

app.delete('/api/weddings/:slug/rsvps/:id', async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  await store.deleteRsvp(doc.slug, req.params.id);
  res.json({ ok: true });
});

// Guests reply here. Always stored; the couple's plan only decides how many they can see.
app.post('/api/weddings/:slug/rsvp', async (req, res) => {
  const doc = await load(req.params.slug);
  if (!doc) return res.status(404).json({ error: 'This invitation does not exist.' });
  if (limited(`${req.ip}|${doc.slug}`, 10, 10 * 60_000)) return res.status(429).json({ error: 'Too many replies, please try again later.' });
  const rsvp = cleanGuestRsvp(doc, req.body ?? {});
  if (!rsvp) return res.status(400).json({ error: 'Please enter your name and phone number.' });
  if (doc.rsvps.length >= 5000) return res.status(409).json({ error: 'This invitation is not accepting replies.' });
  await store.append(doc.slug, 'rsvps', rsvp);
  trackSafe('rsvp_received', doc.slug);
  res.status(201).json({ ok: true });
});

/* ─────────────────────────────── accounts ─────────────────────────────── */

// The couple's account is their email: link it to the wedding (needs the edit key), then sign in anywhere with a code.
app.put('/api/weddings/:slug/owner', async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const email = cleanEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Enter a valid email address.' });
  await store.patch(doc.slug, { ownerEmail: email });
  res.json({ ownerEmail: email });
});

// Everything needed to restore the wedding on a device that just signed in.
app.get('/api/weddings/:slug/own', async (req, res) => {
  const doc = await owned(req, res);
  if (doc) res.json({ slug: doc.slug, plan: doc.plan, data: doc.data, paidAt: doc.paidAt, amountInr: doc.amountInr, ownerEmail: doc.ownerEmail ?? null });
});

// ponytail: pending codes live in memory (lost on restart, 10-minute life anyway); move to the DB for several processes.
const codes = new Map<string, { hash: string; exp: number; tries: number }>();
const sha = (v: string) => createHash('sha256').update(v).digest('hex');

app.post('/api/auth/code', async (req, res) => {
  const email = cleanEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (limited(`code|${req.ip}`, 10, 60 * 60_000) || limited(`code|${email}`, 5, 60 * 60_000)) {
    return res.status(429).json({ error: 'Too many codes requested. Please try again in an hour.' });
  }
  // The answer is the same whether or not this email has a wedding, so nobody can probe who is a customer.
  const owns = (await store.byOwner(email)).length > 0;
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  if (owns) {
    if (codes.size > 10_000) codes.clear();
    codes.set(email, { hash: sha(code), exp: Date.now() + 10 * 60_000, tries: 0 });
    if (emailEnabled()) {
      try {
        await sendLoginCode(email, code, SITE.name);
      } catch (err) {
        console.error('[auth] email failed', err);
        return res.status(502).json({ error: 'Could not send the email. Please try again.' });
      }
    } else console.log(`[auth] sign-in code for ${email}: ${code} (no email provider configured)`);
  }
  res.json({ sent: true, ...(devCodes() && owns ? { devCode: code } : {}) });
});

app.post('/api/auth/verify', async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const code = String(req.body?.code ?? '').replace(/\D/g, '');
  const entry = codes.get(email);
  if (!entry || entry.exp < Date.now() || entry.tries >= 5) {
    codes.delete(email);
    return res.status(400).json({ error: 'That code has expired. Ask for a new one.' });
  }
  entry.tries++;
  const a = Buffer.from(sha(code));
  const b = Buffer.from(entry.hash);
  if (!timingSafeEqual(a, b)) return res.status(400).json({ error: 'That code is not right. Check the email and try again.' });
  codes.delete(email);
  // Each device that signs in gets its own edit key; the couple's other devices keep working.
  const weddings = [];
  for (const d of await store.byOwner(email)) {
    const key = await serial(`wedding:${d.slug}`, async () => {
      const fresh = (await store.get(d.slug))!;
      const issued = issueKey(fresh);
      await store.patch(d.slug, { extraKeyHashes: issued.extraKeyHashes });
      return issued.key;
    });
    const n = (k: string) => String((d.data[k] as { name?: string } | undefined)?.name ?? '');
    weddings.push({ slug: d.slug, names: `${n('partner1')} & ${n('partner2')}`, weddingDate: String(d.data.weddingDate ?? ''), plan: d.plan, editKey: key });
  }
  res.json({ email, weddings });
});

/* ────────────────────────────── guest list ────────────────────────────── */

const guestPayload = (doc: WeddingDoc) => ({
  guests: guestStatuses(doc),
  limit: entitlements(doc.plan).guestList,
  plan: doc.plan,
  email: emailEnabled() && entitlements(doc.plan).emailInvites,
  emailConfigured: emailEnabled(),
});

app.get('/api/weddings/:slug/guests', async (req, res) => {
  const doc = await owned(req, res);
  if (doc) res.json(guestPayload(doc));
});

// The couple saves their whole list (add, edit, remove); tokens and send history survive by guest id.
app.put('/api/weddings/:slug/guests', async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const guests = cleanGuests(req.body?.guests, doc.guests);
  const limit = entitlements(doc.plan).guestList;
  if (guests.length > limit) {
    return res.status(402).json({ error: `Your plan holds ${limit} guests. Upgrade to add all ${guests.length}.`, limit });
  }
  await store.patch(doc.slug, { guests });
  res.json(guestPayload({ ...doc, guests }));
});

// Marks guests as invited (or reminded) after the couple sent them their link on WhatsApp or by hand.
app.post('/api/weddings/:slug/guests/sent', async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  const ids = new Set(Array.isArray(req.body?.ids) ? req.body.ids : []);
  const via = ['whatsapp', 'email', 'link'].includes(req.body?.via) ? req.body.via : 'link';
  const t = now();
  const guests = doc.guests.map((g) =>
    !ids.has(g.id) ? g : req.body?.reminder ? { ...g, remindedAt: t } : { ...g, invitedAt: g.invitedAt ?? t, invitedVia: g.invitedVia ?? via },
  );
  await store.patch(doc.slug, { guests });
  res.json(guestPayload({ ...doc, guests }));
});

// Emails every selected guest who has an address. Paid plans only (it costs us per message).
app.post('/api/weddings/:slug/guests/email', async (req, res) => {
  const doc = await owned(req, res);
  if (!doc) return;
  if (!emailEnabled()) return res.status(503).json({ error: 'Email sending is not set up on this server.' });
  if (!entitlements(doc.plan).emailInvites) return res.status(402).json({ error: 'Email invitations are part of the paid plans.' });
  if (limited(`email|${doc.slug}`, 10, 60 * 60_000)) return res.status(429).json({ error: 'Please wait a little before sending more emails.' });
  const ids = new Set(Array.isArray(req.body?.ids) ? req.body.ids : []);
  const reminder = !!req.body?.reminder;
  const d = doc.data as { partner1: { name: string }; partner2: { name: string }; weddingDate: string; mainVenue?: string; city?: string };
  const couple = `${d.partner1.name.split(' ')[0]} & ${d.partner2.name.split(' ')[0]}`;
  const dateText = new Date(`${d.weddingDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const base = `${req.protocol}://${req.get('host')}/invite/${doc.slug}`;
  const targets = doc.guests.filter((g) => ids.has(g.id) && g.email).slice(0, 200);
  const sent = new Set<string>();
  let failed = 0;
  for (const g of targets) {
    try {
      await sendInviteEmail({ to: g.email, guestName: g.name, couple, dateText, place: [d.mainVenue, d.city].filter(Boolean).join(', '), url: `${base}?g=${g.token}`, reminder });
      sent.add(g.id);
    } catch (err) {
      failed++;
      console.error('[email] failed', err);
    }
  }
  const t = now();
  const guests = doc.guests.map((g) =>
    !sent.has(g.id) ? g : reminder ? { ...g, remindedAt: t } : { ...g, invitedAt: g.invitedAt ?? t, invitedVia: g.invitedVia ?? ('email' as const) },
  );
  await store.patch(doc.slug, { guests });
  res.json({ ...guestPayload({ ...doc, guests }), sent: sent.size, failed });
});

// WhatsApp/iMessage previews need a real image URL; photos are stored as data URLs.
app.get('/api/weddings/:slug/cover', async (req, res) => {
  const doc = await load(req.params.slug);
  const url = String(doc?.data.coverPhotoUrl || doc?.data.couplePhotoUrl || '');
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(url);
  if (m) return res.type(m[1]).set('Cache-Control', 'public, max-age=3600').send(Buffer.from(m[2], 'base64'));
  if (url.startsWith('/')) return res.redirect(url);
  res.status(404).end();
});

/* ─────────────────────────────── payments ─────────────────────────────── */

// The client asks first: no keys → it runs the clearly labelled demo checkout instead.
app.get('/api/payments/config', (_req, res) => {
  res.json({ enabled: !!keys, keyId: keys?.keyId ?? null });
});

// Priced for this wedding: referral perks come from the server's copy of it.
app.post('/api/payments/quote', async (req, res) => {
  const { plan, coupon, slug } = req.body ?? {};
  if (!isPlanId(plan)) return res.status(400).json({ error: 'Unknown plan' });
  const doc = await load(slug);
  res.json(quote(plan, coupon, doc ? perksOf(doc) : {}));
});

app.post('/api/payments/order', async (req, res) => {
  if (!keys) return res.status(503).json({ error: 'Payments are not configured' });
  const { plan, coupon, slug } = req.body ?? {};
  if (!isPlanId(plan)) return res.status(400).json({ error: 'Unknown plan' });
  const doc = await load(slug);
  if (!doc) return res.status(400).json({ error: 'Publish your invitation before paying' });
  try {
    const q = quote(plan, coupon, perksOf(doc));
    const order = await createOrder(keys, q, doc.slug);
    await serial(`wedding:${doc.slug}`, async () => {
      const fresh = await store.get(doc.slug);
      await store.patch(doc.slug, { pendingOrders: [order.id, ...(fresh?.pendingOrders ?? [])].slice(0, 10) });
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: keys.keyId, quote: q });
  } catch (err) {
    console.error('[payments] order failed', err);
    res.status(502).json({ error: 'Could not start the payment. Please try again.' });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  if (!keys) return res.status(503).json({ error: 'Payments are not configured' });
  const { orderId, paymentId, signature } = req.body ?? {};
  if (![orderId, paymentId, signature].every((v) => typeof v === 'string' && v.length < 100)) {
    return res.status(400).json({ error: 'Malformed payment confirmation' });
  }
  if (!isValidSignature(orderId, paymentId, signature, keys.keySecret)) {
    return res.status(400).json({ verified: false, error: 'Payment signature mismatch' });
  }
  try {
    // Plan, amount and wedding come from Razorpay's copy of the order and payment, never from the request.
    const r = await settle(orderId, paymentId);
    if (!r.ok) return res.status(409).json({ verified: false, error: `${r.reason}. If money left your account, contact support with payment ID ${paymentId}.` });
    res.json({ verified: true, plan: r.plan, amountInr: r.amountInr, paymentId, invoiceId: `${SITE.receiptPrefix}-${paymentId.replace(/^pay_/, '')}` });
  } catch (err) {
    console.error('[payments] verify failed', err);
    res.status(502).json({ verified: false, error: 'Could not confirm the payment yet. It is safe: it will be applied automatically within a few minutes, or contact support with your payment ID.' });
  }
});

// Re-checks this wedding's unconfirmed orders with Razorpay. Safe without the edit key: it can only apply
// payments Razorpay says are captured. Called when the dashboard or checkout opens.
app.post('/api/payments/reconcile', async (req, res) => {
  const doc = await load(req.body?.slug);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (keys && doc.pendingOrders?.length && !limited(`reconcile|${req.ip}`, 20, 10 * 60_000)) {
    for (const id of doc.pendingOrders) await settle(id).catch((err) => console.error('[payments] reconcile failed', id, err));
  }
  const fresh = (await store.get(doc.slug))!;
  res.json({ plan: fresh.plan, paidAt: fresh.paidAt, amountInr: fresh.amountInr, paymentId: fresh.paymentId });
});

// Keyless deployments only (local dev, demos): unlocks a plan without money. Disappears once keys are set.
app.post('/api/payments/demo', async (req, res) => {
  if (keys) return res.status(403).json({ error: 'Demo checkout is disabled when real payments are configured' });
  const { plan, coupon, slug } = req.body ?? {};
  if (!isPlanId(plan)) return res.status(400).json({ error: 'Unknown plan' });
  const doc = await load(slug);
  if (!doc || !keyMatches(doc, editKey(req))) return res.status(403).json({ error: 'Publish your invitation first' });
  const q = quote(plan, coupon, perksOf(doc));
  const paymentId = `demo_${Date.now().toString(36)}`;
  await recordPurchase(doc.slug, plan, paymentId, q.totalInr, q.coupon);
  res.json({ plan, amountInr: q.totalInr, paymentId, invoiceId: `DEMO-${Date.now().toString(36).toUpperCase()}` });
});

/* ─────────────────────────────── analytics ────────────────────────────── */

// Anonymous funnel events from the app (src/utils/analytics.ts). Junk is dropped silently.
app.post('/api/events', async (req, res) => {
  const { name, sid, detail } = req.body ?? {};
  if (isFunnelEvent(name) && !SERVER_EVENTS.has(name) && typeof sid === 'string' && /^[\w-]{8,64}$/.test(sid) && !limited(`events|${req.ip}`, 300, 10 * 60_000)) {
    await trackSafe(name, sid, typeof detail === 'string' ? detail : '');
  }
  res.status(204).end();
});

/* ──────────────────────────── owner dashboard ─────────────────────────── */

// Business numbers for the owner. Off unless ADMIN_KEY (16+ chars) is set.
app.get('/api/admin/stats', async (req, res) => {
  const want = process.env.ADMIN_KEY ?? '';
  const got = req.get('x-admin-key') ?? '';
  if (want.length < 16) return res.status(404).json({ error: 'Owner dashboard is off. Set ADMIN_KEY on the server.' });
  if (limited(`admin|${req.ip}`, 30, 60_000)) return res.status(429).json({ error: 'Slow down' });
  if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return res.status(403).json({ error: 'Wrong key' });

  const rows = await store.summaries();
  const real = (r: (typeof rows)[number]) => r.paymentId && !r.paymentId.startsWith('demo');
  const since = (days: number) => Date.now() - days * 86_400_000;
  const paid = rows.filter((r) => r.plan !== 'free');
  const sum = (xs: typeof rows, f: (r: (typeof rows)[number]) => number) => xs.reduce((a, r) => a + f(r), 0);
  const referrers = new Map<string, { slug: string; referrals: number; paid: number }>();
  for (const r of rows) {
    if (!r.referredBy) continue;
    const e = referrers.get(r.referredBy) ?? { slug: r.referredBy, referrals: 0, paid: 0 };
    e.referrals++;
    if (r.plan !== 'free') e.paid++;
    referrers.set(r.referredBy, e);
  }
  const revenue = sum(rows.filter(real), (r) => r.amountInr);
  res.json({
    couples: rows.length,
    newThisWeek: rows.filter((r) => Date.parse(r.createdAt) > since(7)).length,
    paidCouples: paid.length,
    conversion: rows.length ? paid.length / rows.length : 0,
    byPlan: { free: rows.length - paid.length, digital_classic: rows.filter((r) => r.plan === 'digital_classic').length, royal_suite: rows.filter((r) => r.plan === 'royal_suite').length },
    revenueInr: revenue,
    revenue30dInr: sum(rows.filter((r) => real(r) && Date.parse(r.paidAt ?? '') > since(30)), (r) => r.amountInr),
    demoPayments: rows.filter((r) => r.paymentId?.startsWith('demo')).length,
    arpuInr: paid.length ? Math.round(revenue / paid.length) : 0,
    guestsListed: sum(rows, (r) => r.guests),
    guestsInvited: sum(rows, (r) => r.invited),
    invitesOpened: sum(rows, (r) => r.opens),
    rsvps: sum(rows, (r) => r.rsvps),
    referredCouples: rows.filter((r) => r.referredBy).length,
    topReferrers: [...referrers.values()].sort((a, b) => b.paid - a.paid || b.referrals - a.referrals).slice(0, 10),
    funnel: await store.eventCounts(),
    recent: [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25),
  });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

/* ────────────────────────────── static site ───────────────────────────── */

// Production: serve the built SPA from the same origin as the API.
const dist = path.resolve(import.meta.dirname, '../dist');
if (existsSync(dist)) {
  const indexHtml = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // Guest links get their own title/description/photo, so a WhatsApp share shows the couple, not our marketing.
  app.get('/invite/:slug', async (req, res) => {
    const doc = await load(req.params.slug);
    if (!doc) return res.status(404).type('html').send(indexHtml);
    const d = doc.data as { partner1: { name: string }; partner2: { name: string }; weddingDate: string; city?: string };
    const guest = typeof req.query.g === 'string' ? doc.guests.find((g) => g.token === req.query.g) : undefined;
    const title = esc(`${d.partner1.name} & ${d.partner2.name} · Wedding Invitation`);
    const desc = esc(`${guest ? `Dear ${guest.name}, you're invited!` : "You're invited!"} ${d.weddingDate}${d.city ? ` · ${d.city}` : ''}. Tap to view the invitation and RSVP.`);
    const image = `${req.protocol}://${req.get('host')}/api/weddings/${doc.slug}/cover`;
    const html = indexHtml
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/(<meta name="description" content=")[^"]*/, `$1${desc}`)
      .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
      .replace(/(<meta property="og:description" content=")[^"]*/, `$1${desc}`)
      .replace('</head>', `<meta property="og:image" content="${esc(image)}" />\n</head>`);
    res.type('html').send(html);
  });

  app.use(express.static(dist, { index: false }));
  app.get(/.*/, (_req, res) => res.type('html').send(indexHtml));
}

app.listen(PORT, () => {
  const db = process.env.DATABASE_URL ? 'Postgres' : `JSON file in ${process.env.DATA_DIR || 'data/'}`;
  console.log(
    `${SITE.name} API on http://localhost:${PORT} · payments: ${paymentsMode} · storage: ${db} · email: ${emailEnabled() ? 'on' : 'off'} · owner dashboard: ${(process.env.ADMIN_KEY ?? '').length >= 16 ? 'on' : 'off'}`,
  );
  keepAwake();
  if (keys && !SITE.business.email) console.warn('warning: business.email is empty in site.config.ts, so the Policies page (#/legal) has no contact email. Razorpay requires one.');
});
