import { createHmac, timingSafeEqual } from 'node:crypto';
import { isPlanId, PLANS, PlanId, PlanTier, REFERRAL_DISCOUNT_INR } from '../src/data/pricing';

// Coupons live only on the server so codes aren't shipped in the client bundle.
const COUPONS: Record<string, number> = { ROYAL50: 50, FIRST50: 50, WEDDING100: 100, JASHN100: 100 };

export interface Quote {
  plan: PlanId;
  baseInr: number;
  discountInr: number;
  totalInr: number;
  /** Applied coupon code, or FRIEND (arrived via another couple) / CREDIT (earned by referring). */
  coupon: string | null;
}

/** What the wedding itself has earned, read from the server's copy of it, never from the request. */
export interface Perks {
  referred?: boolean;
  /** Unspent referral credit in rupees. */
  creditInr?: number;
}

/** Discounts don't stack: the couple gets the single best of coupon, friend discount and referral credit. */
export function quote(plan: PlanId, rawCoupon?: unknown, perks: Perks = {}): Quote {
  const code = typeof rawCoupon === 'string' ? rawCoupon.trim().toUpperCase() : '';
  const options: [string, number][] = [
    [code, COUPONS[code] ?? 0],
    ['FRIEND', perks.referred ? REFERRAL_DISCOUNT_INR : 0],
    ['CREDIT', Math.max(0, perks.creditInr ?? 0)],
  ];
  const [label, wanted] = options.reduce((best, o) => (o[1] > best[1] ? o : best), ['', 0] as [string, number]);
  const baseInr = PLANS[plan].priceInr;
  // Razorpay's minimum charge is ₹1.
  const totalInr = Math.max(1, baseInr - wanted);
  return { plan, baseInr, discountInr: baseInr - totalInr, totalInr, coupon: wanted ? label : null };
}

/** Paying never downgrades: a Royal couple who also buys Classic stays Royal. */
export const betterPlan = (current: PlanTier, bought: PlanId): PlanTier =>
  current === 'royal_suite' || bought === 'royal_suite' ? 'royal_suite' : bought;

/** Razorpay signs `order_id|payment_id` with the key secret; anything else is a forgery. */
export function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

const auth = ({ keyId, keySecret }: RazorpayKeys) => `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

async function razorpay<T>(keys: RazorpayKeys, path: string, init?: RequestInit): Promise<T> {
  // Overridable only so the payment flow can be tested against a local fake (server/payments.flow.check.ts).
  const res = await fetch(`${process.env.RAZORPAY_API_URL || 'https://api.razorpay.com/v1'}${path}`, {
    ...init,
    headers: { Authorization: auth(keys), 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.description ?? `Razorpay ${res.status}`);
  return body as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes: Record<string, string>;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  /** created → authorized → captured (money is ours); failed / refunded otherwise. */
  status: string;
  email?: string;
}

export function createOrder(keys: RazorpayKeys, q: Quote, slug: string) {
  return razorpay<RazorpayOrder>(keys, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: q.totalInr * 100, // paise
      currency: 'INR',
      receipt: `wv_${Date.now()}`,
      // Plan and wedding ride on the order itself, so verification reads them from Razorpay, not the browser.
      notes: { plan: q.plan, coupon: q.coupon ?? '', slug },
    }),
  });
}

export function fetchOrder(keys: RazorpayKeys, orderId: string) {
  return razorpay<RazorpayOrder>(keys, `/orders/${encodeURIComponent(orderId)}`);
}

export const fetchPayment = (keys: RazorpayKeys, id: string) => razorpay<RazorpayPayment>(keys, `/payments/${encodeURIComponent(id)}`);
export const fetchOrderPayments = (keys: RazorpayKeys, orderId: string) =>
  razorpay<{ items: RazorpayPayment[] }>(keys, `/orders/${encodeURIComponent(orderId)}/payments`);
export const capturePayment = (keys: RazorpayKeys, p: RazorpayPayment) =>
  razorpay<RazorpayPayment>(keys, `/payments/${encodeURIComponent(p.id)}/capture`, { method: 'POST', body: JSON.stringify({ amount: p.amount, currency: p.currency }) });

export type PaidOrder = { ok: true; plan: PlanId; slug: string; coupon: string | null; amountInr: number; paymentId: string; email: string };

/**
 * A plan is granted only for a payment that is captured, belongs to this order, and paid all of it.
 * Plan, wedding and coupon come from the order Razorpay holds (written by our server), never the browser.
 */
export function checkPayment(order: RazorpayOrder, payment: RazorpayPayment): PaidOrder | { ok: false; reason: string } {
  if (payment.order_id !== order.id) return { ok: false, reason: 'This payment belongs to a different order' };
  if (payment.status !== 'captured') return { ok: false, reason: `Payment is ${payment.status}, not captured` };
  if (payment.currency !== 'INR' || order.currency !== 'INR') return { ok: false, reason: 'Unexpected currency' };
  if (payment.amount !== order.amount) return { ok: false, reason: 'Paid amount does not match the order' };
  const plan = order.notes?.plan;
  const slug = order.notes?.slug;
  if (!isPlanId(plan) || typeof slug !== 'string' || !/^[a-z0-9-]{1,60}$/.test(slug)) return { ok: false, reason: 'Order is missing its plan or wedding' };
  return { ok: true, plan, slug, coupon: order.notes.coupon || null, amountInr: payment.amount / 100, paymentId: payment.id, email: payment.email ?? '' };
}

/** Webhooks are signed over the exact raw body with the webhook secret (not the key secret). */
export function isValidWebhookSignature(rawBody: Buffer | string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
