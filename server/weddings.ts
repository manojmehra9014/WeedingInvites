import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { entitlements, PlanTier } from '../src/data/pricing';
import type { Guest, Store, WeddingDoc } from './store';

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

/** The original key, or one issued when the couple signed in on another device. */
export function keyMatches(doc: WeddingDoc, key: unknown): boolean {
  if (typeof key !== 'string' || !key) return false;
  const a = Buffer.from(hashKey(key));
  return [doc.editKeyHash, ...(doc.extraKeyHashes ?? [])].some((h) => {
    const b = Buffer.from(h);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** A fresh edit key for a signed-in device; keeps the last 10 so old phones eventually stop working. */
export function issueKey(doc: WeddingDoc) {
  const key = randomBytes(24).toString('base64url');
  return { key, extraKeyHashes: [...(doc.extraKeyHashes ?? []), hashKey(key)].slice(-10) };
}

/** Lower-cased email, or '' when it isn't one. */
export const cleanEmail = (v: unknown) => {
  const e = typeof v === 'string' ? v.trim().toLowerCase().slice(0, 120) : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
};

export const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'our-wedding';

export const isSlug = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9-]{1,60}$/.test(s);

/** First free slug: `priya-and-arjun`, then `priya-and-arjun-2`, … */
export async function freeSlug(store: Store, wanted: string): Promise<string> {
  const base = slugify(wanted);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await store.get(slug))) return slug;
  }
}

// Billing/RSVP fields are server-owned; a couple can't grant themselves a plan by editing their data.
const SERVER_OWNED = ['rsvps', 'plan', 'invoiceId', 'paidAt', 'amountPaidInr', 'editKey', 'published', 'guests', 'referredBy'];
export function cleanData(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = { ...(raw as Record<string, unknown>) };
  const p1 = data.partner1 as { name?: unknown } | undefined;
  const p2 = data.partner2 as { name?: unknown } | undefined;
  if (typeof p1?.name !== 'string' || typeof p2?.name !== 'string' || typeof data.weddingDate !== 'string') return null;
  for (const k of SERVER_OWNED) delete data[k];
  return data;
}

export function newWedding(slug: string, data: Record<string, unknown>) {
  const editKey = randomBytes(24).toString('base64url');
  const now = new Date().toISOString();
  const doc: WeddingDoc = { slug, editKeyHash: hashKey(editKey), plan: 'free', data, rsvps: [], guests: [], opens: [], createdAt: now, updatedAt: now };
  return { doc, editKey };
}

const guestByToken = (doc: WeddingDoc, token: unknown) => (typeof token === 'string' && token ? doc.guests.find((g) => g.token === token) : undefined);

/** The events a guest is invited to; a stale selection (events since deleted) falls back to all of them. */
function invitedEvents(doc: WeddingDoc, guest?: Guest) {
  const all = Array.isArray(doc.data.events) ? (doc.data.events as { id: string }[]) : [];
  if (!guest?.events?.length) return all;
  const mine = all.filter((e) => guest.events!.includes(e.id));
  return mine.length ? mine : all;
}

/**
 * What guests may see: the invitation, never the RSVPs, the key, or anyone else on the guest list.
 * A personal link (`token`) also gets that guest's greeting, seats, events and their own latest reply.
 */
export const publicView = (doc: WeddingDoc, token?: unknown) => {
  const guest = guestByToken(doc, token);
  if (!guest) return { slug: doc.slug, plan: doc.plan, data: doc.data, guestName: null, guest: null };
  const reply = doc.rsvps.find((r) => r.guestToken === guest.token); // newest first
  return {
    slug: doc.slug,
    plan: doc.plan,
    data: { ...doc.data, events: invitedEvents(doc, guest) }, // events they're not invited to never reach their browser
    guestName: guest.name,
    guest: {
      name: guest.name,
      seats: guest.seats,
      note: guest.note,
      hasPhone: !!guest.phone, // whether to ask for it, never the number itself
      reply: reply && { attending: reply.attending, guestsCount: reply.guestsCount, eventsAttending: reply.eventsAttending, mealPreference: reply.mealPreference },
    },
  };
};

/**
 * A reply through a personal link: phone and name come from the guest list when left blank, and the
 * party size and events are held to what the couple reserved. Returns null when the reply is unusable.
 */
export function cleanGuestRsvp(doc: WeddingDoc, raw: Record<string, unknown>) {
  const guest = guestByToken(doc, raw.guestToken);
  const rsvp = cleanRsvp(guest ? { ...raw, guestName: raw.guestName || guest.name, phone: raw.phone || guest.phone } : raw);
  if (!rsvp || !guest) return rsvp;
  if (guest.seats) rsvp.guestsCount = Math.min(rsvp.guestsCount as number, guest.seats);
  const allowed = new Set(invitedEvents(doc, guest).map((e) => e.id));
  rsvp.eventsAttending = (rsvp.eventsAttending as string[]).filter((id) => allowed.has(id));
  return rsvp;
}

/** RSVPs the couple's plan lets them see, plus how many more are waiting behind an upgrade. */
export function visibleRsvps(doc: WeddingDoc) {
  const limit = entitlements(doc.plan).visibleRsvps;
  // Oldest first get the free slots, so responses don't disappear as new ones arrive.
  const byAge = [...doc.rsvps].reverse();
  const shown = byAge.slice(0, limit).reverse();
  return { plan: doc.plan as PlanTier, rsvps: shown, hiddenCount: doc.rsvps.length - shown.length, total: doc.rsvps.length };
}

const MEALS = ['vegetarian', 'non_vegetarian', 'jain', 'vegan', 'any'];
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Guest input is untrusted: whitelist fields, cap lengths, clamp numbers. */
export function cleanRsvp(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const guestName = str(r.guestName, 120);
  const phone = str(r.phone, 30);
  if (!guestName || !phone) return null;
  const attending = r.attending === true;
  return {
    id: `rsvp-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`,
    guestName,
    phone,
    email: str(r.email, 120),
    attending,
    guestsCount: attending ? Math.min(20, Math.max(1, Math.floor(Number(r.guestsCount)) || 1)) : 0,
    eventsAttending: attending && Array.isArray(r.eventsAttending) ? r.eventsAttending.filter((e) => typeof e === 'string').slice(0, 20).map((e) => e.slice(0, 60)) : [],
    mealPreference: MEALS.includes(r.mealPreference as string) ? r.mealPreference : 'any',
    dietaryRestrictions: str(r.dietaryRestrictions, 300),
    message: str(r.message, 1000),
    // Personal links carry the guest's token, which ties this reply to their row on the guest list.
    guestToken: typeof r.guestToken === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(r.guestToken) ? r.guestToken : undefined,
    submittedAt: new Date().toISOString(),
  };
}

/**
 * Indian numbers typed any way ("098765 43210", "+91-98765-43210") → "919876543210", the form wa.me wants.
 * Other countries must be entered with their code.
 */
export function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

/**
 * The couple sends their whole list; we keep tokens (and send history) for guests we already know by id,
 * mint tokens for new ones, and drop anything malformed. Order is preserved.
 */
export function cleanGuests(raw: unknown, existing: Guest[]): Guest[] {
  if (!Array.isArray(raw)) return [];
  const known = new Map(existing.map((g) => [g.id, g]));
  const out: Guest[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const name = str(r.name, 80);
    if (!name) continue;
    const old = typeof r.id === 'string' ? known.get(r.id) : undefined;
    const id = old?.id ?? `g-${randomBytes(6).toString('hex')}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const email = str(r.email, 120);
    const seats = Math.floor(Number(r.seats));
    const events = Array.isArray(r.events) ? r.events.filter((e): e is string => typeof e === 'string').slice(0, 30).map((e) => e.slice(0, 60)) : [];
    out.push({
      ...old,
      id,
      token: old?.token ?? randomBytes(9).toString('base64url'),
      name,
      phone: normalizePhone(r.phone),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
      // Explicit undefined clears a setting the couple removed (the spread above would keep it).
      seats: seats >= 1 && seats <= 20 ? seats : undefined,
      events: events.length ? events : undefined,
      note: str(r.note, 200) || undefined,
    });
  }
  return out;
}

export type GuestStatus = 'not_sent' | 'sent' | 'opened' | 'accepted' | 'declined';

/** Each guest with where they are in the funnel: not sent → sent → opened → replied. */
export function guestStatuses(doc: WeddingDoc) {
  const opened = new Map<string, string>();
  for (const o of doc.opens) opened.set(o.token, o.at); // list is newest-first, so this ends on the first open
  const replies = new Map<string, Record<string, unknown>>();
  for (const r of [...doc.rsvps].reverse()) if (typeof r.guestToken === 'string') replies.set(r.guestToken, r); // latest reply wins
  return doc.guests.map((g) => {
    const reply = replies.get(g.token);
    const status: GuestStatus = reply ? (reply.attending ? 'accepted' : 'declined') : opened.has(g.token) ? 'opened' : g.invitedAt ? 'sent' : 'not_sent';
    return { ...g, status, openedAt: opened.get(g.token), partySize: reply ? Number(reply.guestsCount) || 0 : undefined };
  });
}
