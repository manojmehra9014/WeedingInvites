# Hosting WeddingVerse for free

WeddingVerse is **one Node.js process**: it serves the website *and* the small API that stores published invitations, RSVPs, and payments. So you need two things:

1. **A place to run Node.js**, reachable on the internet over HTTPS.
2. **Storage that survives restarts**, because couples' invitations and guests' RSVPs live there.

> ⚠️ Static-only hosts (Netlify, Vercel static, GitHub Pages, Cloudflare Pages) can show the site, but **guest links, RSVPs and payments will not work** there. The app falls back to demo mode. Use them only for a marketing preview.

Pick one of the two recipes below. Both cost ₹0.

| | **A. Render + Neon** (recommended to start) | **B. Oracle Cloud Always Free VM** |
|---|---|---|
| Setup time | ~15 minutes, all in the browser | ~1 hour, needs Linux basics |
| Always on? | Kept awake by a built-in self-ping + free uptime monitor (step A5) | Yes |
| Storage | Neon Postgres (free tier ~0.5 GB, roughly 300 weddings with photos) | 200 GB disk, JSON file store |
| Card needed? | No | Yes (verification only) |
| Good for | Launch, first few hundred couples | When you want zero cold starts and more room |

Free-tier limits change. Check each provider's pricing page before relying on a number here.

---

## Before you start (both recipes)

1. Put the code on **GitHub** (private repo is fine):
   ```bash
   git init && git add -A && git commit -m "WeddingVerse"
   # create an empty repo on github.com, then:
   git remote add origin https://github.com/<you>/weddingverse.git
   git push -u origin main
   ```
   `.env`, `data/`, `node_modules/` and `dist/` are already git-ignored. Never commit your Razorpay secret.
2. Make sure it passes locally:
   ```bash
   npm install
   npm run check        # types + all logic checks
   npm run build
   ```

---

## Recipe A: Render (app) + Neon (database)

### A1. Create the database on Neon
1. Sign up at **neon.tech** (GitHub login works) → **Create project** → pick the region closest to your guests (e.g. *AWS Asia Pacific (Singapore)* for India).
2. Open **Connection details**, copy the connection string. It looks like
   `postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. That's it. WeddingVerse creates its table on first start.

### A2. Create the web service on Render
Easiest, using the included `render.yaml`:
1. Sign up at **render.com** with GitHub → **New → Blueprint** → select your repo → **Apply**.
2. It asks for the secret values:
   - `DATABASE_URL` = the Neon string from A1 (**required**: Render's free disk is wiped on every restart)
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` = leave **empty** for now (demo mode)
   - `ADMIN_KEY` is generated for you. Copy it from the service's **Environment** tab to open the owner dashboard at `/#/admin`
   - `RESEND_API_KEY` / `EMAIL_FROM` = optional, see *Email invitations* below

Manual alternative: **New → Web Service** → your repo → Runtime *Node*, Build `npm ci --include=dev && npm run build`, Start `npm start`, Instance type *Free*, then add the same environment variables plus `NODE_VERSION=22`.

### A3. Check it
After the first deploy (~3 min) you get `https://weddingverse-xxxx.onrender.com`. The logs should show:
```
WeddingVerse API on http://localhost:10000 · payments: demo mode (no keys) · storage: Postgres
```
Then do a real test:
1. Open the site → **Create Invitation** → fill the steps → on the preview click **Publish & Copy Link**.
2. Open that link on your phone → RSVP.
3. Back on **RSVP Hub**, your reply is there. ✅

Automated version, run from your laptop against the live URL (it creates a test wedding, so do it once before launch, or use a separate Neon branch):
```bash
npm run e2e -- https://weddingverse-xxxx.onrender.com
```

### A4. Custom domain (optional, ~₹800/year)
Buy a domain (e.g. `weddingverse.in`) from any registrar → Render: **Settings → Custom Domains → Add** → create the DNS record it shows. HTTPS is automatic. Guest links then look like `https://weddingverse.in/invite/priya-and-arjun`.

### A5. Stop the cold starts (free)
A sleeping free instance makes the **first guest wait up to a minute**. That hurts RSVPs.
- **Built in:** on Render the server pings its own public URL (`RENDER_EXTERNAL_URL`, set by Render) at `/api/health` every 4 minutes, so it never goes idle long enough to sleep. The log shows `keep-awake: pinging … every 4 min`. Elsewhere set `KEEP_AWAKE_URL=https://<your-app>`; `KEEP_AWAKE=0` turns it off.
- **Backup (recommended):** the self-ping can't wake an instance that already slept (e.g. after Render restarts it). Add a free monitor on **uptimerobot.com** or **cron-job.org**: type *HTTP(s)*, URL `https://<your-app>/api/health`, interval **5 minutes**. It also emails you when the site is down.
- One always-awake service fits inside Render's free monthly instance hours (750 h ≈ a full month). Only do this for **one** free service.
- When revenue starts, Render's cheapest paid instance removes sleeping entirely and is the reliable choice for a live business. That's the first thing worth paying for.

---

## Recipe B: Oracle Cloud Always Free VM

1. Sign up at **cloud.oracle.com** (Always Free; card for verification only). Choose a home region near India (Mumbai/Hyderabad).
2. **Create a VM instance**: image *Ubuntu 24.04*, shape *Ampere A1* (e.g. 1 OCPU / 6 GB, within Always Free). Download the SSH key.
3. In the instance's **VCN → Security List**, add ingress rules for TCP **80** and **443** from `0.0.0.0/0`.
4. SSH in and install Node 22 + Caddy (automatic HTTPS):
   ```bash
   ssh -i key.pem ubuntu@<public-ip>
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs git
   sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt-get update && sudo apt-get install -y caddy
   sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT && sudo netfilter-persistent save
   ```
5. Get the app and build it:
   ```bash
   git clone https://github.com/<you>/weddingverse.git && cd weddingverse
   npm ci --include=dev && npm run build
   cat > .env <<'EOF'
   PORT=3001
   DATA_DIR=/home/ubuntu/weddingverse-data
   ADMIN_KEY=<long random secret>
   RAZORPAY_KEY_ID=
   RAZORPAY_KEY_SECRET=
   EOF
   ```
   (Leave `DATABASE_URL` empty: the JSON file in `DATA_DIR` is fine on a real disk. After editing `site.config.ts`, run `npm run build` again.)
6. Run it as a service that restarts on crash/reboot:
   ```bash
   sudo tee /etc/systemd/system/weddingverse.service <<'EOF'
   [Unit]
   Description=WeddingVerse
   After=network.target
   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/weddingverse
   ExecStart=/usr/bin/npm start
   Restart=always
   [Install]
   WantedBy=multi-user.target
   EOF
   sudo systemctl enable --now weddingverse
   ```
7. Point your domain's **A record** at the VM's public IP, then:
   ```bash
   echo 'weddingverse.in {
     reverse_proxy localhost:3001
   }' | sudo tee /etc/caddy/Caddyfile && sudo systemctl reload caddy
   ```
   (No domain yet? A free `xxx.duckdns.org` subdomain works.)
8. **Back up** the data folder daily (it's your customers' RSVPs):
   ```bash
   (crontab -l; echo '0 3 * * * tar czf /home/ubuntu/backup-$(date +\%a).tgz -C /home/ubuntu weddingverse-data') | crontab -
   ```
   This keeps 7 rolling copies; copy them off the machine now and then.

Update later: `cd weddingverse && git pull && npm ci --include=dev && npm run build && sudo systemctl restart weddingverse`.

---

## Going live with real payments (Razorpay)

Demo mode charges nothing and unlocks plans for free, so **turn on real keys before you market the site**.

1. Sign up at **razorpay.com**. Individuals and sole proprietors can register with PAN + bank account (KYC).
2. Razorpay reviews your website before activating live payments. The pages it checks are built at `/#/legal` and linked from the footer and the checkout. Give Razorpay these links:
   - Contact us: `/#/legal/contact` (shows `business.email`, `phone` and `address` from `site.config.ts`; redeploy after setting them)
   - Terms & Conditions: `/#/legal/terms`
   - Privacy Policy: `/#/legal/privacy`
   - Cancellation & Refund Policy: `/#/legal/refund`
   - Shipping & Delivery Policy: `/#/legal/delivery`

   Read `src/components/legal/LegalPage.tsx` once before applying. The refund policy is **no refunds** (the free plan is the trial), except for a duplicate charge or a payment whose plan didn't unlock.
3. Start with **Test mode**: Dashboard → Account & Settings → API Keys → generate `rzp_test_…` keys → set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` on Render (or in `.env` on the VM) → redeploy. The server log says `payments: Razorpay TEST mode`. Pay with Razorpay's test UPI/cards.
4. After activation, swap in **live** keys (`rzp_live_…`). The log says `payments: Razorpay LIVE`. The demo checkout endpoint switches itself off whenever keys are set.
5. Coupon codes live in `server/payments.ts` (`COUPONS`). Change them there; they never ship to the browser.
6. **Webhook (do this before going live).** Razorpay Dashboard → Account & Settings → Webhooks → Add: URL `https://<your-domain>/api/payments/webhook`, a secret you generate, events **payment.authorized**, **payment.captured** and **order.paid**. Put the same secret in `RAZORPAY_WEBHOOK_SECRET`. This applies payments whose browser never came back (a UPI QR approved on the phone after the tab closed). Even without it, the dashboard re-checks a wedding's unconfirmed orders every time it opens, but the webhook does it within seconds.
7. **Payment problems.** A plan is granted only for a payment Razorpay reports as captured for the full order amount; an authorized payment is captured first. A duplicate charge still needs a manual refund from the Razorpay dashboard (Payments → the payment → Refund).
8. **Accounts.** The email a couple pays with becomes their account (they can also add it from the dashboard). They sign in at `#/account` with a 6-digit code sent by email, so email (step: Resend, below) must be configured for sign-in to work. Without it, codes are only printed in the server log.

Receipts: set `business.legalName` in `site.config.ts` to your legal/trade name. Set `business.gstin` **only** if you are GST-registered (it turns the receipt into a tax invoice). Rebuild/redeploy after changing them.

---

## Email invitations (optional)

Couples can always send by WhatsApp. To also let paid couples email their guest list:
1. Sign up at **resend.com** (free: 3,000 emails/month, 100/day) → **Domains** → add your domain and create the DNS records it shows (needed so emails don't land in spam).
2. **API Keys** → create one → set `RESEND_API_KEY` and `EMAIL_FROM="WeddingVerse <invites@yourdomain.in>"` → redeploy. The server log says `email: on`.
Without a domain of your own, leave email off.

## Owner dashboard

Set `ADMIN_KEY` to a long random secret (Render generates one; locally: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`). Open `https://<your-site>/#/admin` and paste it. It stays unlocked only for that browser tab.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Checkout says **"Demo mode"** in production | Razorpay keys missing, or the build can't reach `/api` (you're on a static host) |
| Guest link shows **"Invitation not found"** after a redeploy | You're on Render without `DATABASE_URL`, so the disk was wiped. Add Neon. |
| First visit takes ~1 minute | Free instance was asleep. See A5. |
| Server log: `self-signed certificate` | Your Postgres provider uses a private CA. Use Neon, or append `?sslmode=disable` **only** for a database on the same machine. |
| Couple edited details but guests see old ones | The dashboard shows a red "edits haven't reached the live site" banner with the reason. Usually the server was asleep; it retries on the next edit. |
| Couple lost access after clearing browser data | Editing rights live in the browser that published (there are no accounts yet). Recover by copying `editKey` from the old browser's localStorage, or add accounts (PLAN.md #32). |
