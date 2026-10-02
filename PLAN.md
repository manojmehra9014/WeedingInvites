# WeddingVerse: Review & Improvement Plan

Reviewed on 2026-09-29 by reading every source file and clicking through the whole product in real Chrome (desktop 1366px and phone 390px): landing, catalog, Quick Look, onboarding, preview, wax seal, RSVP, video, dashboard, QR, checkout, invoice, and the guest link.

Status key: ✅ done and verified in the browser · ⏳ later (needs accounts, legal details, or a business decision)

**Verification:** `npm run check` (types + 5 logic suites; the store suite also passes against real Postgres via PGlite) and `npm run e2e`: **52/52 steps pass in Chrome, zero console errors** (publish → guest RSVP on a phone → guest list paste + 25-guest paywall → WhatsApp send queue → personal link opened/RSVP'd and tracked → referral friend discount + referrer credit → RSVP paywall → pay → 12 MB MP4 download → Royal guest page → owner dashboard → no horizontal overflow on any page at 390 px).

Business model and growth strategy: **BUSINESS.md**.

---

## 1. Verdict

The design, template engine, and checkout UI are strong. **But the product could not make money**, because the thing couples pay for didn't exist:

| Promise on the site | Reality before this work |
|---|---|
| "Share your invite link on WhatsApp" | `weddingverse.co/invite/<slug>` is a made-up domain. Opening an invite path shows the **marketing landing page**, not the invitation. |
| "Live RSVP tracking" | RSVPs are saved in the **guest's own browser** `localStorage`. The couple never sees them. |
| "Paid plan unlocks features" | Paying changed a label and nothing else. Every feature was free. Nothing was checked server-side. |
| "Export 1080p MP4" | A fake progress bar followed by `alert('Download initiated!')`. No file. |
| "Printable QR code" | A hand-drawn decorative SVG. It does not scan. |
| "Upload your photos" | Step 4 of onboarding had **no upload**; every couple got the sample couple's photos. |
| "Tax invoice" | Showed an invented company and an invented GSTIN (`08AAACW2026R1ZM`) and always printed ₹599/₹299, even when a coupon was used. Issuing a fake GST invoice is illegal. |
| "Loved by 12,000+ couples" + 5-star testimonials | Fabricated. Fake reviews are a violation of India's CCPA guidelines on dark patterns and fake reviews, and they are the fastest way to lose trust. |
| "AI Love Story Writer", "Priority GPU rendering", "WhatsApp concierge", "licensed tracks by Pandit Ravi…" | None of these exist. The "AI" suggestion was a random pick from 4 strings, and the five "tracks" were one identical synth drone. |

Selling features that don't exist brings chargebacks, Razorpay account holds, and refunds. A money machine has to be **real first**, then optimised.

---

## 2. Findings, ranked (review of each flow)

### P0: blocks revenue
| # | Area | Finding | Status |
|---|---|---|---|
| 1 | Sharing | No real guest page; invite links point to a non-existent domain | ✅ `/invite/<slug>` served by our server, with WhatsApp preview tags (couple names + photo) |
| 2 | RSVP | Guest RSVPs never reach the couple | ✅ Stored server-side; dashboard reads them live |
| 3 | Monetization | Plans unlock nothing; plan lives only in the browser | ✅ Server records the plan from the verified Razorpay order; RSVP visibility, branding, and video export are gated by plan |
| 4 | Video | Export is fake | ✅ Real in-browser render (canvas + MediaRecorder) at 1080p with music; ~12 MB MP4 for 25 s (under WhatsApp's 16 MB limit); WebM fallback on browsers without MP4 recording |
| 5 | Onboarding | Can't upload own photos | ✅ Couple portrait, cover, and gallery upload (auto-resized) |
| 6 | Trust/legal | Fake GSTIN invoice, fake testimonials, fake features | ✅ Honest receipt (GST only if you configure a GSTIN), fabricated claims removed |

### P1: broken functionality
| # | Area | Finding | Status |
|---|---|---|---|
| 7 | Dashboard | A declined RSVP shows as "Attending · 0 guests · Vegetarian" | ✅ |
| 8 | Dashboard | QR code is fake | ✅ Real, scannable QR of the live link (`qrcode-generator`) |
| 9 | Dashboard | "Live & Active" is shown even when nothing is published | ✅ Shows real publish state |
| 10 | Dashboard | CSV: unescaped quotes in names, `#` truncates the data URI, and guest input like `=HYPERLINK(...)` executes in Excel | ✅ Blob + proper escaping + formula guard |
| 11 | Dashboard | Meal filter missing "Vegan" | ✅ |
| 12 | Video | Scene text hardcodes "Udaipur, Rajasthan" and "Lake Pichola" for every couple; raw `2026-12-14` / `19:30` dates | ✅ |
| 13 | Video | Picking a soundtrack changes nothing audible | ✅ Each track has its own key and tempo |
| 14 | Onboarding | Wedding time is a free-text box; "19:00 (Evening)" breaks the countdown | ✅ `type="time"` |
| 15 | Onboarding | Editing an event mutates app state in place (shared objects) | ✅ |
| 16 | Onboarding | Main venue address, event address/description/end time not editable; new events default to an Udaipur address | ✅ |
| 17 | Onboarding | `<button>` nested in `<button>` (template card containing the hero's buttons): React DOM error | ✅ |
| 18 | Invoice | Amount ignores coupons; date is "today", not the payment date | ✅ |
| 19 | Mobile | Studio toolbars overflow the phone screen (53px on preview, 84px on video) | ✅ |
| 20 | Misc | `/favicon.ico` 404 on every page | ✅ |
| 20b | Privacy | The sample couple's hashtag, parents' names, love story and Udaipur venues carried over onto new couples' live invitations (found during the browser run) | ✅ Cleared once the couple enters their own names/venue |

### P2: conversion & growth ("money printing")
| # | Idea | Why it prints money | Status |
|---|---|---|---|
| 21 | **Free plan can publish**, with "Made with WeddingVerse" on the guest site | Every wedding reaches 200–500 guests and some are future couples. That is a zero-cost acquisition loop. | ✅ |
| 22 | **RSVP paywall**: free shows the first 25 responses, Classic 150, Royal unlimited; responses are never lost | The couple pays at the moment of highest intent ("34 more guests replied") | ✅ |
| 23 | Video export is Royal-only; preview is free | The ₹599 plan finally has a tangible deliverable | ✅ |
| 24 | Personalised guest links (`?guest=Sharma Family`) and WhatsApp share | Already existed; now they actually open the invitation | ✅ |
| 25 | WhatsApp link preview (OG tags with couple names + photo) | Links with rich previews get tapped far more than bare URLs | ✅ |
| 26 | Compress the 13 MB of images (≈1 MB each) | Guests open on mobile data; slow pages mean no RSVPs | ✅ 13 MB → 3.2 MB (originals kept in `src/assets/images-original/`, not bundled; delete when happy). Guest page loads a separate, smaller JS bundle. |
| 27 | Launch-offer coupon banner / urgency tied to the wedding date ("RSVPs close in 30 days") | Loss aversion | ⏳ |
| 28 | Add-ons: extra ₹199 "Save the Date" video, ₹99 per extra event microsite, printed QR cards via partner | Raises average order value | ⏳ |
| 29 | Referral: friend gets ₹50 off, referrer earns ₹100 credit per paid referral (spent at their checkout) | Word of mouth is how Indian weddings spread | ✅ no accounts needed; credit instead of cash payouts |
| 30 | Vendor B2B plan (planners, venues) at ₹2,999/month for unlimited couples | One planner means 30+ weddings a year | ⏳ |
| 31 | Analytics (Plausible / Umami, free self-host) on the funnel: landing → onboarding → publish → pay | You can't optimise what you don't measure | 🟡 Owner dashboard (`#/admin`) covers couples, conversion, revenue, invites, open rate, referrals; page-level analytics still ⏳ |
| 40 | **Guest list + send to everyone**: personal tracked links, one-tap WhatsApp queue, reminders to non-repliers, email invites (paid), paste/contacts import | Turns "share a link" into "manage 400 guests", which is what couples pay for | ✅ |
| 41 | Guest-list paywall (25 free / 500 Classic / unlimited Royal) | Upsell exactly when the real list is pasted | ✅ |
| 42 | "Make your own" CTA on the guest's RSVP thank-you (free plan) | Converts guests at peak attention | ✅ |

### P3: platform / later
| # | Item | Status |
|---|---|---|
| 32 | Real accounts (email OTP / Google) so a couple can edit from another device. Today the **edit key lives in the browser** that published. | ⏳ |
| 33 | Razorpay `payment.captured` webhook (covers a browser that closes mid-payment) | ⏳ |
| 34 | Photos in object storage (Cloudflare R2 free 10 GB) instead of inside the wedding JSON | ⏳ once > ~300 weddings on Neon free |
| 35 | Hindi/regional language copy on guest pages | ⏳ |
| 36 | Unused `@google/genai` dependency, AI Studio README | ✅ README replaced; dep left (unused, not bundled) |
| 37 | **Legal pages Razorpay requires before live activation**: Contact, Terms, Privacy, Refund, Delivery | ✅ Built at `#/legal` from what the code does. No-refund policy (free plan is the trial) except duplicate/unlocked-failed charges. Fill `business` in `site.config.ts` before applying (HOST.md) |
| 38 | Love-story and gallery captions editor in onboarding (story is cleared for new couples, so the section hides) | ✅ story (gallery captions ⏳) |
| 39 | Guest-page music uses the soundtrack chosen in the video studio | ⏳ |
| 43 | **Shareable images**: Save the Date, Invitation and one card per event as Instagram story/post, WhatsApp status and square PNGs, in the template's style; free = Save the Date at half size with credit, paid = all at 1080px | ✅ |
| 44 | Funnel analytics (anonymous events → owner funnel at `#/admin`) | ✅ (replaces the "page-level analytics" part of #31) |
| 45 | "Suggest a blessing" presented fixed text as generated and could name Udaipur for any couple | ✅ "Show a blessing example", only uses the couple's own city |
| 46 | Love-story editor in onboarding (#38) and one-tap event presets across traditions | ✅ |

---

## 3. What was built (architecture of the fix)

```
Couple's browser                         Server (server/index.ts)                  Guest's phone
─────────────────                        ────────────────────────                  ─────────────
Onboarding → localStorage
Publish / auto-sync ── PUT /api/weddings/:slug  (edit key) ──► store (JSON file or Postgres)
Dashboard ─────────── GET /api/weddings/:slug/rsvps (edit key) ◄─┐
                                                                 │
Checkout → Razorpay → /api/payments/verify ──► plan saved on the wedding
                                                                 │
                                   GET /invite/:slug  ──► index.html + OG tags ──► GuestInvite
                                   GET /api/weddings/:slug (public, no RSVPs) ◄─── renders InvitationSite
                                   POST /api/weddings/:slug/rsvp ◄──────────────── RSVP form (rate-limited)
```

- **Store:** `server/store.ts`. It uses `DATABASE_URL` (Postgres, e.g. Neon free) when set, otherwise a JSON file in `DATA_DIR`. One document per wedding.
- **Edit key:** random 32 bytes, returned once at first publish, stored hashed (SHA-256). It is required to update the wedding or read RSVPs.
- **Plan:** set only by `/api/payments/verify` (real Razorpay) or `/api/payments/demo`, which exists **only when no Razorpay keys are configured**.

## 4. What to do next, in order

1. **Host it**: push the project to a GitHub repo (it isn't one yet), follow HOST.md recipe A (~15 min), then run `npm run e2e -- https://your-app` once while still in demo mode.
2. **Razorpay activation**: fill `business` contact details in `site.config.ts`, apply with the `#/legal` pages (#37; no-refund policy), then test keys → live keys.
3. **Analytics** (#31) so you know where couples drop off.
4. **Accounts** (#32) + **webhook** (#33): needed before couples edit from a second device, and to recover payments when a browser closes mid-checkout.
5. Growth levers #27, #28, #30, in order of effort: urgency banner → add-ons → planner plan (referral #29 is done).

## 5. Checks

```bash
npm run lint
npx tsx src/utils/design.check.ts
npx tsx src/data/templatesCatalog.check.ts
npx tsx server/payments.check.ts
npx tsx server/weddings.check.ts      # new: publish/RSVP/plan-gating round trip
```
