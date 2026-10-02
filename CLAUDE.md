# WeddingVerse

Luxury wedding invitation website + animated video maker. The couple enters details once; a schema-driven template engine renders the guest website, the video scenes, and the RSVP dashboard from the same data.

SPA + one Express server: React 19 + TypeScript + Vite 8 + Tailwind v4 (`@tailwindcss/vite`, no config file) + GSAP 3.15 (ScrollTrigger, SplitText, DrawSVG, all free since 3.13). No router library or test framework. The couple's draft lives in `localStorage`; **publishing** sends it to `server/` (Postgres via `DATABASE_URL`, else a JSON file in `DATA_DIR`), which serves guest pages at `/invite/<slug>`, stores RSVPs, and records paid plans. See FLOW.md (how it works), HOST.md (free hosting), PLAN.md (review + roadmap), BUSINESS.md (tiers, growth loops).

## Commands

```bash
npm install                          # bun.lock also exists; either works
npm run dev                          # vite on :3000 (proxies /api → :3001)
npm run dev:api                      # API on :3001 (tsx watch): publish, guest pages, RSVPs, payments. Needed for sharing/RSVPs
npm run build && npm start           # production: one Express process serves dist/ + /api
npm run lint                         # tsc --noEmit
npm run check                        # tsc + all *.check.ts below
npx tsx src/utils/design.check.ts            # date/countdown/dark-theme helpers
npx tsx src/utils/guests.check.ts            # guest-list paste parser + WhatsApp message builder
npx tsx src/utils/shareImages.check.ts       # share-image cards, filenames, crop, text fitting (pixels: e2e)
npx tsx src/data/templatesCatalog.check.ts   # catalog: no duplicates, no contradictions, readable contrast
npx tsx server/payments.check.ts             # pricing/coupon math + Razorpay signature verification
npx tsx server/payments.flow.check.ts        # real server vs a fake Razorpay: QR-after-close, capture, duplicates, forgeries, sign-in
npx tsx server/weddings.check.ts             # publish/edit key/RSVP cleaning/plan visibility (CHECK_DATABASE_URL=… for Postgres)
npm run e2e                                  # real Chrome, 74 steps; see header of scripts/e2e.mjs for the server it needs
```

## Map

```
site.config.ts                every business detail (brand, contact, GSTIN, prices, limits)  ← edit here
src/
  main.tsx                    /invite/<slug> → GuestInvite (lazy, small bundle); everything else → App
  App.tsx                     view switch + page transition + the one app-wide motion scope
  data/emptyWedding.ts        EMPTY_WEDDING (start state) + withPlaceholders() for previews
  hooks/useWeddingState.ts    single state hook: WeddingData + localStorage + publish() + live auto-sync + hash routing
  utils/api.ts                all calls to our server (publish, public wedding, RSVPs); inviteUrl()
  utils/videoExport.ts        videoScenes() storyboard (preview AND export read it) + canvas/MediaRecorder renderer
  utils/shareImages.ts        shareCards() (save the date, invitation, one per event) + canvas PNG renderer (story/post/status/square)
  utils/analytics.ts          FUNNEL_EVENTS + track(): anonymous funnel events → POST /api/events → #/admin funnel
  components/dashboard/ShareAssets.tsx    "Create shareable invitation" panel: live previews, download, native share
  data/pricing.ts             PLANS + ENTITLEMENTS per tier (built from site.config.ts) + referral amounts + inr()/limit() copy helpers
  utils/guests.ts             paste-a-list parser, invite/reminder message, wa.me URL
  components/dashboard/GuestManager.tsx   guest list, one-tap WhatsApp queue, reminders, email, per-guest funnel
  components/admin/AdminDashboard.tsx     owner business dashboard at #/admin (ADMIN_KEY)
  components/legal/LegalPage.tsx          Contact/Terms/Privacy/Refund/Delivery at #/legal (Razorpay needs them)
  hooks/useGsapReveal.ts      declarative motion system (data-* attributes, see below)
  utils/gsap.ts               registers plugins; import gsap/ScrollTrigger/SplitText from HERE
  types/template.ts           TemplateDefinition, LayoutType, ArchStyle, MotifType   ← source of truth
  types/wedding.ts            WeddingData, events, RSVPs, CustomDesignSettings
  data/templatesCatalog.ts    28 hand-authored BASE_TEMPLATES + generateCatalog() (≈1,900 unique generated)
  data/designOptions.ts       LAYOUT_OPTIONS, FONT_PAIRINGS
  data/colorPalettes.ts       curated palettes for the customizer
  utils/design.ts             resolveDesign(), designVars(), date/time/countdown helpers
  components/templates/
    InvitationSite.tsx        THE guest-facing site (layouts, sections, RSVP form)
    InvitationRenderer.tsx    studio shell: toolbar, customizer, device frames, wax-seal envelope
    TemplateThumbnail.tsx     catalog/onboarding cards: the real hero rendered at 1100px and scaled down
    GuestInvite.tsx           public guest page (fetches /api/weddings/:slug, RSVPs to the server)
    WaxSealEnvelope.tsx       Royal-plan envelope, shared by studio preview and guest page
  components/catalog/         template browser + Quick Look (renders the real InvitationSite)
  components/video/           VideoMaker (scene player + real 1080p export, Royal only)
server/
  index.ts                    Express: /api/weddings*, /api/payments*, /invite/:slug with OG tags, serves dist/
  store.ts                    Store: Postgres (one jsonb doc per wedding) or JSON file; patch/append are atomic
  email.ts                    Resend invitation emails (on only with RESEND_API_KEY + EMAIL_FROM)
  weddings.ts                 slugs, edit-key hashing, input cleaning, visibleRsvps()
  components/layout/JourneyBar the 5-step product flow shown on every app view
  components/landing/         Hero (live template showcase) → CeremonyMarquee → TemplateReel (pinned) →
                              DualOutput → Workflow → CulturalShowcase → FeaturesBento → SocialProofPricing
  components/common/Motifs    SVG arches/motifs (take a hex `color` prop)
```

`docs/` holds the original PRD/spec. Parts of it describe files that were never built (e.g. `StepCouple.tsx`, `TemplateReel`), so trust the code over `docs/`.

## Template engine

The pipeline is `TemplateDefinition` + `weddingData.customDesign`, then `resolveDesign()`, then `ResolvedDesign`, then `<InvitationSite design=…>`.

- **Layout drives composition.** `layout` (`royal_arch | cinematic | editorial | modern_split`) picks the hero, the variant of each section, and the section order (`SECTION_ORDER` in `InvitationSite.tsx`). Palette, fonts, arch, and motif are skin on top of it.
- **Customizations never mutate templates.** They live in `customDesign` (`layout`, `fontHeading/fontBody`, `customPalette`, `archStyle`, `motif`), and `resolveDesign` merges them. Always go through `resolveDesign`. Reading `activeTemplate.theme` directly ignores the couple's choices; VideoMaker had this bug.
- **Theming runs on CSS variables, not inline styles.** `designVars(design)` goes on the site root. Tailwind utilities `bg-inv-primary`, `text-inv-heading`, `border-inv-border`, `text-inv-muted/70` etc. are registered in `src/index.css` (`@theme inline`). The root also overrides `--font-serif`/`--font-sans`, so `font-serif` means the template's heading font.
  - Use `inv-heading` / `inv-cta` / `inv-on-cta` for headings and buttons, not `inv-primary`. Dark themes have a near-black `primary`, so these tokens switch to the metallic `secondary` when `isDark`.
  - Never hardcode ink colours (`text-[#5C544D]`, `bg-white`) inside the site; they break dark palettes.
  - SVG motifs need a real hex, so pass `design.theme.secondary`, not `var(--inv-secondary)`.
- **Responsive rules use container queries.** The site root is `@container`; use `@md:` / `@2xl:` / `@3xl:`, **not** `sm:`/`md:`. The same component renders in a 360px phone frame, the desktop frame, and the Quick Look modal, and viewport breakpoints would lie in all of them.
- **Sticky needs `overflow-clip`, not `overflow-hidden`,** on wrappers around the site; `overflow-hidden` creates a scroll container and kills the sticky header.
- **Dates:** use `parseLocalDate` / `formatDate` / `formatTime`. `new Date('YYYY-MM-DD')` is UTC and can shift a day. Never hardcode wedding dates in UI.

### Catalog generation (`generateCatalog`)

- Each generated template is a **unique palette × layout × font pairing** combination (≈60 palettes × 4 layouts × 8 font pairings). Palettes come from the generator seeds, the curated customizer palettes, and an auto-derived dark "Nocturne" edition of every light palette.
- Culture, style, occasions, name, and photo are **derived from the palette**, never picked independently. Picking them independently is what produced "Hindu template for Anand Karaj" before.
- Order is a seeded shuffle (`mulberry32`), so it's stable across loads. Anything that looks like the catalog's first page lives in `BASE_TEMPLATES`.
- `designSignature()` defines "looks the same". The check script fails on duplicate signatures, names, slugs, or taglines, on rite/culture mismatches, on WCAG contrast failures, on empty quick filters, or if the count drops below the "1,900+" claimed in marketing copy.
- Names are culture place × suffix. The walk is a bijection only while `gcd(places + 1, suffixes) = 1`. If you add places or suffixes, rerun the check; it fails if any name falls back to "· Palette".
- Picking a template (`selectTemplate`) **resets visual overrides** (guest name and envelope carry over). Quick Look passes its tweaks as the second argument.

### Adding things

- **New layout:** add it to `LayoutType`, `LAYOUT_OPTIONS`, and `SECTION_ORDER`, add a hero case in `Hero`, add section variants where it differs, then assign it in `BASE_TEMPLATES` / `generateCatalog`. Check it at phone and desktop width.
- **New font pairing:** add it to `FONT_PAIRINGS` **and** the Google Fonts `<link>` in `index.html`. This also adds ~240 generated templates.
- **New palette:** add a seed with `styles` and `cultures`, then run the catalog check. Contrast failures usually mean the metal tone is too dark for the Nocturne edition.
- **New section:** add it to `SectionType` and each `SECTION_ORDER` entry, and handle the empty-data case in the `visible` filter.
- **New base template:** it needs `layout`, `theme` (all 8 tokens), `fonts`, and `decorations`. `tsc` enforces the shape.

## Flow & routing

- Views live in the URL hash: `#/catalog`, `#/onboarding`, `#/invite-preview`, `#/video-maker`, `#/dashboard` (`#/` is landing); outside the journey, `#/admin` and `#/legal[/<section>]`. `setCurrentView` just writes the hash, so Back, Forward, refresh, and deep links work. Don't add a router library.
- The product journey is `JOURNEY` in `JourneyBar.tsx`: Choose design, Add details, Preview website, Make video, Share & RSVPs. Every app view shows the bar with a "Next:" CTA. Keep new views in that order or outside it (landing).
- The onboarding wizard edits a local `draft` and saves on step change. `shortName` is derived from the first word of the name, so heroes, envelopes, and videos never show stale names.

## Motion system (GSAP)

- **Declarative first.** Add attributes; `useGsapReveal(scopeRef, deps)` animates them: `data-reveal[=up|left|right|scale|fade]`, `data-stagger`, `data-batch`, `data-split` (SplitText heading), `data-parallax="-0.15"`, `data-counter="1277"`, `data-draw` (SVG path), `data-magnetic`, `data-tilt`, `data-spotlight`. `<main>` in App is one scope (re-run per view); TopNav has its own.
- A subtree with `data-reveal-scope` belongs to its own hook or effect, and outer scopes skip it. `InvitationSite` is one: it animates itself with an IntersectionObserver `Reveal`, not ScrollTrigger, because it often scrolls inside device frames.
- Bespoke timelines (hero intro, marquee, pinned reel, video scenes, wax seal, modals) live in the component, in `useLayoutEffect`, inside `gsap.context(..., ref)` or with explicit cleanup.
- Hard-won rules:
  - **Reveal with `fromTo`, never `from`**, when a ScrollTrigger or StrictMode double-run is involved. `from()` records its end state at creation and can end up animating invisible to invisible.
  - **Never put a transform on `<main>`** (page transition is opacity-only); it breaks ScrollTrigger pinning.
  - **Don't replace text nodes React owns** (counters write into the existing text node).
  - **Don't revert a crossfade** on every change (hero slides); only kill what you restart.
  - **Pointer effects initialise lazily** on first hover so they never touch a pending reveal's transform.
  - Page height changes after mount (late webfonts, thumbnails), so `useGsapReveal` refreshes ScrollTrigger on scope resize.
- Every effect bails out on `prefersReducedMotion()` (or uses `gsap.matchMedia`), and content must be fully visible without motion.
- Verify visually; motion bugs don't show in `tsc`. Scroll progressively in a real browser: triggers only fire on scroll.

## Publishing, guests & RSVPs

- First publish: `POST /api/weddings` → `{slug, editKey}`. The key is stored in `weddingData.editKey`; the server keeps only its SHA-256. Every later change auto-syncs via `PUT /api/weddings/:slug` with `X-Edit-Key` (debounced in `useWeddingState`). `editKey` present = published.
- `cleanData` strips server-owned fields (`plan`, `rsvps`, `paidAt`, …): a couple can never grant themselves a plan through their data. Keep that list in sync when adding billing fields.
- Guest RSVPs (`POST /api/weddings/:slug/rsvp`) are whitelisted/clamped (`cleanRsvp`) and rate-limited. **All are stored; `visibleRsvps` only limits what the couple sees** by plan (oldest keep their slots).
- **Never `put` an existing wedding.** Use `store.patch` (top-level fields) or `store.append` (`rsvps`, `opens`): a read-modify-write `put` would drop an RSVP that arrived meanwhile.
- Guest list: `PUT /api/weddings/:slug/guests` replaces the list; `cleanGuests` keeps each guest's `token`/send history by `id`, and enforces the plan's `guestList` limit (402). A guest's personal link is `/invite/<slug>?g=<token>`; `publicView(doc, token)` returns only that guest's name. Status (`not_sent → sent → opened → accepted/declined`) is derived in `guestStatuses` from `invitedAt`, `opens`, and RSVPs' `guestToken`.
- **Share images** (`shareImages.ts`): the composition (editorial / luxury / traditional / minimal / cinematic) comes from `resolveDesign` (layout + `isDark`), never a user control. Cards contain only fields the couple entered; the sample couple's photos are never used for a real couple (`ownPhoto` in `ShareAssets`). Free: preview everything, download only the Save the Date at half size with the credit; paid (`shareImages` entitlement): all cards at 1080px. Client-side gate, like video.
- **Funnel analytics**: `track(name, detail)` sends an anonymous browser id + one short detail; never names/phones/emails. `wedding_published`, `rsvp_received`, `payment_completed` are recorded by the server (keyed by slug) and rejected from browsers. Stored in `events.json` or the Postgres `events` table. New event: add it to `FUNNEL_EVENTS` (and `STEPS` in `AdminDashboard` if it's a main step).
- **Guest personalization**: each guest can carry `seats` (caps their RSVP), `events` (ids they're invited to; unset = all) and a `note`. `publicView(doc, token)` returns `guest` (name, seats, note, `hasPhone`, their latest `reply`) and filters `data.events` server-side, so a reception-only guest never receives the other events. RSVPs go through `cleanGuestRsvp`, which fills a blank phone/name from the list and enforces seats/events. `GuestManager` must send `seats/events/note` back on every save (the PUT replaces the list).
- Bulk WhatsApp is a one-tap-per-guest queue (`wa.me` links), deliberately not the paid WhatsApp Business API.
- Referrals: `?ref=<slug>` is captured in `main.tsx` and sent on first publish (`referredBy`). `quote(plan, coupon, perks)` applies the single best of coupon / FRIEND (₹50, first purchase) / CREDIT (₹100 × paid referrals − spent); `recordPurchase` spends credit and credits the referrer once.
- **No sample data.** The app starts from `EMPTY_WEDDING` (`data/emptyWedding.ts`): no names, dates, events, photos or RSVPs. Previews (landing, catalog, studio, video, onboarding preview) get `withPlaceholders()`, which shows "Bride & Groom", "Your wedding date", "Your venue" and, until names are entered, the template's artwork. It is display-only: never save it, publish it, or use it on guest pages. Every section and hero must render with blank optional fields (no photo, no events, no city).

## Payments (Razorpay)

Flow: `CheckoutModal` (publishes first if needed: a payment belongs to one wedding) → `POST /api/payments/order` (server prices it from `src/data/pricing.ts` + server-only coupons, creates a Razorpay order with `{plan, slug}` in `notes`) → Razorpay Checkout (UPI / cards / NetBanking / wallets; `prefill.method` preselects the tab) → `POST /api/payments/verify` (HMAC signature check, then plan, amount and slug are read **from Razorpay's order**, not the request, and the plan is saved on that wedding via `betterPlan`, which never downgrades) → `onSuccess(plan, invoiceId, amountInr)`.

- **Never collect card/UPI/bank details in our own inputs**; that's PCI scope. Razorpay's window does it.
- **Never trust the browser for money**: amounts, coupons, and the purchased plan are all decided server-side. `RAZORPAY_KEY_SECRET` lives only in the server env.
- Keys: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `.env` (see `.env.example`). `rzp_test_…` keys for development. With no keys, checkout runs an explicitly labelled **demo mode** (`POST /api/payments/demo`, which returns 403 whenever keys are set).
- Entitlements: RSVP visibility and guest-page branding/envelope are enforced from the server's plan; video export is gated client-side only (it renders in the browser).
- **Every payment confirmation goes through `settle()`** in `server/index.ts`: browser verify, the Razorpay webhook (`/api/payments/webhook`, raw-body HMAC with `RAZORPAY_WEBHOOK_SECRET`), and `/api/payments/reconcile` (re-checks the wedding's `pendingOrders`; called by the dashboard and when checkout closes). It reads order + payment from Razorpay, captures an `authorized` payment, and `checkPayment` grants a plan only for a captured payment of the whole order. `recordPurchase` is idempotent per payment ID (`paymentIds`) and serialised per wedding, so duplicate reports never double plans or referral credit. Tested end-to-end against a fake Razorpay in `server/payments.flow.check.ts`.
- Checkout never runs without the server (no offline unlock); demo mode exists only on a reachable server with no keys.
- **Accounts** = email + one-time code (`/api/auth/code`, `/api/auth/verify`, page `#/account`). `ownerEmail` is set from the payer's Razorpay email or the dashboard (`PUT /api/weddings/:slug/owner`, edit key). Sign-in issues a new per-device edit key (`extraKeyHashes`, last 10) and the client restores the wedding from `GET /api/weddings/:slug/own`. Codes need `RESEND_API_KEY`; `AUTH_DEV_CODES=1` is for tests only.
- Receipts: never show a GSTIN unless `SITE.business.gstin` is set; the amount is `amountPaidInr` (post-coupon), the date is `paidAt`.

## Conventions

- Brand UI (outside the invitation) uses the fixed palette in `index.css` `@theme`: canvas `#FAF8F5`, ink `#191614`, gold `#B38B45`. Headings use the `font-serif` Cormorant Garamond and body text uses Plus Jakarta Sans.
- `#/legal[/<section>]` (`LegalPage.tsx`) holds the policies Razorpay requires; update it when data collection or refunds change. Refunds: none (free plan is the trial) except duplicate or failed-unlock charges; don't add refund promises elsewhere. Contact details come from `SITE.business`.
- **`site.config.ts` (`SITE`) is the one place for business details**: brand name, page title/description, footer text, legal name, contact, GSTIN, receipt prefix, plan names/prices/limits, referral amounts. Never hardcode the brand name, a price (`₹299`) or a limit (`500 guests`) in copy: use `SITE.name`, `inr(PLANS…priceInr)`, `limit(ENTITLEMENTS…)` from `data/pricing.ts`. `index.html` gets `%SITE_*%` placeholders filled by a plugin in `vite.config.ts`. No secrets in it (it ships to browsers).
- Never invent social proof, feature claims, or legal identifiers (reviews, couple counts, GSTINs, "AI"/"licensed" claims). Marketing copy must describe what the code does.
- Share links are `inviteUrl(slug)` = `<current origin>/invite/<slug>`; never hardcode a domain.
- `@google/genai` is installed but unused (leftover from the AI Studio scaffold).
