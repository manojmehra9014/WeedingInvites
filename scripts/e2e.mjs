// End-to-end, in your installed Chrome: couple builds + publishes, guest opens the link and RSVPs,
// couple sees it, hits the RSVP paywall, pays (demo mode), downloads the video, guest sees Royal perks.
//
// Needs a server in demo mode (no Razorpay keys) with a throwaway store:
//   npm run build && DATA_DIR=/tmp/wv-e2e PORT=3002 ADMIN_KEY=e2e-admin-key-123456 AUTH_DEV_CODES=1 npm start
//   ADMIN_KEY=e2e-admin-key-123456 npm run e2e
// Screenshots and the exported video land in e2e-output/.
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:3002';
const OUT = fileURLToPath(new URL('../e2e-output/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const PHOTO = fileURLToPath(new URL('../src/assets/images/goa_beach_card_1790593729962.jpg', import.meta.url));

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];
const ok = (cond, msg) => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); console.log(results.at(-1)); };
const errors = [];
// PNG width/height from the IHDR chunk; null if the file isn't a PNG.
const pngSize = (file) => {
  const b = readFileSync(file);
  return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
};
const shareSection = () => page.locator('section[aria-label="Shareable invitation images"]');
const downloadAsset = async (format, button = /Download/) => {
  const [d] = await Promise.all([page.waitForEvent('download'), shareSection().locator(`[data-format=${format}]`).getByRole('button', { name: button }).click()]);
  const f = OUT + d.suggestedFilename();
  await d.saveAs(f);
  return { name: d.suggestedFilename(), size: pngSize(f) };
};
const watch = (page, tag) => {
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  // 402 = the plan-limit responses this test triggers on purpose.
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('402') && errors.push(`[${tag}] ${m.text().slice(0, 160)}`));
};

const couple = await browser.newContext({ viewport: { width: 1366, height: 860 }, permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
const page = await couple.newPage();
watch(page, 'couple');

// Landing honesty
await page.goto(BASE + '/#/');
await page.waitForTimeout(1200);
const landing = await page.locator('body').innerText();
ok(!/12,000|AI Love Story|GPU/.test(landing), 'landing has no fabricated claims');
ok(!/Ananya|Rahul|Singhania|Oberoi/.test(await page.evaluate(() => document.body.textContent)) && /Bride/.test(landing), 'fresh visitor sees placeholders, no sample couple');
await page.goto(BASE + '/#/dashboard');
await page.waitForTimeout(1000);
const emptyDash = await page.locator('body').innerText();
ok(/Add your names and date/.test(emptyDash) && !/Singhania|Karan Mehra|Gupta/.test(emptyDash), 'fresh dashboard is empty: no sample RSVPs');

// Onboarding with validation + photo upload
await page.goto(BASE + '/#/onboarding');
await page.waitForTimeout(800);
await page.getByPlaceholder('Bride’s full name').fill('');
await page.getByRole('button', { name: /Continue/ }).click();
ok(await page.getByText('Please enter both names.').isVisible(), 'onboarding blocks empty names');
await page.getByPlaceholder('Bride’s full name').fill('Priya Kapoor');
await page.getByPlaceholder('Groom’s full name').fill('Arjun Mehta');
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForTimeout(500);
ok((await page.locator('input[type=time]').count()) >= 1, 'wedding time uses a time picker');
await page.locator('input[type=date]').first().fill('2026-12-14');
await page.locator('input[type=time]').first().fill('17:30');
await page.getByPlaceholder('Venue name').fill('Taj Falaknuma Palace');
await page.getByPlaceholder('City, state').fill('Hyderabad, Telangana');
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Walima', exact: true }).click();
ok((await page.locator('input[value="Walima"]').count()) === 1, 'event preset chip adds a Walima');
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForTimeout(400);
await page.locator('input[type=file]').first().setInputFiles(PHOTO);
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Add a chapter' }).click();
await page.getByPlaceholder('Year').fill('2019');
await page.getByPlaceholder('A few lines your guests will love.').fill('We met over filter coffee in Chennai.');
const coupleSrc = await page.locator('img[alt="Couple portrait"]').getAttribute('src');
ok(coupleSrc?.startsWith('data:image/jpeg') && coupleSrc.length < 600_000, `couple photo uploaded & resized (${Math.round((coupleSrc?.length ?? 0) / 1024)} KB)`);
await page.getByRole('button', { name: /Continue/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Generate My Invitation/ }).click();
await page.waitForTimeout(4000);
ok(page.url().endsWith('#/invite-preview'), 'generate lands on preview');

// Publish from the studio
await page.locator('.wax-seal').click().catch(() => {});
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Publish & Copy Link/ }).click();
await page.waitForTimeout(1500);
const link = await page.evaluate(() => navigator.clipboard.readText());
ok(/\/invite\/priya-and-arjun(-\d+)?$/.test(link), `publish copies a real link: ${link}`);
await page.screenshot({ path: OUT + '01-studio.png' });

// WhatsApp preview tags
const html = await (await fetch(link)).text();
ok(html.includes('<title>Priya Kapoor &#38; Arjun Mehta · Wedding Invitation</title>') && html.includes('og:image'), 'guest link HTML has couple-specific title + og:image');
const cover = await fetch(link.replace('/invite/', '/api/weddings/') + '/cover');
ok(cover.ok && cover.headers.get('content-type') === 'image/jpeg', 'og:image serves the uploaded photo');

// Guest on a phone
const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const guest = await guestCtx.newPage();
watch(guest, 'guest');
await guest.goto(link + '?guest=Sharma%20Family');
await guest.waitForTimeout(1500);
const guestText = await guest.evaluate(() => document.body.textContent); // includes text still waiting for its scroll reveal
ok(guestText.includes('Priya') && guestText.includes('Sharma Family'), 'guest sees the invitation, personalised');
ok(/Made with \S+/.test(guestText), 'free plan shows the “Made with …” credit');
ok(guestText.includes('Taj Falaknuma Palace'), 'guest sees the couple’s venue');
ok(guestText.includes('We met over filter coffee in Chennai.') && guestText.includes('Walima'), 'guest sees the story chapter and the Walima');
ok(!/\bcustom\b/i.test(guestText.replace(/customi[sz]/gi, '')), 'custom events show no “custom” badge');
ok(!/Ananya|Rahul|Verma|Oberoi|Pichola/i.test(guestText) && guestText.includes('#PriyaArjunWedding'), 'no sample-couple details leak to guests');
ok((await guest.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, 'guest page has no horizontal scroll on phone');
await guest.screenshot({ path: OUT + '02-guest.png' });
const rsvp = async (name, accept) => {
  await guest.getByPlaceholder('Your name or family name').fill(name);
  await guest.getByPlaceholder('+91 98765 43210').fill('+91 90000 00001');
  if (!accept) await guest.getByRole('button', { name: 'Regretfully declines' }).click();
  await guest.getByRole('button', { name: /Send RSVP/ }).click();
  await guest.waitForTimeout(900);
};
await guest.locator('#rsvp-form').scrollIntoViewIfNeeded();
await rsvp('Sharma Family', true);
ok(await guest.getByText('Thank you, Sharma Family!').isVisible(), 'guest RSVP accepted');
await guest.getByRole('button', { name: 'Submit another response' }).click();
await rsvp('Uncle Declines', false);
await guest.screenshot({ path: OUT + '03-guest-rsvp.png', fullPage: false });

// Couple dashboard sees them
await page.goto(BASE + '/#/dashboard');
await page.waitForTimeout(2000);
const dash = await page.locator('body').innerText();
ok(dash.includes('Sharma Family') && /Attending · 1 guest/.test(dash), 'couple sees the guest’s RSVP');
ok(dash.includes('Uncle Declines') && dash.includes('Declined'), 'decline shows as Declined');
await page.getByRole('button', { name: 'QR Code' }).click();
await page.waitForTimeout(400);
ok((await page.locator('.fixed svg rect, .fixed svg path').count()) > 0, 'QR code rendered from a real encoder');
await page.screenshot({ path: OUT + '04-qr.png' });
await page.getByRole('button', { name: 'Close' }).click();

// Shareable images on the free plan: every format previews, the Save the Date downloads at half size.
await page.getByRole('button', { name: 'Create shareable invitation' }).click();
await page.waitForTimeout(2500);
ok((await shareSection().locator('img').count()) === 4, 'share panel previews story, post, status and square');
const freeImg = await downloadAsset('story');
ok(freeImg.name === 'priya-arjun-save-the-date-story.png' && freeImg.size?.join('x') === '540x960', `free Save the Date: ${freeImg.name} ${freeImg.size?.join('x')}`);
await shareSection().getByRole('tab', { name: 'Walima' }).click();
await page.waitForTimeout(1500);
ok(await shareSection().locator('[data-format=post]').getByRole('button', { name: /Unlock/ }).isVisible(), 'event cards are locked on the free plan');
await shareSection().screenshot({ path: OUT + '04c-share-free.png' });

// ── Guest list & sending ────────────────────────────────────────────────────
const slug = link.split('/invite/')[1];
const addGuests = async (text) => {
  await page.getByRole('button', { name: 'Add guests' }).click();
  await page.getByPlaceholder(/One guest per line/).fill(text);
  await page.getByRole('button', { name: /^Add \d+ guests$/ }).click();
  await page.waitForTimeout(900);
};
await addGuests(Array.from({ length: 30 }, (_, i) => `Family ${i}, 98765432${String(i).padStart(2, '0')}`).join('\n'));
ok(/holds 25 guests/.test(await page.locator('body').innerText()), 'free plan caps the guest list at 25 with upsell');
await page.getByPlaceholder(/One guest per line/).fill('Name,Phone,Email\nMehta Family\t+91 98200 11111\tmehta@example.com\nIyer Uncle, 9876501234\nDr. Rao, rao@example.com');
await page.getByRole('button', { name: /^Add 3 guests$/ }).click();
await page.waitForTimeout(900);
ok(/Added 3 guests/.test(await page.locator('body').innerText()), 'pasted list (Excel/CSV mix, header row) adds 3 guests');

// Personalise one guest: seats and a personal note.
await page.locator('li', { hasText: 'Mehta Family' }).getByTitle('Personalise').click();
await page.getByPlaceholder('Any').fill('2');
await page.getByPlaceholder(/Can’t wait to dance/).fill('Bring your dancing shoes, Mehta ji!');
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(900);
ok(/2 seats · “Bring your dancing shoes, Mehta ji!”/.test((await page.locator('li', { hasText: 'Mehta Family' }).innerText()).replace(/\s+/g, ' ')), 'couple personalises a guest: seats and a note');

// One-tap WhatsApp queue
await page.getByRole('button', { name: 'Send invitations' }).click();
await page.waitForTimeout(300);
ok(await page.getByText('Sending invitations · 1 of 3').isVisible(), 'WhatsApp queue starts at guest 1 of 3');
await page.evaluate(() => { window.__opened = []; window.open = (u) => (window.__opened.push(u), null); });
await page.getByRole('button', { name: /Open WhatsApp for Mehta/ }).click();
const waUrl = decodeURIComponent((await page.evaluate(() => window.__opened))[0] ?? '');
ok(waUrl.startsWith('https://wa.me/919820011111?text=') && /Dear Mehta Family[\s\S]*\?g=/.test(waUrl), 'WhatsApp opens to the guest’s number with their personal link');
ok(waUrl.includes('💺 2 seats reserved for you'), 'WhatsApp message mentions their reserved seats');
ok(await page.getByText('Sending invitations · 2 of 3').isVisible(), 'queue advances to the next guest');
await page.getByRole('button', { name: 'Stop' }).click();
await page.waitForTimeout(800);

// Mehta's personal link, opened on a guest's phone
await page.locator('li', { hasText: 'Mehta Family' }).getByTitle('Copy personal link').click();
await page.waitForTimeout(500);
const personal = await page.evaluate(() => navigator.clipboard.readText());
ok(/\/invite\/[a-z-]+\?g=[\w-]+$/.test(personal), `personal link has a private token: ${personal}`);
const html2 = await (await fetch(personal)).text();
ok(html2.includes('Dear Mehta Family, you') , 'WhatsApp preview greets the guest by name');
await guest.goto(personal);
await guest.waitForTimeout(1500);
ok((await guest.evaluate(() => document.body.textContent)).includes('Prepared with love for Mehta Family'), 'personal link greets the family by name');
const greetBox = guest.locator('section[aria-label="Your personal invitation"]');
await greetBox.scrollIntoViewIfNeeded(); // it fades in on scroll; innerText then proves it's visible
await guest.waitForTimeout(1400);
const greet = await greetBox.innerText();
ok(/Dear Mehta Family,/.test(greet) && greet.includes('Bring your dancing shoes, Mehta ji!') && /reserved 2 seats/.test(greet), 'personal greeting: Dear <name>, the couple’s note, reserved seats');
await guest.screenshot({ path: OUT + '03a-guest-greeting.png' });
await guest.locator('#rsvp-form').scrollIntoViewIfNeeded();
ok((await guest.getByPlaceholder('Your name or family name').inputValue()) === 'Mehta Family', 'RSVP form is prefilled with their name');
ok((await guest.locator('#rsvp-form select option').count()) === 2, 'party size is limited to the 2 reserved seats');
// Their phone is on the guest list, so they can reply without typing it.
await guest.getByRole('button', { name: /Send RSVP/ }).click();
await guest.waitForTimeout(1500);
ok(/You’re coming · 2 seats/.test(await greetBox.evaluate((el) => el.textContent)), 'one-tap reply (no phone typed) shows in their greeting');
ok(await guest.getByText('Planning a celebration of your own?').isVisible(), 'free invite shows “make your own” CTA after RSVP');
await guest.screenshot({ path: OUT + '03b-guest-cta.png' });
const refHref = await guest.getByText('Planning a celebration of your own?').locator('xpath=..').getAttribute('href');
ok(refHref === `/?ref=${slug}`, 'CTA carries the couple’s referral code');

await page.reload();
await page.waitForTimeout(1500);
const rowText = async (name) => (await page.locator('li', { hasText: name }).innerText()).replace(/\s+/g, ' ');
ok(/Coming · 2/.test(await rowText('Mehta Family')), 'guest list shows Mehta as Coming with 2 seats');
ok(/Seats: 2 confirmed of 2 reserved/.test(await page.locator('body').innerText()), 'seat totals: confirmed of reserved');
ok(/Not sent/.test(await rowText('Iyer Uncle')), 'unsent guest shows Not sent');
await page.locator('li', { hasText: 'Dr. Rao' }).getByTitle('Copy personal link').click();
await page.waitForTimeout(500);
await (async () => { await guest.goto(await page.evaluate(() => navigator.clipboard.readText())); await guest.waitForTimeout(1200); })();
await page.reload();
await page.waitForTimeout(1500);
ok(/Opened/.test(await rowText('Dr. Rao')), 'opening a personal link marks the guest Opened');
await page.locator('text=Guest list & sending').scrollIntoViewIfNeeded();
await page.screenshot({ path: OUT + '04b-guest-list.png' });

// Referral: another couple arrives through the CTA and publishes
const friendCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const friend = await friendCtx.newPage();
watch(friend, 'friend');
await friend.goto(`${BASE}/?ref=${slug}#/dashboard`);
// The friend enters their own details (the app starts empty), then publishes.
await friend.evaluate(() => localStorage.setItem('weddingverse_app_state_v1', JSON.stringify({ partner1: { name: 'Neha Rao', shortName: 'Neha' }, partner2: { name: 'Kabir Shah', shortName: 'Kabir' }, weddingDate: '2027-02-10', mainVenue: 'The Leela', city: 'Goa' })));
await friend.reload();
await friend.waitForTimeout(1200);
await friend.getByRole('button', { name: 'Publish my invitation' }).click();
await friend.waitForTimeout(1500);
const friendSlug = await friend.evaluate(() => JSON.parse(localStorage.getItem('weddingverse_app_state_v1')).customSlug);
const friendQuote = await (await fetch(`${BASE}/api/payments/quote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: 'royal_suite', slug: friendSlug }) })).json();
ok(friendQuote.totalInr === 549 && friendQuote.coupon === 'FRIEND', 'referred couple is quoted the ₹50 friend discount');

// RSVP paywall: 30 more replies arrive
for (let i = 0; i < 30; i++) {
  await fetch(`${BASE}/api/weddings/${slug}/rsvp`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${i}` }, body: JSON.stringify({ guestName: `Guest ${i}`, phone: '1', attending: true, guestsCount: 2 }) });
}
await page.getByTitle('Refresh').click();
await page.waitForTimeout(1200);
ok(/8 more guests have replied/.test(await page.locator('body').innerText()), 'free plan locks replies beyond 25 with upsell');
await page.screenshot({ path: OUT + '05-paywall.png' });

// Video: locked on free → checkout → demo pay with coupon → unlocked
await page.goto(BASE + '/#/video-maker');
await page.waitForTimeout(1000);
const scenesText = await page.locator('body').innerText();
ok(!/Udaipur|Pichola/.test(scenesText), 'video has no hardcoded Udaipur text');
await page.getByRole('button', { name: /Download \(Royal\)/ }).click();
await page.waitForTimeout(1200);
await page.getByPlaceholder(/Coupon code/).fill('royal50');
await page.getByRole('button', { name: 'Apply' }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: /^Pay/ }).click();
await page.waitForTimeout(2500);
ok(await page.getByText('Demo · not charged').isVisible(), 'demo checkout completes');
await page.getByRole('button', { name: /Continue to My Wedding Suite/ }).click();
const serverPlan = await (await fetch(`${BASE}/api/weddings/${slug}`)).json();
ok(serverPlan.plan === 'royal_suite', 'server recorded Royal plan');

await page.getByRole('button', { name: /Download video/ }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: OUT + '06-rendering.png' });
const save = page.getByRole('link', { name: /^Save/ });
await save.waitFor({ timeout: 60_000 });
const [dl] = await Promise.all([page.waitForEvent('download'), save.click()]);
const file = OUT + dl.suggestedFilename();
await dl.saveAs(file);
ok(statSync(file).size > 200_000 && statSync(file).size < 16_000_000, `video exported: ${dl.suggestedFilename()} (${Math.round(statSync(file).size / 1024)} KB)`);

// The friend pays → the referring couple sees it
await friend.getByRole('button', { name: /Upgrade from/ }).click();
await friend.waitForTimeout(1500);
ok(await friend.getByText('Friend discount (invited by another couple)').isVisible(), 'checkout shows the friend discount');
await friend.getByRole('button', { name: /^Pay ₹549/ }).click();
await friend.waitForTimeout(2500);
ok(await friend.getByText('Demo · not charged').isVisible(), 'referred couple completes checkout');

// Receipt uses the real amount
await page.goto(BASE + '/#/dashboard');
await page.waitForTimeout(1500);
ok(!/locked|more guests have replied/.test(await page.locator('body').innerText()), 'Royal plan unlocks every reply');
ok(/1 joined · 1 upgraded · ₹100 credit available/.test(await page.locator('body').innerText()), 'referrer earns ₹100 credit when the friend pays');

// Shareable images on Royal: every card at full size, no credit.
await page.getByRole('button', { name: 'Create shareable invitation' }).click();
await page.waitForTimeout(2500);
await shareSection().getByRole('tab', { name: 'Invitation' }).click();
await page.waitForTimeout(1500);
const post = await downloadAsset('post');
ok(post.name === 'priya-arjun-wedding-invitation-post.png' && post.size?.join('x') === '1080x1350', `paid invitation post: ${post.name} ${post.size?.join('x')}`);
await shareSection().getByRole('tab', { name: 'Walima' }).click();
await page.waitForTimeout(1500);
const sq = await downloadAsset('square');
ok(sq.name === 'priya-arjun-walima-square.png' && sq.size?.join('x') === '1080x1080', `paid event square: ${sq.name} ${sq.size?.join('x')}`);
// Phones: Share hands the PNG to the native share sheet (stubbed here; headless Chrome has no sheet).
await page.evaluate(() => {
  navigator.canShare = () => true;
  navigator.share = async (d) => { window.__shared = d.files.map((f) => `${f.name} ${f.type} ${f.size}`); };
});
await shareSection().locator('[data-format=story]').getByRole('button', { name: /Share/ }).click();
await page.waitForTimeout(2500);
const shared = await page.evaluate(() => window.__shared ?? []);
ok(/^priya-arjun-walima-story\.png image\/png \d{5,}$/.test(shared[0] ?? ''), `share sends the image file: ${shared[0]}`);
// Browsers without file sharing: Share falls back to a download.
await page.evaluate(() => { navigator.canShare = undefined; });
const st = await downloadAsset('status', /Share/);
ok(st.name === 'priya-arjun-walima-status.png' && st.size?.join('x') === '1080x1920', `share falls back to download: ${st.name} ${st.size?.join('x')}`);
await shareSection().screenshot({ path: OUT + '07b-share-paid.png' });

// Account: save the wedding to an email, then sign in on a brand-new device and get the paid wedding back.
await page.getByLabel('Account email').fill('priya@example.com');
await page.getByRole('button', { name: 'Save email' }).click();
await page.waitForTimeout(1200);
ok(/Your account: priya@example.com/.test(await page.locator('body').innerText()), 'couple links their wedding to an email');
const phone2 = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
watch(phone2, 'new-device');
await phone2.goto(BASE + '/#/account');
await phone2.waitForTimeout(800);
await phone2.getByPlaceholder('you@example.com').fill('priya@example.com');
await phone2.getByRole('button', { name: /Email me a code/ }).click();
await phone2.waitForTimeout(800);
const devCode = (await phone2.locator('text=your code is').innerText()).match(/\d{6}/)?.[0];
await phone2.getByLabel('6-digit code').fill(devCode ?? '');
await phone2.getByRole('button', { name: /Sign in/ }).click();
await phone2.waitForTimeout(2500);
const restored = await phone2.locator('body').innerText();
ok(phone2.url().endsWith('#/dashboard') && /Priya Kapoor & Arjun Mehta/.test(restored) && /Royal/i.test(restored) && /Mehta Family/.test(restored), 'new device signs in with an emailed code and gets the paid wedding, guests included');
await phone2.screenshot({ path: OUT + '07c-signed-in-phone.png' });

// Checkout never unlocks anything when the payment server can't be reached.
// (A separate, unwatched tab: the blocked request is the point of the test, not an error.)
const off = await phone2.context().newPage();
await off.route('**/api/payments/config', (r) => r.abort());
await off.goto(BASE + '/#/video-maker');
await off.waitForTimeout(800);
await off.evaluate(() => { const s = JSON.parse(localStorage.getItem('weddingverse_app_state_v1')); s.plan = 'free'; localStorage.setItem('weddingverse_app_state_v1', JSON.stringify(s)); });
await off.reload();
await off.waitForTimeout(1000);
await off.getByRole('button', { name: /Download \(Royal\)/ }).click();
await off.waitForTimeout(1500);
ok(/Payments are unavailable right now/.test(await off.locator('body').innerText()) && (await off.getByRole('button', { name: /^Pay/ }).isDisabled()), 'server unreachable: checkout is blocked, nothing unlocks offline');
await page.getByRole('button', { name: 'Receipt' }).click();
await page.waitForTimeout(300);
const receipt = await page.locator('.fixed').last().innerText();
ok(receipt.includes('₹549.00') && !receipt.includes('08AAACW'), 'receipt shows coupon price, no fake GSTIN');
await page.screenshot({ path: OUT + '07-receipt.png' });

// Guest now gets the wax seal and no branding
await guest.goto(link);
await guest.waitForTimeout(1500);
ok(await guest.locator('.wax-seal').isVisible(), 'Royal guest page opens with the wax seal');
await guest.locator('.wax-seal').click();
await guest.waitForTimeout(1800);
ok(!/Made with \S+/.test(await guest.evaluate(() => document.body.textContent)), 'paid plan removes branding');

// Owner dashboard
if (process.env.ADMIN_KEY) {
  await page.goto(BASE + '/#/admin');
  await page.waitForTimeout(800);
  await page.locator('input[type=password]').fill(process.env.ADMIN_KEY);
  await page.getByRole('button', { name: 'Open' }).click();
  await page.waitForTimeout(1200);
  const admin = await page.locator('body').innerText();
  ok(/Business overview/i.test(admin) && /Couples from referrals\s*1\b/i.test(admin) && /Paying couples\s*2\b/i.test(admin), 'owner dashboard shows couples, payments and referrals');
  ok(/Wedding started\s*[1-9]/.test(admin) && /Image downloaded\s*[1-9]/.test(admin) && /Plan purchased\s*2\b/.test(admin), 'owner funnel counts starts, downloads and purchases');
  await page.screenshot({ path: OUT + '08-admin.png', fullPage: true });
}

// Phone layout of every app view
const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pp = await phone.newPage();
for (const v of ['', 'catalog', 'onboarding', 'invite-preview', 'video-maker', 'dashboard', 'admin']) {
  await pp.goto(`${BASE}/#/${v}`);
  await pp.waitForTimeout(900);
  const o = await pp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(o <= 0, `phone ${v || 'landing'}: no horizontal overflow (${o}px)`);
  await pp.screenshot({ path: `${OUT}p-${v || 'landing'}.png` });
}

// Look at a real frame of the exported file.
const v = await (await browser.newContext({ viewport: { width: 540, height: 960 } })).newPage();
await v.goto('file://' + file);
await v.waitForTimeout(800);
await v.evaluate(() => { const el = document.querySelector('video'); el.currentTime = 6; });
await v.waitForTimeout(1200);
await v.screenshot({ path: OUT + '09-video-frame.png' });
console.log('\nconsole/page errors:', errors.length ? '\n' + [...new Set(errors)].join('\n') : 'none');
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
await browser.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
