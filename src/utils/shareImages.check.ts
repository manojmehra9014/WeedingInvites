// Run: npx tsx src/utils/shareImages.check.ts   (pixels are checked in real Chrome by scripts/e2e.mjs)
import assert from 'node:assert/strict';
import type { WeddingData, WeddingEvent } from '../types/wedding';
import type { ResolvedDesign } from './design';
import { compositionFor, coverCrop, layoutText, Measure, SHARE_FORMATS, shareCards, shareFileName } from './shareImages';

const ev = (id: string, title: string, date: string, extra: Partial<WeddingEvent> = {}): WeddingEvent => ({
  id, eventType: 'custom', title, date, startTime: '19:00', venue: 'Taj Falaknuma Palace', address: '', city: 'Hyderabad', description: '', ...extra,
});
const wedding = (over: Partial<WeddingData> = {}) =>
  ({
    partner1: { name: 'Priya Kapoor', shortName: 'Priya' },
    partner2: { name: 'Arjun Mehta', shortName: 'Arjun' },
    weddingDate: '2026-12-14',
    weddingTime: '19:30',
    mainVenue: 'Taj Falaknuma Palace',
    city: 'Hyderabad',
    story: [],
    gallery: [],
    events: [ev('e2', 'Reception', '2026-12-15'), ev('e1', 'Haldi', '2026-12-13', { eventType: 'haldi', startTime: '10:00', endTime: '12:30' })],
    ...over,
  }) as WeddingData;
const text = (c: { blocks: { text: string }[] }) => c.blocks.map((b) => b.text).join(' | ');

// Formats
assert.deepEqual(SHARE_FORMATS.story.size, [1080, 1920]);
assert.deepEqual(SHARE_FORMATS.post.size, [1080, 1350]);
assert.deepEqual(SHARE_FORMATS.square.size, [1080, 1080]);
assert.deepEqual(SHARE_FORMATS.status.size, SHARE_FORMATS.story.size);

// Cards come from the schema: save the date, invitation, then each real event in date order.
const cards = shareCards(wedding());
assert.deepEqual(cards.map((c) => c.label), ['Save the Date', 'Invitation', 'Haldi', 'Reception']);
assert.equal(text(cards[0]), 'Save the date | Priya | & | Arjun | 14 December 2026 | Hyderabad');
assert.match(text(cards[1]), /Priya \| & \| Arjun .*14 December 2026 \| 7:30 pm onwards \| Taj Falaknuma Palace, Hyderabad$/i);
assert.match(text(cards[2]), /^Priya & Arjun \| Haldi \| 13 December 2026 \| 10:00 am – 12:30 pm/i);

// Deterministic filenames, no internal ids.
assert.equal(shareFileName(cards[0], 'story'), 'priya-arjun-save-the-date-story.png');
assert.equal(shareFileName(cards[1], 'post'), 'priya-arjun-wedding-invitation-post.png');
assert.equal(shareFileName(cards[3], 'status'), 'priya-arjun-reception-status.png');
assert.ok(cards.every((c) => !/e1|e2/.test(c.fileStem)));
assert.deepEqual(shareCards(wedding()).map((c) => c.fileStem), cards.map((c) => c.fileStem));

// Nothing invented: no city → no city line, no "undefined", no sample places.
const noCity = shareCards(wedding({ city: '', mainVenue: '', events: [ev('x', 'Walima', '2026-12-16', { venue: '', city: '' })] }));
for (const c of noCity) assert.ok(!/undefined|Udaipur|Hyderabad|Taj/.test(text(c)), text(c));
assert.equal(text(noCity[0]), 'Save the date | Priya | & | Arjun | 14 December 2026');
// No story, no events: still the two couple cards.
assert.equal(shareCards(wedding({ events: [] })).length, 2);

// Custom and duplicate event names stay readable and unique.
const dup = shareCards(wedding({ events: [ev('a', 'Walima', '2026-12-16'), ev('b', 'Walima', '2026-12-17'), ev('c', 'Wedding Invitation', '2026-12-18'), ev('d', '  ', '2026-12-19')] }));
assert.deepEqual(dup.slice(2).map((c) => shareFileName(c, 'square')), [
  'priya-arjun-walima-square.png', 'priya-arjun-walima-2-square.png', 'priya-arjun-wedding-invitation-2-square.png', 'priya-arjun-event-square.png',
]);
// Names in Devanagari have no Latin slug: the filename falls back instead of being "-save-the-date".
assert.equal(shareCards(wedding({ partner1: { name: 'प्रिया', shortName: '' }, partner2: { name: 'अर्जुन', shortName: '' } }))[0].fileStem, 'wedding-save-the-date');

// Text always fits its box, even for very long names and event titles (fake font: 0.55em per character).
const measure: Measure = (t, f) => t.length * f.size * 0.55 + t.length * f.spacing;
const long = shareCards(wedding({
  partner1: { name: 'Venkatalakshminarasimhaswamy', shortName: '' },
  partner2: { name: 'Bhagyalakshmi Subramaniam', shortName: '' },
  events: [ev('l', 'Grand Sangeet & Cocktail Evening with the Whole Family and Friends from Abroad', '2026-12-13', { dressCode: 'Indo-western, shades of ivory and gold' })],
}));
for (const [w, h] of [[900, 760], [430, 740], [820, 1100], [820, 560]]) {
  for (const c of long) {
    const { lines, height } = layoutText(c.blocks, w, h, measure);
    for (const l of lines) assert.ok(measure(l.text, l.font) <= w + 0.01, `${l.text} overflows ${w}px`);
    assert.ok(height <= h, `${c.label} is ${Math.round(height)}px in a ${h}px box`);
  }
}
// Short names keep their full size.
const short = layoutText(cards[0].blocks, 820, 1100, measure).lines.find((l) => l.role === 'names')!;
assert.equal(short.font.size, 156);

// Photos are cropped, never stretched, and stay inside the image.
for (const [iw, ih, bw, bh] of [[1200, 1800, 1080, 1920], [1920, 1080, 1080, 1350], [800, 800, 497, 1080]]) {
  const c = coverCrop(iw, ih, bw, bh);
  assert.ok(Math.abs(c.sw / c.sh - bw / bh) < 1e-9, 'aspect ratio preserved');
  assert.ok(c.sx >= 0 && c.sy >= 0 && c.sx + c.sw <= iw + 1e-9 && c.sy + c.sh <= ih + 1e-9, 'crop inside the photo');
}
const portrait = coverCrop(1000, 2000, 1000, 1000);
assert.equal(portrait.sy, 300); // faces in a portrait sit in the upper part

// The template picks the composition; no photo means typography-first.
const design = (layout: ResolvedDesign['layout'], isDark = false) => ({ layout, isDark }) as ResolvedDesign;
assert.equal(compositionFor(design('cinematic'), true), 'cinematic');
assert.equal(compositionFor(design('cinematic'), false), 'luxury');
assert.equal(compositionFor(design('royal_arch'), true), 'traditional');
assert.equal(compositionFor(design('royal_arch', true), true), 'luxury');
assert.equal(compositionFor(design('editorial'), false), 'editorial');
assert.equal(compositionFor(design('modern_split'), true), 'minimal');

console.log('share image checks passed');
