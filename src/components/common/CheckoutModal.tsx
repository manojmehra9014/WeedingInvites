import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { track } from '../../utils/analytics';
import { SITE } from '../../../site.config';
import { gsap, prefersReducedMotion } from '../../utils/gsap';
import { Check, X, Shield, Sparkles, QrCode, CreditCard, Landmark, Wallet, CheckCircle2, AlertCircle, FlaskConical } from 'lucide-react';
import { ENTITLEMENTS, inr, limit, PLANS } from '../../data/pricing';
import { getPaymentConfig, getQuote, payInDemoMode, payWithRazorpay, PaymentCancelled, PaymentConfig, PaymentResult, PayMethod, Quote, reconcilePayments } from '../../utils/payments';
import confetti from 'canvas-confetti';
import { weddingAudio } from '../../utils/audioEngine';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'digital_classic' | 'royal_suite';
  onSuccess: (plan: 'digital_classic' | 'royal_suite', invoiceId: string, amountInr: number) => void;
  coupleNames: string;
  /** Payments belong to a live invitation; publishes it first if needed and returns its slug and key. */
  ensurePublished: () => Promise<{ customSlug: string; editKey?: string }>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  defaultPlan = 'royal_suite',
  onSuccess,
  coupleNames,
  ensurePublished,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'digital_classic' | 'royal_suite'>(defaultPlan);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('upi');
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);
  // The published wedding this checkout is for: the server prices referral perks from it.
  const [live, setLive] = useState<{ customSlug: string; editKey?: string } | null>(null);
  const isSuccess = !!result;

  useEffect(() => {
    if (defaultPlan) {
      setSelectedPlan(defaultPlan);
    }
  }, [defaultPlan]);

  // Ask the server once per opening whether real payments are configured.
  useEffect(() => {
    if (!isOpen) return;
    track('checkout_started', defaultPlan);
    setError('');
    setResult(null);
    setLive(null);
    getPaymentConfig().then(async (c) => {
      // Publishing is free and a payment belongs to one wedding, so do it up front: then the price shown
      // already includes any friend discount or referral credit.
      if (c.serverUp) setLive(await ensurePublished().catch((e: Error) => (setError(e.message), null)));
      setConfig(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Every price shown comes from the same quote the server will charge.
  useEffect(() => {
    if (!isOpen || !config) return;
    let stale = false;
    getQuote(selectedPlan, couponStatus === 'valid' ? couponCode : '', config.serverUp, live?.customSlug)
      .then((q) => !stale && setQuote(q))
      .catch((e) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
  }, [isOpen, config, live, selectedPlan, couponStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!isOpen || !overlayRef.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(overlayRef.current, { autoAlpha: 0, duration: 0.4, ease: 'power2.out' });
      gsap.from('.checkout-panel', { autoAlpha: 0, y: 50, scale: 0.95, duration: 0.9, delay: 0.05 });
    }, overlayRef);
    return () => ctx.revert();
  }, [isOpen]);

  if (!isOpen) return null;

  const basePrice = quote?.baseInr ?? PLANS[selectedPlan].priceInr;
  const discount = quote?.discountInr ?? 0;
  const finalPrice = quote?.totalInr ?? basePrice;
  const planName = PLANS[selectedPlan].name;

  const applyCoupon = async () => {
    if (!config?.serverUp || !couponCode.trim()) return setCouponStatus('invalid');
    try {
      const q = await getQuote(selectedPlan, couponCode, true, live?.customSlug);
      // A better referral perk can win over the typed code; the code is only "valid" if it was applied.
      setCouponStatus(q.coupon === couponCode.trim().toUpperCase() ? 'valid' : 'invalid');
      setQuote(q);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handlePay = async () => {
    // Every payment is priced and recorded by the server for a published wedding; no server, no checkout.
    if (!quote || !config?.serverUp || !live) return;
    const startedAt = Date.now();
    setIsProcessing(true);
    setError('');
    try {
      const paid = config.enabled
        ? await payWithRazorpay({ plan: selectedPlan, coupon: quote.coupon ?? '', method: paymentMethod, customerName: coupleNames, slug: live.customSlug })
        : await payInDemoMode(quote, { slug: live.customSlug, editKey: live.editKey ?? '' });
      setResult(paid);
      weddingAudio.playBellChime();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#942E46', '#0D382B', '#E5B84B'],
      });
      onSuccess(paid.plan, paid.invoiceId, paid.amountInr);
    } catch (e) {
      // Closing the window is not an error; a declined payment or a server problem is.
      if (!(e instanceof PaymentCancelled) || e.message) setError(e instanceof PaymentCancelled ? `Payment not completed: ${e.message}` : (e as Error).message);
      // A UPI QR can be approved on the phone after the window closed: ask the server whether it landed.
      if (config.enabled) {
        const r = await reconcilePayments(live.customSlug).catch(() => null);
        const rank = { free: 0, digital_classic: 1, royal_suite: 2 } as const;
        // Only a payment made during this checkout counts, not one from an earlier purchase.
        if (r?.paymentId && r.paidAt && Date.parse(r.paidAt) >= startedAt && r.plan !== 'free' && rank[r.plan] >= rank[selectedPlan]) {
          const paid = { plan: r.plan, amountInr: r.amountInr ?? 0, paymentId: r.paymentId, invoiceId: `${SITE.receiptPrefix}-${r.paymentId.replace(/^pay_/, '')}`, demo: false };
          setError('');
          setResult(paid);
          onSuccess(paid.plan, paid.invoiceId, paid.amountInr);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const METHODS: { id: PayMethod; label: string; icon: typeof QrCode; hint: string }[] = [
    { id: 'upi', label: 'UPI', icon: QrCode, hint: 'Scan a QR or approve in Google Pay, PhonePe, Paytm, BHIM or any UPI app.' },
    { id: 'card', label: 'Cards', icon: CreditCard, hint: 'Visa, Mastercard, RuPay and Amex, credit or debit. Card details are entered only in Razorpay’s secure window.' },
    { id: 'netbanking', label: 'NetBanking', icon: Landmark, hint: 'All major Indian banks: SBI, HDFC, ICICI, Axis, Kotak and 50+ more.' },
    { id: 'wallet', label: 'Wallets', icon: Wallet, hint: 'Paytm, PhonePe, Amazon Pay, Mobikwik and other wallets.' },
  ];

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="checkout-panel bg-[#FAF8F5] rounded-3xl max-w-xl w-full border border-[#E8E2D8] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B38B45]" />
            <h2 className="text-lg font-serif font-bold text-[#191614]">
              {isSuccess ? 'Payment Confirmed' : 'Unlock Your Wedding Suite'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B655E] hover:text-[#191614] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!isSuccess ? (
            <>
              {/* Couple Header */}
              <div className="text-center pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8F6D31]">
                  Official Wedding Checkout
                </span>
                <p className="text-sm font-serif text-[#191614] mt-0.5 font-medium">
                  {coupleNames ? `For ${coupleNames}` : `${SITE.name} Suite`}
                </p>
              </div>

              {/* Plan Switcher Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Plan 1: Classic */}
                <div
                  onClick={() => setSelectedPlan('digital_classic')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedPlan === 'digital_classic'
                      ? 'border-[#B38B45] bg-[#FFFBF3] shadow-md'
                      : 'border-[#E8E2D8] bg-white hover:border-[#D5C7B2]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6B655E]">
                      Essential
                    </span>
                    <span className="text-lg font-serif font-bold text-[#191614]">{inr(PLANS.digital_classic.priceInr)}</span>
                  </div>
                  <h3 className="text-sm font-serif font-bold text-[#191614]">{PLANS.digital_classic.name}</h3>
                  <p className="text-[11px] text-[#6B655E] mt-1 leading-snug">
                    Your live wedding website with every template, no {SITE.name} branding, and RSVP tracking.
                  </p>
                  <div className="mt-3 pt-3 border-t border-[#EFE8DD] space-y-1">
                    <div className="text-[10px] text-[#4A453F] flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#2F6B4F]" />
                      <span>See up to {limit(ENTITLEMENTS.digital_classic.visibleRsvps)} RSVPs (free: {limit(ENTITLEMENTS.free.visibleRsvps)}) + CSV</span>
                    </div>
                    <div className="text-[10px] text-[#4A453F] flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#2F6B4F]" />
                      <span>Guest list of {limit(ENTITLEMENTS.digital_classic.guestList)} + email invitations</span>
                    </div>
                    <div className="text-[10px] text-[#4A453F] flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#2F6B4F]" />
                      <span>Instagram & WhatsApp invitation images for every ceremony</span>
                    </div>
                  </div>
                </div>

                {/* Plan 2: Royal */}
                <div
                  onClick={() => setSelectedPlan('royal_suite')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedPlan === 'royal_suite'
                      ? 'border-[#B38B45] bg-[#FFFBF3] shadow-md'
                      : 'border-[#E8E2D8] bg-white hover:border-[#D5C7B2]'
                  }`}
                >
                  <span className="absolute -top-2.5 right-4 bg-[#B38B45] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31]">
                      All-Inclusive
                    </span>
                    <span className="text-lg font-serif font-bold text-[#191614]">{inr(PLANS.royal_suite.priceInr)}</span>
                  </div>
                  <h3 className="text-sm font-serif font-bold text-[#191614]">{PLANS.royal_suite.name}</h3>
                  <p className="text-[11px] text-[#6B655E] mt-1 leading-snug">
                    Everything in Classic + downloadable 1080p video + unlimited RSVPs + wax-seal envelope.
                  </p>
                  <div className="mt-3 pt-3 border-t border-[#EFE8DD] space-y-1">
                    <div className="text-[10px] text-[#4A453F] flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#2F6B4F]" />
                      <span>Download the 1080p video (9:16, 1:1, 16:9)</span>
                    </div>
                    <div className="text-[10px] text-[#4A453F] flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#2F6B4F]" />
                      <span>Wax-seal envelope your guests break open</span>
                    </div>
                    <div className="text-[10px] text-[#4A453F] flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#2F6B4F]" />
                      <span>Unlimited guests &amp; RSVPs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods: Razorpay collects the actual details in its own secure window */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B655E] block mb-2">
                  Pay with
                </span>
                <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {METHODS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === id}
                      onClick={() => setPaymentMethod(id)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === id
                          ? 'bg-[#191614] text-white border-[#191614]'
                          : 'bg-white text-[#6B655E] border-[#E8E2D8] hover:border-[#191614]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-[#6B655E]">
                  {METHODS.find((m) => m.id === paymentMethod)?.hint}
                </p>
              </div>

              {config && !config.serverUp && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] leading-relaxed text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Payments are unavailable right now because our server can’t be reached. Nothing has been charged. Please try again in a few minutes.</span>
                </div>
              )}

              {config?.serverUp && !config.enabled && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Demo mode.</strong> No payment keys are configured, so checkout is simulated and nothing is charged.
                  </span>
                </div>
              )}

              {/* Coupon Code Input */}
              <div className="bg-white rounded-2xl p-3 border border-[#E8E2D8] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. ROYAL50)"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponStatus('none'); // an edited code is unverified until applied again
                  }}
                  className="flex-1 text-xs bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg px-3 py-2 outline-none uppercase font-mono"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="px-3 py-2 bg-[#191614] hover:bg-[#B38B45] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {couponStatus === 'valid' && (
                <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 flex items-center justify-between">
                  <span>Code {quote?.coupon} applied</span>
                  <span className="font-bold">-₹{discount}</span>
                </div>
              )}

              {couponStatus === 'invalid' && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                  {!config?.serverUp ? 'Coupons need the payment server.' : quote?.coupon ? 'You already have a better discount applied.' : 'That code isn’t valid.'}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="bg-white rounded-2xl p-4 border border-[#E8E2D8] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#6B655E]">
                  <span>Plan subtotal ({planName})</span>
                  <span className="font-mono">₹{basePrice}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-xs text-green-700">
                    <span>
                      {quote?.coupon === 'FRIEND' ? 'Friend discount (invited by another couple)' : quote?.coupon === 'CREDIT' ? 'Your referral credit' : 'Celebration discount'}
                    </span>
                    <span className="font-mono">-₹{discount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-[#6B655E]">
                  <span>Cloud Server Hosting &amp; Security</span>
                  <span className="text-green-700 font-medium">Free</span>
                </div>
                <div className="pt-2 border-t border-[#E8E2D8] flex items-center justify-between">
                  <span className="text-sm font-serif font-bold text-[#191614]">Total Payable</span>
                  <span className="text-xl font-serif font-bold text-[#191614]">₹{finalPrice}</span>
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing || !quote || !config?.serverUp || !live}
                className="w-full py-4 bg-[#191614] hover:bg-[#B38B45] text-white text-sm font-semibold tracking-wide uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{config?.enabled ? 'Waiting for payment…' : 'Processing…'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Pay ₹{finalPrice} {config?.enabled ? 'securely' : '(demo)'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-[#8E867C]">
                <Shield className="w-3.5 h-3.5 text-[#2F6B4F]" />
                <span>{config?.enabled ? 'Secured by Razorpay · PCI-DSS compliant · details never touch our servers' : 'Demo checkout · no payment details are collected'}</span>
              </div>
              <p className="text-center text-[10px] text-[#8E867C]">
                By paying you agree to our <a href="#/legal/terms" onClick={onClose} className="underline">Terms</a> and{' '}
                <a href="#/legal/refund" onClick={onClose} className="underline">Refund Policy</a>.
              </p>
            </>
          ) : (
            /* Success View */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 border border-green-300 text-green-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31]">
                  {result?.demo ? 'Demo payment completed' : 'Payment verified'}
                </span>
                <h3 className="text-2xl font-serif font-bold text-[#191614] mt-1">
                  Welcome to {result ? PLANS[result.plan].name : planName}!
                </h3>
                <p className="text-xs text-[#6B655E] mt-2 max-w-sm mx-auto">
                  Your plan is active on your live invitation. Share the link from the dashboard.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E8E2D8] max-w-sm mx-auto text-left space-y-1 text-xs">
                <div className="flex justify-between text-[#6B655E]">
                  <span>Invoice ID:</span>
                  <span className="font-mono font-bold text-[#191614]">{result?.invoiceId}</span>
                </div>
                <div className="flex justify-between text-[#6B655E]">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold text-[#191614]">₹{result?.amountInr}</span>
                </div>
                {!result?.demo && (
                  <div className="flex justify-between text-[#6B655E]">
                    <span>Payment ID:</span>
                    <span className="font-mono text-[#191614]">{result?.paymentId}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6B655E]">
                  <span>Status:</span>
                  <span className={`font-bold ${result?.demo ? 'text-amber-700' : 'text-green-700'}`}>{result?.demo ? 'Demo · not charged' : 'Paid & verified'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 bg-[#191614] hover:bg-[#B38B45] text-white text-xs font-semibold tracking-wide uppercase rounded-xl transition-colors cursor-pointer"
              >
                Continue to My Wedding Suite
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
