// Run: npx tsx server/payments.check.ts
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { checkPayment, isValidSignature, isValidWebhookSignature, quote, RazorpayOrder, RazorpayPayment } from './payments';

// Prices come from the shared table; coupons are case/space-insensitive; unknown codes are ignored.
assert.deepEqual(quote('royal_suite'), { plan: 'royal_suite', baseInr: 599, discountInr: 0, totalInr: 599, coupon: null });
assert.deepEqual(quote('digital_classic', ' royal50 '), { plan: 'digital_classic', baseInr: 299, discountInr: 50, totalInr: 249, coupon: 'ROYAL50' });
assert.equal(quote('royal_suite', 'NOPE').totalInr, 599);
assert.equal(quote('royal_suite', { evil: true }).totalInr, 599); // non-string input from a hostile client

// Referral perks: the best single discount wins; nothing stacks; the ₹1 floor holds.
assert.equal(quote('royal_suite', '', { referred: true }).totalInr, 549);
assert.equal(quote('royal_suite', '', { referred: true }).coupon, 'FRIEND');
assert.equal(quote('royal_suite', 'WEDDING100', { referred: true }).totalInr, 499); // coupon beats friend discount
assert.equal(quote('royal_suite', 'ROYAL50', { creditInr: 200 }).coupon, 'CREDIT'); // ₹200 credit beats ₹50
assert.equal(quote('digital_classic', '', { creditInr: 900 }).totalInr, 1);

// Razorpay signature: HMAC-SHA256(order_id|payment_id, secret), hex.
const secret = 'test_secret';
const sig = createHmac('sha256', secret).update('order_1|pay_1').digest('hex');
assert.equal(isValidSignature('order_1', 'pay_1', sig, secret), true);
assert.equal(isValidSignature('order_1', 'pay_2', sig, secret), false); // payment swapped
assert.equal(isValidSignature('order_1', 'pay_1', sig, 'other'), false); // wrong key
assert.equal(isValidSignature('order_1', 'pay_1', 'short', secret), false); // length mismatch must not throw

// A plan is granted only for a captured payment of this whole order; details come from the order, not the browser.
const order: RazorpayOrder = { id: 'order_1', amount: 59900, currency: 'INR', status: 'paid', notes: { plan: 'royal_suite', slug: 'priya-and-arjun', coupon: '' } };
const pay: RazorpayPayment = { id: 'pay_1', order_id: 'order_1', amount: 59900, currency: 'INR', status: 'captured', email: 'Priya@Example.com' };
assert.deepEqual(checkPayment(order, pay), { ok: true, plan: 'royal_suite', slug: 'priya-and-arjun', coupon: null, amountInr: 599, paymentId: 'pay_1', email: 'Priya@Example.com' });
assert.equal(checkPayment(order, { ...pay, order_id: 'order_2' }).ok, false); // a payment from another (cheaper) order
assert.equal(checkPayment(order, { ...pay, status: 'authorized' }).ok, false); // not captured: would be refunded
assert.equal(checkPayment(order, { ...pay, status: 'failed' }).ok, false);
assert.equal(checkPayment(order, { ...pay, amount: 100 }).ok, false); // partial payment
assert.equal(checkPayment(order, { ...pay, currency: 'USD' }).ok, false);
assert.equal(checkPayment({ ...order, notes: { slug: 'x' } }, pay).ok, false); // order without a plan
assert.equal(checkPayment({ ...order, notes: { plan: 'royal_suite', slug: '../admin' } }, pay).ok, false);
assert.equal((checkPayment({ ...order, notes: { ...order.notes, coupon: 'CREDIT' } }, pay) as { coupon: string }).coupon, 'CREDIT');

// Webhooks: HMAC-SHA256 of the exact raw body with the webhook secret.
const body = '{"event":"order.paid"}';
const wsig = createHmac('sha256', 'whsec').update(body).digest('hex');
assert.equal(isValidWebhookSignature(Buffer.from(body), wsig, 'whsec'), true);
assert.equal(isValidWebhookSignature(Buffer.from(body + ' '), wsig, 'whsec'), false); // body altered
assert.equal(isValidWebhookSignature(Buffer.from(body), wsig, 'other'), false);
assert.equal(isValidWebhookSignature(Buffer.from(body), '', 'whsec'), false);

console.log('payment checks passed');
