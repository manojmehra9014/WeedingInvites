import { PLANS, PlanId, PlanTier } from '../data/pricing';
import { SITE } from '../../site.config';
import { api } from './api';

export type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

export interface Quote {
  plan: PlanId;
  baseInr: number;
  discountInr: number;
  totalInr: number;
  coupon: string | null;
}

export interface PaymentResult {
  plan: PlanId;
  amountInr: number;
  paymentId: string;
  invoiceId: string;
  demo: boolean;
}

/** The shopper closed Razorpay; `message` carries the last failure reason, if any. */
export class PaymentCancelled extends Error {}

export interface PaymentConfig {
  /** Razorpay keys are configured on the server: real money moves. */
  enabled: boolean;
  /** The API server answered at all (coupons need it). */
  serverUp: boolean;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const res = await fetch('/api/payments/config');
    const data = await res.json(); // a static host answers with index.html, which throws here
    return { enabled: !!data.enabled, serverUp: res.ok };
  } catch {
    return { enabled: false, serverUp: false };
  }
}

const post = <T,>(url: string, body: unknown, editKey?: string) => api<T>('POST', url, body, editKey);

/** Server-priced quote; without the server only list prices are known (no coupons). */
/** With `slug`, the server also applies that wedding's referral perks (friend discount or earned credit). */
export function getQuote(plan: PlanId, coupon: string, serverUp: boolean, slug?: string): Promise<Quote> {
  if (!serverUp) {
    const base = PLANS[plan].priceInr;
    return Promise.resolve({ plan, baseInr: base, discountInr: 0, totalInr: base, coupon: null });
  }
  return post<Quote>('/api/payments/quote', { plan, coupon, slug });
}

let razorpayScript: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  razorpayScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => {
      razorpayScript = null; // allow a retry
      reject(new Error('Could not load the secure payment window. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return razorpayScript;
}

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: 'payment.failed', cb: (r: { error?: { description?: string } }) => void): void;
    };
  }
}

/**
 * Order (server) → Razorpay Checkout (card/UPI/bank details never touch our page) → signature
 * verification (server). Resolves only once the server has verified the payment.
 */
export async function payWithRazorpay(opts: {
  plan: PlanId;
  coupon: string;
  method: PayMethod;
  customerName?: string;
  /** The published wedding this plan is for; the server attaches the plan to it after verification. */
  slug: string;
}): Promise<PaymentResult> {
  const order = await post<{ orderId: string; amount: number; currency: string; keyId: string }>('/api/payments/order', {
    plan: opts.plan,
    coupon: opts.coupon,
    slug: opts.slug,
  });
  await loadRazorpay();

  return new Promise((resolve, reject) => {
    let lastError: string | undefined;
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: SITE.name,
      description: PLANS[opts.plan].name,
      prefill: { method: opts.method, name: opts.customerName },
      theme: { color: '#B38B45' },
      handler: async (res: RazorpaySuccess) => {
        try {
          const verified = await post<Omit<PaymentResult, 'demo'>>('/api/payments/verify', {
            orderId: res.razorpay_order_id,
            paymentId: res.razorpay_payment_id,
            signature: res.razorpay_signature,
          });
          resolve({ ...verified, demo: false });
        } catch (err) {
          // Money may have moved: the server re-checks it on its own (webhook / reconcile), and support gets the ID.
          reject(new Error(`${(err as Error).message} (Payment ID: ${res.razorpay_payment_id})`));
        }
      },
      modal: { ondismiss: () => reject(new PaymentCancelled(lastError ?? '')) },
    });
    // Razorpay keeps its window open after a failure so the shopper can retry; just remember why.
    rzp.on('payment.failed', (r) => {
      lastError = r.error?.description;
    });
    rzp.open();
  });
}

/**
 * Keyless servers only (local dev, demos): an explicit, no-charge unlock that the server records. Never runs
 * without the server, so an outage (or a blocked request) can't unlock a plan in the browser.
 */
export async function payInDemoMode(quote: Quote, wedding: { slug: string; editKey: string }): Promise<PaymentResult> {
  const r = await post<Omit<PaymentResult, 'demo'>>('/api/payments/demo', { plan: quote.plan, coupon: quote.coupon, slug: wedding.slug }, wedding.editKey);
  return { ...r, demo: true };
}

/**
 * Asks the server to re-check this wedding's unconfirmed orders with Razorpay: a UPI payment approved on the
 * phone after the checkout window closed still lands. Returns the wedding's plan as the server records it.
 */
export const reconcilePayments = (slug: string) =>
  post<{ plan: PlanTier; paidAt?: string; amountInr?: number; paymentId?: string }>('/api/payments/reconcile', { slug });
