import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Monitor, Play, Smartphone, Volume2 } from 'lucide-react';
import { WeddingData } from '../../types/wedding';
import { TemplateDefinition } from '../../types/template';
import { AppView } from '../../hooks/useWeddingState';
import { InvitationSite } from '../templates/InvitationSite';
import { formatDate, resolveDesign } from '../../utils/design';
import { gsap, prefersReducedMotion } from '../../utils/gsap';

interface DualOutputSectionProps {
  weddingData: WeddingData;
  activeTemplate: TemplateDefinition;
  setCurrentView: (view: AppView) => void;
}

const COPY = {
  website: {
    eyebrow: 'Output one · Guest website',
    title: 'A living invitation guests actually use',
    body: 'No app to download. Guests open one link and get the countdown, every ceremony with dress codes, one-tap directions and calendar, and an RSVP that lands straight in your dashboard.',
    points: ['RSVP with party size, meals and which ceremonies', 'Add to calendar and Google Maps for every event', 'Edit anything later; the same link updates for everyone'],
    cta: 'Open the live website',
    view: 'invite-preview' as AppView,
  },
  video: {
    eyebrow: 'Output two · Motion video',
    title: 'A cinematic invite for Stories and WhatsApp',
    body: 'The same details become a scored, multi-scene film in 9:16, 1:1 or 16:9. Change the date or venue and the film re-renders itself.',
    points: ['Seven choreographed scenes from your details', 'Shehnai, sitar and piano scores', 'Story, square and widescreen formats'],
    cta: 'Open the video studio',
    view: 'video-maker' as AppView,
  },
};

export const DualOutputSection: React.FC<DualOutputSectionProps> = ({ weddingData, activeTemplate, setCurrentView }) => {
  const [tab, setTab] = useState<'website' | 'video'>('website');
  const panel = useRef<HTMLDivElement>(null);
  const design = useMemo(() => resolveDesign(activeTemplate, weddingData.customDesign), [activeTemplate, weddingData.customDesign]);
  const copy = COPY[tab];

  // Tab switch: copy and showcase slide in together.
  useLayoutEffect(() => {
    if (!panel.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.dual-copy > *', { autoAlpha: 0, x: -24, stagger: 0.06, duration: 0.8 });
      gsap.from('.dual-stage', { autoAlpha: 0, y: 30, scale: 0.97, duration: 1 });
    }, panel);
    return () => ctx.revert();
  }, [tab]);

  return (
    <section className="border-t border-[#E8E2D8] bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p data-reveal className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8F6D31]">Design once · data everywhere</p>
          <h2 data-split className="font-serif text-4xl leading-tight text-[#191614] sm:text-6xl">
            One set of details. <em className="text-[#B38B45]">Two</em> heirloom outputs.
          </h2>
        </div>

        <div data-reveal className="mb-12 flex justify-center">
          <div role="tablist" className="inline-flex rounded-full border border-[#E8E2D8] bg-[#FAF8F5] p-1.5">
            {(
              [
                ['website', 'Guest website', Monitor],
                ['video', 'Motion video', Smartphone],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  tab === id ? 'bg-[#191614] text-white shadow-md' : 'text-[#6B655E] hover:text-[#191614]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div ref={panel} className="grid items-center gap-12 lg:grid-cols-12">
          <div className="dual-copy space-y-5 lg:col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#8F6D31]">{copy.eyebrow}</p>
            <h3 className="font-serif text-3xl leading-tight text-[#191614] sm:text-4xl">{copy.title}</h3>
            <p className="leading-relaxed text-[#6B655E]">{copy.body}</p>
            <ul className="space-y-3 border-t border-[#E8E2D8] pt-5">
              {copy.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-[#191614]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B38B45]" />
                  {p}
                </li>
              ))}
            </ul>
            <button
              data-magnetic
              onClick={() => setCurrentView(copy.view)}
              className="mt-2 cursor-pointer rounded-full bg-[#191614] px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#B38B45]"
            >
              {copy.cta}
            </button>
          </div>

          <div className="dual-stage lg:col-span-7">
            {tab === 'website' ? (
              <div className="overflow-hidden rounded-2xl border border-[#E3D9C7] shadow-[0_40px_90px_-40px_rgb(60_40_10/0.45)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#EFE8DC] bg-[#FAF8F5] px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E5DFD4]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E5DFD4]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E5DFD4]" />
                  </div>
                  <span className="truncate font-mono text-[10px] text-[#8E867C]">{window.location.host}/invite/{weddingData.customSlug}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Live · scroll me</span>
                </div>
                <div className="h-[520px] overflow-y-auto overscroll-contain">
                  <InvitationSite weddingData={weddingData} design={design} />
                </div>
              </div>
            ) : (
              <MiniFilm weddingData={weddingData} accent={design.theme.secondary} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/** A looping four-scene teaser built from the couple's real data, same beats as the video studio. */
const MiniFilm: React.FC<{ weddingData: WeddingData; accent: string }> = ({ weddingData, accent }) => {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.film-bg', { scale: 1.25 }, { scale: 1, duration: 16, ease: 'none', repeat: -1, yoyo: true });
      const tl = gsap.timeline({ repeat: -1 });
      gsap.utils.toArray<HTMLElement>('.film-scene').forEach((scene) => {
        tl.fromTo(scene.children, { autoAlpha: 0, y: 30, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', stagger: 0.15, duration: 1.1 })
          .to(scene.children, { autoAlpha: 0, y: -20, filter: 'blur(6px)', stagger: 0.06, duration: 0.7, ease: 'power2.in' }, '+=1.6');
      });
      tl.eventCallback('onUpdate', () => gsap.set('.film-progress', { scaleX: tl.progress() }));
    }, root);
    return () => ctx.revert();
  }, []);

  const { partner1: a, partner2: b } = weddingData;
  const still = prefersReducedMotion(); // no loop: show the names scene as a poster frame
  return (
    <div ref={root} className="flex justify-center">
      <div className="w-[300px] rounded-[40px] border border-[#3A332C] bg-[#15120F] p-2.5 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.6)] sm:w-[330px]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[32px] bg-black text-center text-white">
          <img src={weddingData.coverPhotoUrl || undefined} alt="" className={`film-bg absolute inset-0 h-full w-full object-cover opacity-60 ${weddingData.coverPhotoUrl ? '' : 'hidden'}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/50" />
          <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/70">
            <span>9:16 · Story</span>
            <span className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" /> Shehnai
            </span>
          </div>

          {[
            [<p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: accent }}>Together with their families</p>, <p className="font-serif text-2xl italic">we invite you</p>],
            [<p className="font-serif text-4xl leading-tight">{a.shortName}</p>, <p className="font-serif text-2xl italic" style={{ color: accent }}>&amp;</p>, <p className="font-serif text-4xl leading-tight">{b.shortName}</p>],
            [<p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: accent }}>Save the date</p>, <p className="font-serif text-3xl">{formatDate(weddingData.weddingDate)}</p>, <p className="text-xs text-white/70">{weddingData.mainVenue}</p>],
            [<p className="font-serif text-3xl">Kindly RSVP</p>, <p className="text-xs text-white/70">{window.location.host}/invite/{weddingData.customSlug}</p>],
          ].map((lines, i) => (
            <div key={i} className="film-scene absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
              {lines.map((line, j) => (
                <div key={j} style={still && i === 1 ? undefined : { visibility: 'hidden' }}>
                  {line}
                </div>
              ))}
            </div>
          ))}

          <div className="absolute inset-x-5 bottom-5 space-y-3">
            <div className="h-0.5 overflow-hidden rounded-full bg-white/20">
              <div className="film-progress h-full origin-left scale-x-0" style={{ backgroundColor: accent }} />
            </div>
            <p className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-white/60">
              <Play className="h-3 w-3 fill-current" /> Auto-generated from your details
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
