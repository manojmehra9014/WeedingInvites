// Run: npx tsx src/utils/design.check.ts
import assert from 'node:assert/strict';
import { isDarkColor, parseLocalDate, timeUntil } from './design';

const d = parseLocalDate('2026-12-14', '17:30');
assert.equal(d.getDate(), 14); // no UTC day-shift
assert.equal(d.getHours(), 17);

const from = parseLocalDate('2026-12-13', '16:29').getTime() - 5_000;
assert.deepEqual(timeUntil(d, from), { days: 1, hours: 1, minutes: 1, seconds: 5 });
assert.deepEqual(timeUntil(d, d.getTime() + 1), { days: 0, hours: 0, minutes: 0, seconds: 0 }); // never negative

assert.equal(isDarkColor('#070C14'), true);
assert.equal(isDarkColor('#FBF8F4'), false);

console.log('design checks passed');
