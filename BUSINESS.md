# WeddingVerse: how it makes money and grows

Written from the owner's seat. Everything under "Built" is live in the code and covered by `npm run e2e`. Everything under "Next" is a recommendation.

---

## 1. The one insight

**Every wedding is a distribution channel.** A couple sends their invitation to 200–500 people. Many of those guests (cousins, friends, colleagues) will marry in the next 1–3 years. If every invitation quietly says *"Made with WeddingVerse"*, each free couple advertises us to hundreds of future customers for ₹0.

So the strategy is:
1. **Make the free tier genuinely useful**, so as many weddings as possible go out through us (reach).
2. **Charge at the exact moment the couple's need peaks**: when replies start pouring in and they're managing hundreds of guests (revenue).
3. **Reward couples who bring couples** (compounding).

---

## 2. How a link travels (the lifecycle)

```
Couple builds invite ─► Publishes (free) ─► gets weddingverse/invite/priya-and-arjun
                                               │
                 ┌─────────────────────────────┴─────────────────────────────┐
                 ▼                                                           ▼
   A. One public link                                   B. Personal links (guest list)
   pasted in family WhatsApp groups                     /invite/priya-and-arjun?g=<private token>
   anyone can open & RSVP                               "Prepared with love for the Sharma Family"
                                                        tracked: sent → opened → replied
                 │                                                           │
                 └───────────────► Guest opens (rich WhatsApp preview) ◄─────┘
                                   RSVPs (name prefilled on personal links)
                                              │
                    free invites: "Planning a celebration of your own?  ₹50 off" ──► new couple (?ref=)
                                              │
                         Couple's dashboard: replies arrive, guest funnel fills
                                              │
             26th reply / 26th guest / video download / remove branding ──► UPGRADE (₹299 / ₹599)
```

**Sending to everyone** (Dashboard → *Guest list & sending*):
- **Add guests:** paste from Excel/Google Sheets/any list, or pick from phone contacts (Android Chrome). 10-digit Indian numbers get +91 automatically.
- **Send invitations:** a one-tap queue. WhatsApp opens with *that guest's* personal message and private link; tap send, come back, and the next guest is ready. It works on any phone, needs no WhatsApp Business API, and costs nothing per message.
- **Remind non-repliers:** the same queue, only for guests who were sent the invite but haven't replied.
- **Email (paid plans):** invitations and reminders to everyone with an address in one click (via Resend, free up to 3,000/month).
- **Status per guest:** Not sent → Sent → Opened → Coming (party size) / Declined.

Why not auto-send WhatsApp in bulk? The official WhatsApp Business API needs Meta verification, pre-approved templates, and ~₹0.10–₹0.90 per conversation. Unofficial bulk senders get numbers banned. The one-tap queue is free and safe, and it keeps the message coming *from the couple's own number*, which guests trust. Add the Business API later as a paid add-on (section 5).

---

## 3. Tiers (built)

| | **Free** | **Digital Classic ₹299** | **Royal Cinema & Suite ₹599** |
|---|---|---|---|
| Purpose | Reach: get every wedding onto the platform | The practical upgrade for most couples | The emotional upgrade |
| Live invitation + public link, all 1,937 designs | ✅ | ✅ | ✅ |
| Guest list with personal tracked links | 25 guests | 500 guests | unlimited |
| WhatsApp one-tap send + reminders | ✅ | ✅ | ✅ |
| Email invitations & reminders | – | ✅ | ✅ |
| RSVPs visible (all are always saved) | first 25 | first 150 | unlimited |
| "Made with WeddingVerse" + "make your own" CTA on the guest page | shown | removed | removed |
| Wax-seal envelope for guests | – | – | ✅ |
| Download the 1080p video | preview | preview | ✅ |

**Where the paywalls sit, and why:**
- **Guest list at 25.** Enough to *feel* the magic of seeing who opened, far too few for an Indian wedding. The upsell appears the moment they paste their real list.
- **Visible RSVPs at 25.** Replies are never lost. The dashboard says *"7 more guests have replied, unlock all replies"*. That is loss aversion at peak intent.
- **Branding.** Free couples pay us in reach; paying couples get a clean invitation.
- **No refunds.** The free plan is the trial: couples see the full design, publish, preview the video and collect 25 RSVPs before paying. Paid plans unlock instantly and are final, except for duplicate charges or a plan that failed to unlock (see `/#/legal/refund`).
- **Video.** Tangible, shareable on Status/Reels, and it justifies ₹599.

Prices and limits live in one file: `src/data/pricing.ts`. Change them there; the server enforces them.

---

## 4. Growth loops (built)

| Loop | Mechanism | Where |
|---|---|---|
| **Guest → couple** | Free invitations show *"Made with WeddingVerse · Create yours free"* in the footer, and *"Planning a celebration of your own? ₹50 off"* right after a guest RSVPs (the highest-attention moment). Both links carry `?ref=<couple>`. | `GuestInvite.tsx`, `InvitationSite.tsx` |
| **Couple → couple** | Dashboard referral card: *"Know another couple getting married?"* Friend gets ₹50 off; the referrer earns ₹100 credit per friend who pays, spent automatically at their own checkout. Discounts never stack; the server picks the best one. | `UserDashboard.tsx`, `server/payments.ts` (`quote`) |
| **WhatsApp preview** | Every link shows the couple's names and photo (and "Dear Sharma Family" on personal links) in the chat preview, so it gets tapped more. | `server/index.ts` `/invite/:slug` |
| **Coupons** | `ROYAL50`, `FIRST50`, `WEDDING100`, `JASHN100`, server-only. Use them in influencer/wedding-planner campaigns to measure each channel. | `server/payments.ts` |

**Owner dashboard** (`/#/admin`, set `ADMIN_KEY`): couples, new this week, paying couples and conversion %, revenue (real payments only) and last 30 days, average order, Classic/Royal split, guests invited, personal-link open rate, RSVPs, couples from referrals, top referrers, and the latest couples. Check it weekly. The three numbers that matter are **publish → pay conversion**, **referred couples %**, and **open rate** (a low open rate means the WhatsApp message needs work).

---

## 5. What to do next (not built), in order of money per effort

1. **Go live on Razorpay.** The policy pages are built (`/#/legal`); set your contact details and apply (HOST.md). Nothing below matters until real payments work.
2. **Launch price test.** Run Classic at ₹299 vs ₹399 for two weeks each; wedding spend is high and ₹299 may be leaving money on the table. Watch conversion in the owner dashboard.
3. **Deadline nudges.** "Your wedding is in 30 days and 41 guests haven't replied: send reminders" (email to the couple). Most revenue will come in the final 6 weeks.
4. **Add-ons at checkout** (average order value): extra event microsite (Mehendi/Sangeet as their own link) ₹99; "Save the Date" video ₹199; printed QR table cards via a print partner (affiliate margin).
5. **WhatsApp Business API sending** as a ₹499 add-on for 300+ guest weddings: truly automatic sending from our number with delivery/read receipts. Costs us ~₹0.10–₹0.90 per message, so price it per guest.
6. **Planners & venues (B2B).** A wedding planner does 20–50 weddings a year. ₹2,999/month for unlimited couples under their brand. Needs accounts (PLAN.md #32).
7. **Instagram/Reels engine.** The video export is already Reels-sized. Post one template reel a day from the catalog; add "Made with WeddingVerse" as a 1-second end card on free exports if you open video export to free.
8. **Regional languages** (Hindi, Tamil, Telugu, Marathi, Gujarati, Punjabi) for guest pages. Parents and grandparents are half the audience.
9. **SEO pages** per ceremony and culture ("Anand Karaj invitation", "Nikah invitation card online"), each rendering real templates from the catalog.

**Unit economics (rough):** hosting ≈ ₹0 on free tiers until a few hundred weddings, then ~₹600–₹1,500/month (a paid Render instance plus Neon). Razorpay takes ~2% (≈₹12 on ₹599). Email ≈ free to 3,000/month. Every paid couple is ~95% margin; the real cost is acquisition, which is why the loops above matter more than ads.

---

## 6. Honesty is part of the product

Wedding families talk. Every claim on the site must be true: no invented reviews or couple counts, no fake GST numbers, no "AI" or "licensed" labels that aren't real (see CLAUDE.md → Conventions). When real couples send kind words, ask permission and add them. Real testimonials with names and cities are the strongest sales asset you will have.
