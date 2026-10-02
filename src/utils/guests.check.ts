// Run: npx tsx src/utils/guests.check.ts
import assert from 'node:assert/strict';
import { inviteMessage, parseGuestLines, whatsappUrl } from './guests';

// Excel paste (tabs), CSV with a header, messy phones, email-only, name-only.
assert.deepEqual(
  parseGuestLines('Name,Phone,Email\nSharma Family\t+91 98765-43210\tsharma@x.in\nIyer, uncle@mail.com\n\nDr. Kapoor;(0)98111 22233\nNeha'),
  [
    { name: 'Sharma Family', phone: '+91 98765-43210', email: 'sharma@x.in' },
    { name: 'Iyer', phone: '', email: 'uncle@mail.com' },
    { name: 'Dr. Kapoor', phone: '(0)98111 22233', email: '' },
    { name: 'Neha', phone: '', email: '' },
  ],
);
// A short number stays part of the name ("Table 12"), never a phone.
assert.deepEqual(parseGuestLines('Table 12 guests'), [{ name: 'Table 12 guests', phone: '', email: '' }]);

const ctx = { couple: 'Priya & Arjun', dateText: 'Sunday, 14 December 2026', place: 'Taj Falaknuma, Hyderabad' };
const msg = inviteMessage('Sharma Family', 'https://x/invite/p?g=abc', ctx);
assert.ok(msg.includes('Dear Sharma Family') && msg.endsWith('With love and blessings 🙏') && msg.includes('?g=abc'));
assert.ok(inviteMessage('A', 'L', ctx, true).includes('reminder'));
assert.ok(whatsappUrl('919876543210', 'hi & bye').startsWith('https://wa.me/919876543210?text=hi%20%26%20bye'));
assert.ok(whatsappUrl('', 'hi').startsWith('https://api.whatsapp.com/send?text='));

// A lone small number in its own cell is the party size.
assert.deepEqual(parseGuestLines('Rao Family, 98765 43210, 4\nMehta, 99'), [
  { name: 'Rao Family', phone: '98765 43210', email: '', seats: 4 },
  { name: 'Mehta 99', phone: '', email: '' }, // out of range: left in the name for the couple to fix
]);
// Personal invitation: reserved seats and only their events; nothing extra when unset.
const personal = inviteMessage('Rao Family', 'L', ctx, false, { seats: 3, events: ['Sangeet', 'Reception'] });
assert.ok(personal.includes("🎉 You're invited to: Sangeet, Reception") && personal.includes('💺 3 seats reserved for you'));
assert.ok(!msg.includes('💺') && !msg.includes('🎉'));
assert.ok(!inviteMessage('A', 'L', { ...ctx, place: '' }).includes('📍'));

console.log('guest checks passed');
