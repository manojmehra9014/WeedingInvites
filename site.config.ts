// ─────────────────────────────────────────────────────────────────────────────────────────────
//  SITE CONFIG: every business detail of the website, in one place.
//  Edit a value, then rebuild (`npm run build`, or push to redeploy). Brand name, page title,
//  footer, receipts, policy pages, Razorpay checkout, prices, plan limits and every price/limit
//  mentioned in the copy all read from here.
//
//  This file is shipped to visitors' browsers. NEVER put secrets here: Razorpay keys,
//  DATABASE_URL, ADMIN_KEY and RESEND_API_KEY stay in `.env` / your host's environment.
//  Coupon codes stay server-only in server/payments.ts.
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Brand name: navbar, footer, page title, checkout, "Made with …" credit, music credits. */
const name = 'WeddingInvites';

export const SITE = {
  name,
  /** Browser tab title and link-preview title of the main site. */
  title: `${name} - Luxury Wedding Invitation & Video Maker`,
  /** Search-engine and link-preview description. */
  description:
    'Design cinematic wedding invitation websites and animated videos in minutes. Pick a luxury template, enter your wedding details once, and let our schema-driven engine build everything automatically.',
  /** Short paragraph under the brand name in the footer. */
  footerBlurb:
    'The luxury, schema-driven wedding invitation and cinematic video maker. Design once, celebrate everywhere.',
  /** Browser UI colour on phones, and the favicon background. */
  themeColor: '#191614',

  /** Shown on receipts and the Policies page (#/legal). Razorpay checks these before going live. */
  business: {
    legalName: name, // your registered/trade name, if different from the brand, e.g. 'Sharma Digital LLP'
    email: '', // support email, e.g. 'hello@yourdomain.in' (required before Razorpay activation)
    phone: '', // e.g. '+91 98765 43210'
    address: '', // full postal address
    gstin: '', // ONLY if GST-registered: turns the receipt into a tax invoice. Leave '' otherwise.
  },
  /** Date shown as "Last updated" on the Policies page. Change it when you edit policy text. */
  policiesUpdated: '1 October 2026',
  /** Prefix of receipt numbers, e.g. WV-Nxk2… */
  receiptPrefix: 'WV',

  /** One-time prices in ₹ (charged by the server from these numbers) and what each plan unlocks. */
  plans: {
    free: { guestList: 25, visibleRsvps: 25 },
    digital_classic: { name: 'Digital Classic', priceInr: 299, guestList: 500, visibleRsvps: 150 },
    royal_suite: { name: 'Royal Cinema & Suite', priceInr: 599, guestList: 5000, visibleRsvps: Infinity }, // shown as "unlimited"
  },

  /** Referral loop: discount for a couple who arrives via a referral link, credit to the couple who referred them. */
  referral: { friendDiscountInr: 50, referrerCreditInr: 100 },
};
