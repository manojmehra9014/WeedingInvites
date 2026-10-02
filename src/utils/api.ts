import type { PlanTier } from '../data/pricing';
import { SITE } from '../../site.config';
import type { GuestPersonalization, GuestRSVP, WeddingData } from '../types/wedding';

/** JSON fetch that turns any non-2xx (or a static host's HTML answer) into an Error with a readable message. */
export async function api<T>(method: string, url: string, body?: unknown, editKey?: string): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(editKey ? { 'X-Edit-Key': editKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data === null) throw new Error(data?.error || `The ${SITE.name} server is unavailable. Please try again.`);
  return data as T;
}

export const inviteUrl = (slug: string, guest?: string) =>
  `${window.location.origin}/invite/${slug}${guest?.trim() ? `?guest=${encodeURIComponent(guest.trim())}` : ''}`;

/** The slug in /invite/<slug>, when a guest opened a shared link. */
export const guestSlugFromPath = () => /^\/invite\/([a-z0-9-]+)\/?$/.exec(window.location.pathname)?.[1] ?? null;

// Billing and RSVPs are server-owned; never ship them (or the key) as invitation content.
const publishable = ({ rsvps: _r, editKey: _k, plan: _p, invoiceId: _i, paidAt: _a, amountPaidInr: _m, ...rest }: WeddingData) => rest;

/** Remember who sent this visitor (`?ref=<slug>` from a guest page or a couple's referral link) until they publish. */
const REF_KEY = 'wv_ref';
export function captureReferral() {
  const ref = new URLSearchParams(window.location.search).get('ref');
  try {
    if (ref && /^[a-z0-9-]{1,60}$/.test(ref)) localStorage.setItem(REF_KEY, ref);
  } catch {
    // Private mode: no referral credit, nothing else breaks.
  }
}
const storedReferral = () => {
  try {
    return localStorage.getItem(REF_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

export const referralUrl = (slug: string) => `${window.location.origin}/?ref=${slug}`;

export function publishWedding(data: WeddingData) {
  return data.editKey
    ? api<{ slug: string; plan: PlanTier }>('PUT', `/api/weddings/${data.customSlug}`, { data: publishable(data) }, data.editKey)
    : api<{ slug: string; plan: PlanTier; editKey: string }>('POST', '/api/weddings', { data: publishable(data), ref: storedReferral() });
}

export interface PublicWedding {
  slug: string;
  plan: PlanTier;
  data: WeddingData;
  /** Set when opened through a guest's personal link. */
  guestName: string | null;
  guest: GuestPersonalization | null;
}
export const fetchPublicWedding = (slug: string, token?: string | null) =>
  api<PublicWedding>('GET', `/api/weddings/${slug}${token ? `?g=${encodeURIComponent(token)}` : ''}`);

/** Fire-and-forget: tells the couple this guest opened their personal link. */
export const markSeen = (slug: string, token: string) =>
  fetch(`/api/weddings/${slug}/seen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ g: token }), keepalive: true }).catch(() => {});

export type NewRSVP = Omit<GuestRSVP, 'id' | 'submittedAt'> & { guestToken?: string };
export const sendRsvp = (slug: string, rsvp: NewRSVP) => api<{ ok: true }>('POST', `/api/weddings/${slug}/rsvp`, rsvp);

export interface RsvpPage {
  plan: PlanTier;
  rsvps: GuestRSVP[];
  hiddenCount: number;
  total: number;
  amountInr?: number;
  paidAt?: string;
  referrals: number;
  paidReferrals: number;
  creditInr: number;
  referred: boolean;
  /** The couple's account email, if linked; signing in with it restores edit access on any device. */
  ownerEmail: string | null;
}
export const fetchRsvps = (slug: string, editKey: string) => api<RsvpPage>('GET', `/api/weddings/${slug}/rsvps`, undefined, editKey);
export const removeRsvp = (slug: string, editKey: string, id: string) =>
  api('DELETE', `/api/weddings/${slug}/rsvps/${encodeURIComponent(id)}`, undefined, editKey);

/* ─────────────────────────────── accounts ─────────────────────────────── */

export const fetchAppConfig = () => api<{ payments: boolean; email: boolean; accounts: boolean }>('GET', '/api/config');
export const setOwnerEmail = (slug: string, key: string, email: string) => api<{ ownerEmail: string }>('PUT', `/api/weddings/${slug}/owner`, { email }, key);
/** Always answers the same; a code arrives only if the email has a wedding. `devCode` exists only on test servers. */
export const requestLoginCode = (email: string) => api<{ sent: true; devCode?: string }>('POST', '/api/auth/code', { email });
export interface SignedInWedding {
  slug: string;
  names: string;
  weddingDate: string;
  plan: PlanTier;
  /** A key issued for this device. */
  editKey: string;
}
export const verifyLoginCode = (email: string, code: string) => api<{ email: string; weddings: SignedInWedding[] }>('POST', '/api/auth/verify', { email, code });
export const fetchOwnWedding = (slug: string, key: string) =>
  api<{ slug: string; plan: PlanTier; data: WeddingData; paidAt?: string; amountInr?: number; ownerEmail: string | null }>('GET', `/api/weddings/${slug}/own`, undefined, key);

/* ────────────────────────────── guest list ────────────────────────────── */

export type GuestStatus = 'not_sent' | 'sent' | 'opened' | 'accepted' | 'declined';
export interface Guest {
  id: string;
  token: string;
  name: string;
  phone: string;
  email: string;
  invitedAt?: string;
  invitedVia?: 'whatsapp' | 'email' | 'link';
  remindedAt?: string;
  seats?: number;
  events?: string[];
  note?: string;
  status: GuestStatus;
  openedAt?: string;
  partySize?: number;
}
export interface GuestPage {
  guests: Guest[];
  limit: number;
  plan: PlanTier;
  /** Email invites available to this couple right now. */
  email: boolean;
  /** Server can send email at all (else the upsell would be a lie). */
  emailConfigured: boolean;
  sent?: number;
  failed?: number;
}
export type GuestDraft = { id?: string; name: string; phone: string; email: string; seats?: number; events?: string[]; note?: string };

const guestsUrl = (slug: string) => `/api/weddings/${slug}/guests`;
export const fetchGuests = (slug: string, key: string) => api<GuestPage>('GET', guestsUrl(slug), undefined, key);
export const saveGuests = (slug: string, key: string, guests: GuestDraft[]) => api<GuestPage>('PUT', guestsUrl(slug), { guests }, key);
export const markGuestsSent = (slug: string, key: string, ids: string[], via: 'whatsapp' | 'link', reminder = false) =>
  api<GuestPage>('POST', `${guestsUrl(slug)}/sent`, { ids, via, reminder }, key);
export const emailGuests = (slug: string, key: string, ids: string[], reminder = false) =>
  api<GuestPage>('POST', `${guestsUrl(slug)}/email`, { ids, reminder }, key);

/** A guest's private link: opens personalised and tracks opened/replied. */
export const guestLink = (slug: string, token: string) => `${window.location.origin}/invite/${slug}?g=${token}`;

/* ──────────────────────────── owner dashboard ─────────────────────────── */

export interface AdminStats {
  couples: number;
  newThisWeek: number;
  paidCouples: number;
  conversion: number;
  byPlan: Record<PlanTier, number>;
  revenueInr: number;
  revenue30dInr: number;
  demoPayments: number;
  arpuInr: number;
  guestsListed: number;
  guestsInvited: number;
  invitesOpened: number;
  rsvps: number;
  referredCouples: number;
  topReferrers: { slug: string; referrals: number; paid: number }[];
  /** Funnel events: distinct browsers (or weddings, for server-side steps), total count, top details. */
  funnel: { name: string; people: number; total: number; top: { detail: string; n: number }[] }[];
  recent: { slug: string; names: string; weddingDate: string; plan: PlanTier; amountInr: number; paymentId?: string; createdAt: string; referredBy?: string; rsvps: number; guests: number; invited: number; opens: number }[];
}
export async function fetchAdminStats(adminKey: string) {
  const res = await fetch('/api/admin/stats', { headers: { 'X-Admin-Key': adminKey } });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error || 'Server unavailable');
  return data as AdminStats;
}
