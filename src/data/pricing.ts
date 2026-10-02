// Plan prices and entitlements, shared by the UI and the payment server. The numbers live in
// site.config.ts; the server charges from them and never trusts an amount a browser sends.
import { SITE } from '../../site.config';

export type PlanId = 'digital_classic' | 'royal_suite';
export type PlanTier = 'free' | PlanId;

export const PLANS: Record<PlanId, { name: string; priceInr: number }> = {
  digital_classic: { name: SITE.plans.digital_classic.name, priceInr: SITE.plans.digital_classic.priceInr },
  royal_suite: { name: SITE.plans.royal_suite.name, priceInr: SITE.plans.royal_suite.priceInr },
};

export const isPlanId = (v: unknown): v is PlanId => typeof v === 'string' && v in PLANS;

/**
 * What each tier unlocks. Guests' RSVPs are always accepted and stored; the plan only decides how many
 * the couple can see, so upgrading reveals responses that already arrived.
 */
export const ENTITLEMENTS: Record<
  PlanTier,
  {
    visibleRsvps: number;
    branding: boolean;
    videoExport: boolean;
    guestList: number;
    emailInvites: boolean;
    /** Every share image at full size without branding. Free: preview all, download the Save the Date at half size with the credit. */
    shareImages: boolean;
  }
> = {
  free: { ...SITE.plans.free, branding: true, videoExport: false, emailInvites: false, shareImages: false },
  digital_classic: { visibleRsvps: SITE.plans.digital_classic.visibleRsvps, guestList: SITE.plans.digital_classic.guestList, branding: false, videoExport: false, emailInvites: true, shareImages: true },
  royal_suite: { visibleRsvps: SITE.plans.royal_suite.visibleRsvps, guestList: SITE.plans.royal_suite.guestList, branding: false, videoExport: true, emailInvites: true, shareImages: true },
};

export const entitlements = (plan: PlanTier | undefined) => ENTITLEMENTS[plan ?? 'free'] ?? ENTITLEMENTS.free;

/** Referral loop: a couple who arrives through another couple's invitation saves this much… */
export const REFERRAL_DISCOUNT_INR = SITE.referral.friendDiscountInr;
/** …and the couple who referred them earns this much credit per referral that pays. */
export const REFERRER_CREDIT_INR = SITE.referral.referrerCreditInr;

/** "₹299", for copy. */
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export const CLASSIC = PLANS.digital_classic;
export const ROYAL = PLANS.royal_suite;
/** A limit as copy: "500", or "unlimited" for Infinity. */
export const limit = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-IN') : 'unlimited');
