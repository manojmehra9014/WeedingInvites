# WeddingVerse

Luxury wedding invitation websites and animated video invitations for Indian weddings. A couple picks one of ~1,937 designs, enters their details once, publishes a guest link for WhatsApp, collects RSVPs, and downloads a 1080p video. It's free to start, with paid plans at ₹299 and ₹599 via Razorpay.

- **How it works:** [FLOW.md](FLOW.md)
- **Host it for free:** [HOST.md](HOST.md)
- **Review findings & roadmap:** [PLAN.md](PLAN.md)
- **Business model & growth:** [BUSINESS.md](BUSINESS.md)
- **Policies (Terms, Privacy, Refund…):** `/#/legal` on the running site, source in `src/components/legal/LegalPage.tsx`

## Run locally

Requires Node 20.11+.

```bash
npm install
npm run dev:api   # API on :3001 (stores data in ./data, demo payments)
npm run dev       # site on http://localhost:3000 (proxies /api to :3001)
```

Production-style: `npm run build && npm start` → http://localhost:3001 serves the site and API together.

**Business details live in one file, [`site.config.ts`](site.config.ts)**: brand name, page title, footer text, contact details, GSTIN, prices, plan limits and referral amounts. Edit it and rebuild; every page, receipt, policy and price updates.

Secrets and server settings live in `.env` (copy `.env.example`): Razorpay keys, `DATABASE_URL` or `DATA_DIR`, `ADMIN_KEY`, email.

## Checks

```bash
npm run check   # TypeScript + catalog + payments + wedding/RSVP rules
npm run e2e     # full browser run in your Chrome (setup in scripts/e2e.mjs)
```
