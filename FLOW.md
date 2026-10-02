# How WeddingVerse works

There are three people in the story:

- **The couple** designs the invitation, shares it, watches RSVPs arrive, and pays.
- **The guest** taps a WhatsApp link, sees the invitation, and replies.
- **You (the owner)** get paid when couples upgrade, and every free invitation advertises you to its guests.

---

## 1. The couple's journey

The five steps appear as the progress bar at the top of every app page (`JourneyBar`).

```
Landing ─► 1 Choose design ─► 2 Add details ─► 3 Preview website ─► 4 Make video ─► 5 Share & RSVPs
 #/          #/catalog          #/onboarding     #/invite-preview     #/video-maker    #/dashboard
```

Outside the journey: `#/legal` (Contact, Terms, Privacy, Refund, Delivery; linked from the footer and checkout) and `#/admin` (owner dashboard).

| Step | What the couple does | What happens underneath |
|---|---|---|
| **Landing** | Sees a live template showcase, pricing (Free / ₹299 / ₹599), FAQ | Marketing only |
| **1. Choose design** | Browses ~1,937 designs, filters by ceremony/culture/style/layout, opens Quick Look, picks one | Templates are generated from palettes × layouts × fonts (`generateCatalog`). Previews render the *real* invitation with the couple's names. |
| **2. Add details** | 5 short steps: names & parents → date, time, venue, address → ceremonies (Mehendi, Sangeet…) → photos (portrait, cover, up to 6 gallery) → design | Saved in the browser (`localStorage`) on every step. Photos are shrunk on the device (≈200 KB each) before being stored. When the couple types their own names, the sample couple's hashtag, parents, love story and venues are cleared so they never reach real guests. |
| **3. Preview website** | Sees the invitation on desktop/phone frames, customises layout, fonts, colours, arch and motif, previews the wax-seal envelope, **clicks "Publish & Copy Link"** | First publish sends the wedding to the server, which returns a **guest link** `/invite/<names>` and a secret **edit key** kept in this browser. From then on, every edit syncs to the live site automatically about a second later. |
| **4. Make video** | Plays a 25-second animated video (6 scenes from their own details), picks 1 of 5 soundtracks and a format (9:16, 1:1, 16:9). **Royal plan:** clicks *Download video* | The browser draws each frame onto a 1080p canvas and records it with the music (MediaRecorder) into an MP4 (or WebM on browsers without MP4 recording), about 12 MB. Nothing is uploaded. |
| **5. Share & RSVPs** | Adds the guest list (paste from Excel/contacts), sends every family their **personal link** through a one-tap WhatsApp queue (or email on paid plans), reminds non-repliers, shares the public link in groups, downloads a scannable QR code, exports CSV for the caterer, copies their referral link | Each guest gets a private token link (`?g=…`) that greets them by name and records *sent → opened → replied*. RSVPs and statuses refresh every 30 s. The plan decides guest-list size and visible RSVPs. |

## 2. The guest's journey

```
WhatsApp message ──► taps link ──► /invite/priya-and-arjun?g=<their private token>   (or the public link without ?g)
                                        │
                           server sends the page with the couple's names + photo
                           in the preview tags (so WhatsApp shows a rich card)
                                        │
                     (Royal plan) wax-seal envelope → tap to break → music starts
                                        │
         Invitation: hero · countdown · ceremonies (Add to calendar, Directions) · story · gallery · venue map
                                        │
                        RSVP form: accept/decline, party size, ceremonies, meal, message
                                        │
                           saved on the server ──► appears in the couple's dashboard
```

- No app and no login. It opens in the phone browser.
- Personal links greet the family by name (in the WhatsApp preview too), prefill the RSVP name, and tell the couple the guest opened it. Only the first open is recorded; the token reveals nothing about other guests.
- Guests only download what the invitation needs (~145 KB of code, gzipped), not the whole app.
- On the **free plan** the invitation ends with "Made with WeddingVerse · Create yours free", and after a guest RSVPs they see *"Planning a celebration of your own? ₹50 off"*. Both links carry the couple's referral code. See BUSINESS.md.

## 3. Plans and what they unlock

| | Free | Digital Classic ₹299 | Royal Cinema & Suite ₹599 |
|---|---|---|---|
| All templates, customiser, live invitation link | ✅ | ✅ | ✅ |
| Guest list with personal tracked links + WhatsApp send queue | 25 guests | 500 guests | unlimited |
| Email invitations & reminders (if the server has an email key) | – | ✅ | ✅ |
| RSVPs **visible** in dashboard | first 25 | first 150 | unlimited |
| "Made with WeddingVerse" credit on the guest page | shown | removed | removed |
| Wax-seal envelope for guests | – | – | ✅ |
| Download the 1080p video | preview only | preview only | ✅ |

**Replies are never lost.** Every RSVP is stored; the plan only decides how many the couple can *see*. When the 26th guest replies on a free plan, the dashboard shows *"7 more guests have replied, unlock all replies"*, the moment the couple most wants to pay. Paying never downgrades (Royal + Classic stays Royal). Prices and limits live in one file: `src/data/pricing.ts`.

## 4. How a payment works

```
Couple clicks Pay ₹549 (Royal with ROYAL50)
  │
  ├─ invitation not published yet? → publish it first (a payment belongs to one wedding)
  │
  ├─ POST /api/payments/order      server prices it from pricing.ts + server-only coupons,
  │                                creates a Razorpay order with {plan, slug} in its notes
  ├─ Razorpay Checkout window      UPI / cards / NetBanking / wallets. Card and UPI details never touch our site.
  ├─ POST /api/payments/verify     server checks Razorpay's signature (HMAC-SHA256), then reads
  │                                plan + amount + wedding from Razorpay's copy of the order
  │                                (never from the browser) and saves the plan on that wedding
  └─ Receipt shown; dashboard shows the new plan; guest page loses branding / gains the envelope
```

- **Demo mode:** with no Razorpay keys configured, checkout says "Demo" and unlocks the plan without charging. The demo endpoint refuses to work once real keys are set.
- **Coupons** (`ROYAL50`, `FIRST50`, `WEDDING100`, `JASHN100`) live only on the server.
- **Referral perks**, priced by the server from the wedding record: a couple who arrived via `?ref=` gets ₹50 off their first purchase; a couple earns ₹100 credit for each referred couple that pays. The single best of coupon / friend discount / credit applies; nothing stacks.
- **Refunds:** none; the free plan is the trial (design, preview, publish, preview the video, 25 RSVPs). Only a duplicate charge or a plan that failed to unlock is fixed, by hand (HOST.md). Checkout links the Terms and Refund Policy under the Pay button.
- **Receipt:** shows the amount actually paid (after coupon) and the payment date. It's a GST tax invoice only if `business.gstin` is set in `site.config.ts`.

## 5. Where data lives

| Data | Where | Who can read it |
|---|---|---|
| Draft invitation while editing | Couple's browser (`localStorage`) | The couple |
| Published invitation (names, dates, events, photos, design) | Server: Postgres (`DATABASE_URL`) or a JSON file (`DATA_DIR`) | Anyone with the link |
| RSVPs | Server, inside the same wedding record | Only whoever holds the edit key |
| Guest list (names, phones, emails, private tokens), opens | Server, same record | Only whoever holds the edit key. A guest's token only reveals their own name. |
| Business totals | Computed on request from all weddings (no photos or guest details) | Owner, with `ADMIN_KEY` at `/#/admin` |
| Edit key | Couple's browser. The server stores only its SHA-256 hash. | The couple |
| Plan / payment | Server (set only by verified payment) and mirrored to the browser | The couple |
| Card / UPI details | Razorpay only | Nobody here |

Guest input is cleaned on the server (whitelisted fields, length limits, max 20 per party) and rate-limited (10 replies per 10 minutes per IP per wedding). CSV exports neutralise spreadsheet formulas.

## 6. Code map

```
src/main.tsx                       /invite/<slug> → GuestInvite, everything else → App (lazy-loaded)
src/App.tsx                        hash routing between the app views + checkout modal
src/hooks/useWeddingState.ts       wedding data, localStorage, publish(), live auto-sync
src/utils/api.ts                   every call to our server (publish, guest page, RSVPs)
src/utils/payments.ts              Razorpay checkout + demo mode
src/utils/videoExport.ts           storyboard (shared by preview and export) + canvas/MediaRecorder renderer
src/utils/audioEngine.ts           music synthesised in the browser (5 voicings), recordable into the video
src/utils/image.ts                 on-device photo resize
src/utils/guests.ts                paste-a-list parser + WhatsApp invite/reminder messages
src/components/dashboard/GuestManager.tsx   guest list, send queue, reminders, email, per-guest status
src/components/admin/AdminDashboard.tsx     owner's business dashboard (#/admin)
src/components/legal/LegalPage.tsx          policies Razorpay requires (#/legal)
server/email.ts                    invitation emails via Resend (optional)
src/data/pricing.ts                prices + what each plan unlocks  ← change pricing here
src/data/templatesCatalog.ts       base templates + generated catalog
src/components/templates/
  InvitationSite.tsx               the invitation guests see (4 layouts)
  GuestInvite.tsx                  the public /invite/<slug> page
  WaxSealEnvelope.tsx              Royal envelope
  InvitationRenderer.tsx           couple's preview studio + customiser + publish/share
src/components/onboarding/         the details wizard
src/components/video/VideoMaker    video studio
src/components/dashboard/          Share & RSVP hub (paywall, QR, CSV, receipt)
server/index.ts                    Express: API + serves the built site + WhatsApp preview tags
server/store.ts                    storage (Postgres or JSON file)
server/weddings.ts                 slugs, edit keys, input cleaning, RSVP visibility rules
server/payments.ts                 pricing math, coupons, Razorpay order/verify
```

## 7. Checks

```bash
npm run check    # types + template catalog + payment math + wedding/RSVP/plan rules
npm run e2e      # 52-step real-browser run of everything above (see scripts/e2e.mjs for setup)
```
