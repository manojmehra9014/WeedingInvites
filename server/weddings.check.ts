// Run: npx tsx server/weddings.check.ts
// Postgres store too: CHECK_DATABASE_URL=postgres://… npx tsx server/weddings.check.ts (use a throwaway database)
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { betterPlan } from './payments';
import { cleanData, cleanGuestRsvp, cleanGuests, cleanRsvp, freeSlug, guestStatuses, keyMatches, newWedding, normalizePhone, publicView, slugify, visibleRsvps } from './weddings';

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'wv-'));
// Never the real DATABASE_URL: this writes test rows.
process.env.DATABASE_URL = process.env.CHECK_DATABASE_URL ?? '';
const { openStore } = await import('./store');
const store = await openStore();

// A couple can't grant themselves a plan or fake RSVPs through their own data.
const data = cleanData({ partner1: { name: 'Priya Kapoor' }, partner2: { name: 'Arjun' }, weddingDate: '2026-12-14', plan: 'royal_suite', rsvps: [{}] })!;
assert.equal(data.plan, undefined);
assert.equal(data.rsvps, undefined);
assert.equal(cleanData({ partner1: {}, weddingDate: 'x' }), null);

assert.equal(slugify('Zoë & Émile!!'), 'zoe-emile');
const { doc, editKey } = newWedding(await freeSlug(store, 'priya-and-arjun'), data);
await store.put(doc);
assert.equal(await freeSlug(store, 'Priya and Arjun'), 'priya-and-arjun-2'); // slugs never collide
assert.ok(keyMatches(doc, editKey));
assert.ok(!keyMatches(doc, 'guess'));
assert.ok(!keyMatches(doc, undefined));
assert.equal('editKeyHash' in publicView(doc), false);
assert.equal('rsvps' in publicView(doc), false);

// Guest input is whitelisted and clamped; a decline has zero seats.
assert.equal(cleanRsvp({ guestName: ' ', phone: '1' }), null);
const decline = cleanRsvp({ guestName: 'A', phone: '1', attending: false, guestsCount: 5, isAdmin: true })!;
assert.equal(decline.guestsCount, 0);
assert.equal('isAdmin' in decline, false);
assert.equal(cleanRsvp({ guestName: 'A', phone: '1', attending: true, guestsCount: 999 })!.guestsCount, 20);

// Free plan sees the first 25 replies; the rest wait behind an upgrade, never deleted.
for (let i = 0; i < 30; i++) await store.append(doc.slug, 'rsvps', { ...cleanRsvp({ guestName: `G${i}`, phone: '1' })!, id: `r${i}` });
let saved = (await store.get(doc.slug))!;
let v = visibleRsvps(saved);
assert.deepEqual([v.rsvps.length, v.hiddenCount, v.total], [25, 5, 30]);
assert.equal(v.rsvps.at(-1)!.id, 'r0'); // oldest keep their slot
await store.put({ ...saved, plan: 'royal_suite' });
assert.equal(visibleRsvps((await store.get(doc.slug))!).hiddenCount, 0);
await store.deleteRsvp(doc.slug, 'r3');
assert.equal((await store.get(doc.slug))!.rsvps.length, 29);
saved = (await store.get(doc.slug))!;

// Phones: any Indian format becomes wa.me's 91XXXXXXXXXX; junk becomes empty.
assert.equal(normalizePhone('098765 43210'), '919876543210');
assert.equal(normalizePhone('+91-98765-43210'), '919876543210');
assert.equal(normalizePhone('+44 7700 900123'), '447700900123');
assert.equal(normalizePhone('12'), '');

// Guest list: new guests get tokens; known ids keep token + send history; junk is dropped.
let guests = cleanGuests([{ name: 'Sharma Family', phone: '9876543210', email: 'x@y.in' }, { name: '' }, 'junk'], []);
assert.equal(guests.length, 1);
guests = [{ ...guests[0], invitedAt: '2026-01-01' }];
const again = cleanGuests([{ id: guests[0].id, name: 'Sharma Parivar', phone: '9876543210', email: 'bad' }, { name: 'Iyer' }], guests);
assert.equal(again[0].token, guests[0].token);
assert.equal(again[0].invitedAt, '2026-01-01');
assert.equal(again[0].name, 'Sharma Parivar');
assert.equal(again[0].email, '');
assert.notEqual(again[1].token, again[0].token);

// patch() replaces the guest list without touching RSVPs that arrived in between.
const before = (await store.get(doc.slug))!.rsvps.length;
await store.patch(doc.slug, { guests: again });
assert.equal((await store.get(doc.slug))!.rsvps.length, before);

// Funnel: sent → opened → replied, tied together only by the private token.
const [sharma, iyer] = again;
await store.append(doc.slug, 'opens', { token: sharma.token, at: '2026-01-02' });
await store.append(doc.slug, 'rsvps', { ...cleanRsvp({ guestName: 'S', phone: '1', attending: false, guestToken: iyer.token })! });
const status = Object.fromEntries(guestStatuses((await store.get(doc.slug))!).map((g) => [g.name, g.status]));
assert.deepEqual(status, { 'Sharma Parivar': 'opened', Iyer: 'declined' });
assert.equal(publicView((await store.get(doc.slug))!, sharma.token).guestName, 'Sharma Parivar');
assert.equal(publicView((await store.get(doc.slug))!, 'nope').guestName, null);

// Personal invitations: seats, events and a note per guest; the guest's link sees only their events.
const party = { ...doc, data: { ...doc.data, events: [{ id: 'e-mehendi' }, { id: 'e-wedding' }, { id: 'e-reception' }] } };
const [vip, recOnly, stale] = cleanGuests(
  [
    { name: 'Rao Family', phone: '9876543210', seats: 3, note: '  Can’t wait to see you!  ' },
    { name: 'Office friends', seats: 99, events: ['e-reception', 42] },
    { name: 'Old list', events: ['e-deleted'] },
  ],
  [],
);
assert.equal(vip.seats, 3);
assert.equal(vip.note, 'Can’t wait to see you!');
assert.equal(recOnly.seats, undefined); // out of range is ignored, not clamped to a surprise number
assert.deepEqual(recOnly.events, ['e-reception']);
party.guests = [vip, recOnly, stale];
const recView = publicView(party, recOnly.token);
assert.deepEqual((recView.data.events as { id: string }[]).map((e) => e.id), ['e-reception']);
assert.equal((publicView(party, stale.token).data.events as unknown[]).length, 3); // stale selection → all events
assert.equal((publicView(party).data.events as unknown[]).length, 3); // the plain link shows everything
assert.deepEqual(publicView(party, vip.token).guest, { name: 'Rao Family', seats: 3, note: 'Can’t wait to see you!', hasPhone: true, reply: undefined });
assert.equal(JSON.stringify(publicView(party, vip.token)).includes('9876543210'), false); // never the phone itself

// Their reply: phone/name fall back to the list, party size and events are held to the invitation.
const r = cleanGuestRsvp(party, { guestToken: vip.token, attending: true, guestsCount: 8, eventsAttending: ['e-wedding'] })!;
assert.equal(r.phone, '919876543210');
assert.equal(r.guestName, 'Rao Family');
assert.equal(r.guestsCount, 3);
const r2 = cleanGuestRsvp(party, { guestToken: recOnly.token, phone: '1', attending: true, eventsAttending: ['e-mehendi', 'e-reception'] })!;
assert.deepEqual(r2.eventsAttending, ['e-reception']);
assert.equal(cleanGuestRsvp(party, { guestToken: recOnly.token, attending: true }), null); // no phone on file: must type it
assert.equal(cleanGuestRsvp(party, { guestName: 'Walk-in', phone: '1', attending: true, guestsCount: 8 })!.guestsCount, 8); // plain link unchanged
party.rsvps = [{ ...r, guestToken: vip.token }];
assert.deepEqual(publicView(party, vip.token).guest!.reply, { attending: true, guestsCount: 3, eventsAttending: ['e-wedding'], mealPreference: 'any' });
// Clearing a setting really clears it.
assert.equal(cleanGuests([{ id: vip.id, name: 'Rao Family' }], [vip])[0].seats, undefined);
assert.equal(cleanRsvp({ guestName: 'A', phone: '1', guestToken: '<script>' })!.guestToken, undefined);
assert.equal((await store.summaries()).find((r) => r.slug === doc.slug)!.opens, 1);

// Buying never downgrades.
assert.equal(betterPlan('royal_suite', 'digital_classic'), 'royal_suite');
assert.equal(betterPlan('free', 'digital_classic'), 'digital_classic');

// Funnel events: distinct people per step, totals, and the most common details.
await store.track('asset_downloaded', 'browser-aaaa', 'story');
await store.track('asset_downloaded', 'browser-aaaa', 'story');
await store.track('asset_downloaded', 'browser-bbbb', 'post');
await store.track('wedding_started', 'browser-aaaa', '');
const counts = Object.fromEntries((await store.eventCounts()).map((e) => [e.name, e]));
assert.equal(counts.asset_downloaded.people, 2);
assert.equal(counts.asset_downloaded.total, 3);
assert.deepEqual(counts.asset_downloaded.top[0], { detail: 'story', n: 2 });
assert.deepEqual(counts.wedding_started.top, []);

console.log(`wedding checks passed (${process.env.DATABASE_URL ? 'postgres' : 'file'} store)`);
process.exit(0); // the Postgres pool would keep the process alive
