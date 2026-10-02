import React, { useLayoutEffect, useRef, useState } from 'react';
import { SITE } from '../../../site.config';
import { CLASSIC, ENTITLEMENTS, inr, limit, REFERRAL_DISCOUNT_INR, REFERRER_CREDIT_INR, ROYAL } from '../../data/pricing';

const [FREE, CLASSIC_E, ROYAL_E] = [ENTITLEMENTS.free, ENTITLEMENTS.digital_classic, ENTITLEMENTS.royal_suite];
import { gsap, prefersReducedMotion } from '../../utils/gsap';
import { AppView } from '../../hooks/useWeddingState';
import { Check, ChevronDown, Sparkles, ArrowRight } from 'lucide-react';
import { DividerOrnament } from '../common/Motifs';

interface SocialProofPricingProps {
  setCurrentView: (view: AppView) => void;
  onOpenCheckout?: (plan?: 'digital_classic' | 'royal_suite') => void;
}

export const SocialProofPricing: React.FC<SocialProofPricingProps> = ({ 
  setCurrentView,
  onOpenCheckout,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // What the product does in practice. No invented couples or review counts: add real testimonials as they arrive.
  const useCases = [
    {
      title: 'One link on WhatsApp, every RSVP in one place',
      body: 'Guests tap the link, reply in under a minute, and you see names, party sizes and meal choices (veg, Jain, vegan, non-veg) in your dashboard, ready to export for the caterer.',
      tag: 'RSVP & catering',
    },
    {
      title: 'A 9:16 video for WhatsApp Status and Reels',
      body: 'Your names, dates, ceremonies and photos become a 1080p animated invitation with music, in all three formats, rendered in your browser in under a minute.',
      tag: 'Video invitation',
    },
    {
      title: 'Plans change, the link stays the same',
      body: 'Mehendi moved indoors? Edit it once. The live website updates for every guest instantly, with no reprinting and no second round of messages.',
      tag: 'Live updates',
    },
  ];

  const pricingTiers = [
    {
      name: 'Free Experience',
      tagline: 'Design and publish your invitation for free',
      price: '₹0',
      period: 'No card needed',
      highlighted: false,
      features: [
        'All 1,900+ templates and the full design customizer',
        'Publish a live invitation link',
        `Guest list of ${limit(FREE.guestList)} with personal WhatsApp links`,
        `Guest RSVPs (first ${limit(FREE.visibleRsvps)} visible)`,
        'Video preview',
        `Small “Made with ${SITE.name}” credit`,
      ],
      cta: 'Start free',
      view: 'onboarding' as AppView,
    },
    {
      name: `${CLASSIC.name} Website`,
      tagline: 'Complete interactive wedding website with live RSVP tracking',
      plan: 'digital_classic' as const,
      price: inr(CLASSIC.priceInr),
      period: 'One-time, per wedding',
      highlighted: false,
      features: [
        `Everything in Free, without ${SITE.name} branding`,
        `Guest list of ${limit(CLASSIC_E.guestList)}: send everyone on WhatsApp in one tap each`,
        'See who opened the invitation, remind only who hasn’t replied',
        'Email invitations & reminders',
        'Instagram story & post, WhatsApp status and square invitation images for every ceremony',
        `See up to ${limit(CLASSIC_E.visibleRsvps)} guest RSVPs with meal & dietary preferences`,
        'CSV export for your caterer',
        'Printable QR code for physical cards',
        'Maps directions & add-to-calendar for every ceremony',
        'Edit anytime: the live site updates instantly',
      ],
      cta: `Choose ${CLASSIC.name} (${inr(CLASSIC.priceInr)})`,
      view: 'onboarding' as AppView,
    },
    {
      name: ROYAL.name,
      tagline: 'Website + 1080p Animated Video + Unlimited RSVPs + Wax Seal',
      plan: 'royal_suite' as const,
      price: inr(ROYAL.priceInr),
      period: 'One-time, per wedding',
      highlighted: true,
      features: [
        `Everything in ${CLASSIC.name} (${inr(CLASSIC.priceInr)}) included`,
        'Download your 1080p animated video (9:16, 1:1, 16:9)',
        `${ROYAL_E.guestList === Infinity ? 'Unlimited' : limit(ROYAL_E.guestList)} guest list and ${limit(ROYAL_E.visibleRsvps)} RSVPs`,
        'Wax-seal envelope guests break open',
        'Choice of 5 original soundtracks, free to share',
      ],
      cta: `Get ${ROYAL.name} (${inr(ROYAL.priceInr)})`,
      view: 'onboarding' as AppView,
    },
  ];


  const faqs = [
    {
      q: 'Do my guests need to download an app to open the invitation?',
      a: 'No app is needed. Guests tap the link on WhatsApp, SMS or Instagram and the invitation opens in their phone browser.',
    },
    {
      q: 'What happens if our wedding date, venue, or timings change?',
      a: 'You can update your wedding details anytime from your dashboard. The changes reflect immediately on your live website link without needing to re-send or reprint anything.',
    },
    {
      q: 'How do we send the invitation to all our guests?',
      a: 'Paste your guest list (from Excel, Google Sheets or your phone contacts). Every family gets a private link that greets them by name. Tap “Send invitations” and WhatsApp opens with each guest’s personal message ready: one tap per guest, no WhatsApp Business account needed. Paid plans can also email everyone at once. Your dashboard shows who opened it and lets you remind only the ones who haven’t replied.',
    },
    {
      q: 'Do I get anything for telling friends?',
      a: `Yes. Share your referral link from the dashboard: couples who join through it get ${inr(REFERRAL_DISCOUNT_INR)} off, and you get ${inr(REFERRER_CREDIT_INR)} credit towards your own plan for each one who upgrades.`,
    },
    {
      q: 'Can we generate both an animated video and a website?',
      a: `Yes! That is the core architecture of ${SITE.name}. You enter your wedding details once, and the system automatically creates both a responsive guest website and an animated motion video in 9:16 Story, 1:1 Square, and 16:9 Cinema formats.`,
    },
    {
      q: 'How does RSVP collection work?',
      a: `Guests fill in their names, party size, and meal preference (Vegetarian, Jain, Vegan, Non-Vegetarian) on your website. Every reply is saved to your private dashboard. The free plan shows the first ${limit(FREE.visibleRsvps)}; paid plans show ${limit(CLASSIC_E.visibleRsvps)} or ${limit(ROYAL_E.visibleRsvps)}, including replies that arrived before you upgraded.`,
    },
    {
      q: 'Can we use the music on Instagram and WhatsApp?',
      a: `Yes. The soundtracks are original music generated by ${SITE.name} itself, so there is no third-party copyright and nothing will be muted.`,
    },
  ];

  return (
    <section className="py-24 bg-[#FAF8F5] border-t border-[#E8E2D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* How couples use it */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-2">
            Built For Indian Weddings
          </span>
          <h2 data-split className="text-4xl sm:text-6xl font-serif text-[#191614] mb-4">
            Less chasing, more celebrating
          </h2>
          <DividerOrnament color="#B38B45" className="my-6" />
        </div>

        <div data-stagger="0.12" className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {useCases.map((u) => (
            <div key={u.title} data-spotlight className="p-8 rounded-3xl bg-white border border-[#E8E2D8] shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8F6D31]">{u.tag}</span>
              <h3 className="mt-3 text-xl font-serif font-semibold text-[#191614]">{u.title}</h3>
              <p className="mt-3 text-sm text-[#4A4540] leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>

        {/* Pricing Table */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-2">
            Transparent Pricing
          </span>
          <h2 data-split className="text-4xl sm:text-6xl font-serif text-[#191614] mb-4">
            One Simple Investment
          </h2>
          <p className="text-base text-[#6B655E]">
            No recurring monthly subscription surprises. Pay once per wedding and enjoy luxury
            hosting and video generation.
          </p>
          <DividerOrnament color="#B38B45" className="my-6" />
        </div>

        <div data-stagger="0.12" className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 items-stretch">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              data-tilt={tier.highlighted ? '' : undefined}
              data-spotlight={tier.highlighted ? undefined : ''}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-shadow ${
                tier.highlighted
                  ? 'bg-[#191614] text-white shadow-[0_40px_80px_-30px_rgb(25_22_20/0.7)] md:-my-4 md:py-12'
                  : 'bg-white text-[#191614] border border-[#E8E2D8] shadow-sm hover:shadow-lg'
              }`}
            >
              {tier.highlighted && (
                <span aria-hidden className="gold-sheen gold-border pointer-events-none absolute inset-0 rounded-3xl" />
              )}
              <div>
                {tier.highlighted && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 bg-[#B38B45] text-white rounded mb-4 inline-block">
                    Most Popular Choice
                  </span>
                )}
                <h3 className="text-2xl font-serif font-semibold mb-2">{tier.name}</h3>
                <p
                  className={`text-xs mb-6 ${
                    tier.highlighted ? 'text-white/70' : 'text-[#6B655E]'
                  }`}
                >
                  {tier.tagline}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-serif font-bold tabular-nums">{tier.price}</span>
                  <span
                    className={`text-xs ml-2 ${
                      tier.highlighted ? 'text-white/60' : 'text-[#8E867C]'
                    }`}
                  >
                    {tier.period}
                  </span>
                </div>

                <div className="space-y-3 pt-4 border-t border-current/10 mb-8">
                  {tier.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          tier.highlighted ? 'text-[#C9A45C]' : 'text-[#B38B45]'
                        }`}
                      />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                data-magnetic
                onClick={() => {
                  if ('plan' in tier && onOpenCheckout) {
                    onOpenCheckout(tier.plan);
                  } else {
                    setCurrentView(tier.view);
                  }
                }}
                className={`w-full py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 ${
                  tier.highlighted
                    ? 'bg-[#B38B45] hover:bg-[#9c7835] text-[#191614]'
                    : 'bg-[#191614] hover:bg-[#B38B45] text-white'
                }`}
              >
                {tier.highlighted && <Sparkles className="w-3.5 h-3.5 text-[#191614]" />}
                <span>{tier.cta}</span>
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-2">
              Got Questions?
            </span>
            <h2 data-split className="text-3xl sm:text-5xl font-serif text-[#191614]">
              Frequently Asked Questions
            </h2>
          </div>

          <div data-stagger="0.06" className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E8E2D8] bg-white overflow-hidden shadow-sm"
                >
                  <button
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between text-sm font-semibold text-[#191614] hover:text-[#B38B45] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-[#8E867C] transition-transform duration-500 ${isOpen ? 'rotate-180 text-[#B38B45]' : ''}`} />
                  </button>
                  <FaqAnswer open={isOpen}>{faq.a}</FaqAnswer>
                </div>
              );
            })}
          </div>
        </div>

        {/* Final CTA Strip */}
        <div data-reveal="scale" className="mt-24 p-10 sm:p-16 rounded-[2rem] bg-[#191614] text-white text-center relative overflow-hidden shadow-2xl">
          <div aria-hidden data-parallax="-0.2" className="pointer-events-none absolute inset-x-0 -bottom-1/2 h-full bg-[radial-gradient(ellipse_at_center,rgb(179_139_69/0.35),transparent_65%)]" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C9A45C]">
              Begin Your Forever Story
            </span>
            <h2 data-split className="text-4xl sm:text-6xl font-serif">
              Ready to create your royal wedding invitation?
            </h2>
            <p className="text-sm text-white/70">
              Start free. Publish in minutes. Upgrade only when your guests start replying.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                data-magnetic
                onClick={() => setCurrentView('onboarding')}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#B38B45] hover:bg-[#8F6D31] text-[#191614] text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Create My Invitation Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentView('catalog')}
                className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all border border-white/20"
              >
                Browse the designs
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/** Accordion body that animates its real height instead of popping in. */
const FaqAnswer: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [initiallyOpen] = useState(open); // inline style must not change, or React fights GSAP
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { height: open ? 'auto' : 0, autoAlpha: open ? 1 : 0 });
      return;
    }
    gsap.to(el, { height: open ? 'auto' : 0, autoAlpha: open ? 1 : 0, duration: 0.6, ease: 'expo.out', overwrite: true });
  }, [open]);
  return (
    <div ref={ref} className="overflow-hidden" style={{ height: initiallyOpen ? 'auto' : 0, visibility: initiallyOpen ? 'visible' : 'hidden' }}>
      <div className="px-5 pb-5 pt-3 text-sm leading-relaxed text-[#6B655E] border-t border-[#E8E2D8]/50">{children}</div>
    </div>
  );
};
