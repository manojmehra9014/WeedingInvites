import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppView } from '../../hooks/useWeddingState';
import { WeddingData } from '../../types/wedding';
import { TemplateDefinition } from '../../types/template';
import { TemplateThumbnail } from '../templates/TemplateThumbnail';
import { pickShowcase } from '../../data/templatesCatalog';
import { LAYOUT_OPTIONS } from '../../data/designOptions';
import { gsap } from '../../utils/gsap';

interface TemplateReelProps {
  weddingData: WeddingData;
  allTemplates: TemplateDefinition[];
  selectTemplate: (id: string) => void;
  setCurrentView: (view: AppView) => void;
}

/** Pinned horizontal gallery on desktop (scroll drives it); native swipe with snap on touch. */
export const TemplateReel: React.FC<TemplateReelProps> = ({ weddingData, allTemplates, selectTemplate, setCurrentView }) => {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  // The hero shows the first four picks; the reel continues where it left off so nothing repeats.
  const picks = useMemo(() => pickShowcase(allTemplates, 12).slice(4), [allTemplates]);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const el = track.current!;
      const distance = () => el.scrollWidth - window.innerWidth;
      const scroll = gsap.to(el, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      // Each card straightens and lifts as it travels through the viewport.
      gsap.utils.toArray<HTMLElement>('.reel-card', el).forEach((card) => {
        gsap.fromTo(
          card,
          { rotation: 3, y: 40, scale: 0.94 },
          {
            rotation: 0,
            y: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: scroll, start: 'left right', end: 'left 55%', scrub: true },
          },
        );
      });
    });
    return () => mm.revert();
  }, [picks]);

  const use = (id: string) => {
    selectTemplate(id);
    setCurrentView('invite-preview');
  };

  return (
    <section ref={root} className="overflow-hidden bg-[#FAF8F5] py-20 lg:flex lg:h-screen lg:items-center lg:py-0">
      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 sm:px-6 lg:w-max lg:snap-none lg:gap-10 lg:overflow-visible lg:px-[8vw] lg:pb-0"
      >
        <div className="flex w-[82vw] max-w-md shrink-0 snap-start flex-col justify-center lg:w-[30vw]">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8F6D31]">The collection</p>
          <h2 data-split className="font-serif text-5xl leading-[1.02] text-[#191614] lg:text-7xl">
            {allTemplates.length.toLocaleString('en-IN')} designs.
            <br />
            <em className="text-[#B38B45]">Not one repeated.</em>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#6B655E]">
            Every design is its own pairing of layout, palette and typography, shown here with your names. Scroll to browse.
          </p>
          <button
            data-magnetic
            onClick={() => setCurrentView('catalog')}
            className="group mt-8 flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[#191614] px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-[#191614] hover:text-white"
          >
            Browse the full collection
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {picks.map((t, i) => (
          <article
            key={t.id}
            className="reel-card group relative w-[78vw] max-w-[380px] shrink-0 snap-center overflow-hidden rounded-3xl border border-[#E8E2D8] bg-white shadow-[0_30px_60px_-35px_rgb(60_40_10/0.35)] lg:w-[26vw]"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <TemplateThumbnail template={t} weddingData={weddingData} renderWidth={820} />
              <span className="absolute left-4 top-4 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-transform duration-500 lg:translate-y-full lg:group-hover:translate-y-0">
                <button
                  onClick={() => use(t.id)}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white py-2.5 text-xs font-semibold uppercase tracking-wider text-[#191614]"
                >
                  Use this design <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="truncate font-serif text-lg text-[#191614]">{t.name}</h3>
                <p className="text-[11px] text-[#8E867C]">
                  {LAYOUT_OPTIONS.find((l) => l.id === t.layout)?.label} · {t.fonts.heading}
                </p>
              </div>
              <div className="flex shrink-0 -space-x-1.5">
                {[t.theme.primary, t.theme.secondary, t.theme.background].map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
