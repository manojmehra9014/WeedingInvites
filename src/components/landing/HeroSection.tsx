import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { inr, PLANS } from '../../data/pricing';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AppView } from '../../hooks/useWeddingState';
import { WeddingData } from '../../types/wedding';
import { TemplateDefinition } from '../../types/template';
import { RoyalArchSVG, LotusMotifSVG } from '../common/Motifs';
import { TemplateThumbnail } from '../templates/TemplateThumbnail';
import { pickShowcase } from '../../data/templatesCatalog';
import { LAYOUT_OPTIONS } from '../../data/designOptions';
import { gsap, SplitText, prefersReducedMotion } from '../../utils/gsap';

interface HeroSectionProps {
  weddingData: WeddingData;
  allTemplates: TemplateDefinition[];
  setCurrentView: (view: AppView) => void;
}

const SLIDE_SECONDS = 4.5;

export const HeroSection: React.FC<HeroSectionProps> = ({ weddingData, allTemplates, setCurrentView }) => {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const showcase = useMemo(() => pickShowcase(allTemplates, 4), [allTemplates]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Intro choreography + ambient petals.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const split = SplitText.create('.hero-title', { type: 'lines,words,chars', mask: 'lines' });
      gsap
        .timeline({ delay: 0.15 })
        .from('.hero-kicker', { autoAlpha: 0, y: -12, duration: 0.8 })
        .from(split.chars, { yPercent: 120, duration: 1.2, stagger: 0.018 }, '-=0.5')
        .from('.hero-sub', { autoAlpha: 0, y: 20 }, '-=0.9')
        .from('.hero-cta > *', { autoAlpha: 0, y: 20, stagger: 0.1 }, '-=0.8')
        .from('.hero-trust > *', { autoAlpha: 0, y: 10, stagger: 0.06, duration: 0.8 }, '-=0.7')
        .from('.hero-browser', { autoAlpha: 0, y: 80, scale: 0.94, duration: 1.6 }, 0.4)
        .from('.hero-phone', { autoAlpha: 0, x: -60, y: 40, rotation: -8, duration: 1.6 }, 0.7)
        .from('.hero-pills > *', { autoAlpha: 0, y: 16, stagger: 0.08 }, 1.1);

      gsap.utils.toArray<HTMLElement>('.hero-petal').forEach((p, i) => {
        gsap.to(p, {
          y: '+=40',
          x: i % 2 ? '-=24' : '+=24',
          rotation: i % 2 ? -50 : 50,
          duration: 5 + (i % 3),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.3,
        });
      });

      // Phone drifts faster than the browser on scroll: cheap, convincing depth.
      gsap.to('.hero-phone', {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // Auto-advance the showcase unless the visitor is hovering it.
  useEffect(() => {
    if (paused || showcase.length < 2) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % showcase.length), SLIDE_SECONDS * 1000);
    return () => window.clearTimeout(t);
  }, [active, paused, showcase.length]);

  // Crossfade layers and run the story-style progress bar for the active slide.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    // Crossfade is never reverted: reverting would snap every layer back to slide 0 and flash it.
    el.querySelectorAll<HTMLElement>('[data-slide]').forEach((layer) => {
      const on = Number(layer.dataset.slide) === active;
      gsap.to(layer, { autoAlpha: on ? 1 : 0, scale: on ? 1 : 1.04, duration: 1.2, overwrite: true });
    });
    const fill = el.querySelector<HTMLElement>(`[data-pill-fill="${active}"]`);
    if (!fill) return;
    const tween = gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: SLIDE_SECONDS, ease: 'none', paused });
    return () => {
      tween.kill();
      gsap.set(fill, { clearProps: 'transform' }); // hand control back to the scale-x-* classes
    };
  }, [active, paused]);

  const current = showcase[active];

  return (
    <section
      ref={root}
      className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#F3E5C8_0%,#FAF8F5_55%)] pb-20 pt-10 sm:pb-28 sm:pt-16"
    >
      <div data-parallax="0.25" className="pointer-events-none absolute left-1/2 top-0 w-[900px] -translate-x-1/2 opacity-[0.14] md:w-[1300px]">
        <RoyalArchSVG color="#B38B45" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
        {['left-[5%] top-24', 'right-[7%] top-40', 'left-[42%] top-12', 'right-[30%] bottom-24', 'left-[12%] bottom-32'].map((pos, i) => (
          <span
            key={pos}
            className={`hero-petal absolute ${pos} h-3 w-2 rounded-[60%_40%_60%_40%] ${i % 2 ? 'bg-[#E09F3E]/35' : 'bg-[#B38B45]/30'}`}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10 lg:px-8">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <p className="hero-kicker mb-5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.3em] text-[#8F6D31] lg:justify-start">
            <LotusMotifSVG className="h-4 w-4" color="#B38B45" />
            Wedding website + video, from one form
          </p>
          <h1 className="hero-title font-serif text-[clamp(2.6rem,6vw,5.4rem)] leading-[1.02] tracking-tight text-[#191614]" style={{ textWrap: 'balance' }}>
            Your wedding deserves <em className="text-[#B38B45]">more</em> than a PDF.
          </h1>
          <p className="hero-sub mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#6B655E] sm:text-lg lg:mx-0">
            Pick one of {allTemplates.length.toLocaleString('en-IN')} one-of-a-kind designs, tell us about your celebrations once, and get a
            living wedding website and a cinematic video invitation, both ready for WhatsApp.
          </p>

          <div className="hero-cta mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <button
              data-magnetic
              onClick={() => setCurrentView('onboarding')}
              className="group flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[#191614] px-8 text-sm font-semibold tracking-wide text-white shadow-[0_18px_40px_-18px_rgb(25_22_20/0.7)] transition-colors hover:bg-[#2B2520] sm:w-auto"
            >
              Create my invitation
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              data-magnetic
              onClick={() => setCurrentView('catalog')}
              className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#D9CDB8] bg-white/70 px-7 text-sm font-semibold text-[#191614] backdrop-blur transition-colors hover:border-[#B38B45] sm:w-auto"
            >
              Explore{' '}
              <span data-counter={allTemplates.length} className="tabular-nums text-[#8F6D31]">
                {allTemplates.length.toLocaleString('en-IN')}
              </span>{' '}
              designs
            </button>
          </div>

          <ul className="hero-trust mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#6B655E] lg:justify-start">
            {['No design skills needed', 'One-tap WhatsApp sharing', 'Live RSVP & meal counts', `Free to start · from ${inr(PLANS.digital_classic.priceInr)} once`].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rotate-45 bg-[#B38B45]" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Live showcase: the real template engine, not a mock-up */}
        <div
          ref={stage}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          className="relative"
        >
          <div data-tilt className="hero-browser relative overflow-hidden rounded-2xl border border-[#E3D9C7] bg-white shadow-[0_50px_100px_-40px_rgb(60_40_10/0.45)]">
            <div className="flex items-center gap-3 border-b border-[#EFE8DC] bg-[#FAF8F5] px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5DFD4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5DFD4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5DFD4]" />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-[#EFE8DC] bg-white px-3 py-1 font-mono text-[10px] text-[#8E867C]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="truncate">{window.location.host}/invite/{weddingData.customSlug}</span>
              </div>
            </div>
            <div className="relative aspect-[16/11]">
              {showcase.map((t, i) => (
                <div
                  key={t.id}
                  data-slide={i}
                  className="absolute inset-0"
                  style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}
                >
                  <TemplateThumbnail template={t} weddingData={weddingData} />
                </div>
              ))}
            </div>
          </div>

          <div className="hero-phone absolute -bottom-10 -left-3 w-[30%] min-w-[118px] max-w-[190px] rounded-[26px] border border-[#3A332C] bg-[#15120F] p-1.5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] sm:-left-8">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[20px]">
              {showcase.map((t, i) => (
                <div
                  key={t.id}
                  data-slide={i}
                  className="absolute inset-0"
                  style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}
                >
                  <TemplateThumbnail template={t} weddingData={weddingData} renderWidth={390} />
                </div>
              ))}
            </div>
          </div>

          {current && (
            <div className="absolute -right-2 -top-4 flex items-center gap-2 rounded-full border border-[#E8E2D8] bg-white/90 px-3 py-1.5 text-[11px] shadow-lg backdrop-blur sm:-right-5">
              <Sparkles className="h-3.5 w-3.5 text-[#B38B45]" />
              <span className="font-semibold">{current.name}</span>
              <span className="text-[#8E867C]">· {current.fonts.heading}</span>
            </div>
          )}

          <div className="hero-pills mt-16 grid grid-cols-4 gap-2 sm:ml-[34%] sm:mt-6">
            {showcase.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActive(i)}
                className="group cursor-pointer text-left"
                aria-label={`Show ${t.name}`}
                aria-pressed={i === active}
              >
                <span className="block h-0.5 overflow-hidden rounded-full bg-[#E5DDCF]">
                  <span
                    data-pill-fill={i}
                    className={`block h-full origin-left bg-[#B38B45] ${i < active ? 'scale-x-100' : 'scale-x-0'}`}
                  />
                </span>
                <span
                  className={`mt-2 block truncate text-[10px] uppercase tracking-[0.18em] transition-colors ${
                    i === active ? 'font-semibold text-[#191614]' : 'text-[#8E867C] group-hover:text-[#191614]'
                  }`}
                >
                  {LAYOUT_OPTIONS.find((l) => l.id === t.layout)?.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
