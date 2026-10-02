import React, { useLayoutEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { gsap, prefersReducedMotion } from '../../utils/gsap';
import { WeddingData } from '../../types/wedding';
import { designVars, formatDate, ResolvedDesign } from '../../utils/design';
import { weddingAudio } from '../../utils/audioEngine';
import { DividerOrnament, DynamicArchRenderer, DynamicMotifRenderer, MandalaCornerSVG } from '../common/Motifs';

/** The sealed envelope a guest breaks to open the invitation. `onOpen` fires once the seal animation ends. */
export const WaxSealEnvelope: React.FC<{
  weddingData: WeddingData;
  design: ResolvedDesign;
  guestName?: string;
  onOpen: () => void;
}> = ({ weddingData, design, guestName, onOpen }) => {
  const { theme } = design;
  const ref = useRef<HTMLDivElement>(null);

  // Envelope arrives: the card rises, the seal drops in and breathes.
  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .from('.envelope-card', { autoAlpha: 0, y: 50, scale: 0.94, duration: 1.2 })
        .from('.envelope-card > :not(.envelope-decor)', { autoAlpha: 0, y: 16, stagger: 0.06, duration: 0.8 }, '-=0.8')
        .from('.wax-seal', { scale: 0, rotation: -120, duration: 1, ease: 'back.out(1.6)' }, '-=0.6');
    }, ref);
    return () => ctx.revert();
  }, []);

  const open = () => {
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: [theme.secondary, theme.primary, '#E5B84B'] });
      weddingAudio.playSealBreak();
    } catch {
      // Decoration only.
    }
    onOpen();
  };

  const breakSeal = () => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return open();
    // Seal bursts and spins away, the card lifts off, then the site takes over.
    gsap
      .timeline({ onComplete: open })
      .to(el.querySelector('.wax-seal'), { scale: 1.5, rotation: 200, autoAlpha: 0, duration: 0.7, ease: 'power3.in' })
      .to(el.querySelector('.envelope-card'), { y: -60, autoAlpha: 0, scale: 1.05, filter: 'blur(6px)', duration: 0.8, ease: 'power3.in' }, '-=0.35');
  };

  const p1 = weddingData.partner1.shortName;
  const p2 = weddingData.partner2.shortName;
  const metal = theme.secondary;
  // Foil: the theme's metal catching light across the letterforms.
  const foil = `linear-gradient(100deg, color-mix(in srgb, ${metal}, black 25%) 0%, color-mix(in srgb, ${metal}, white 55%) 38%, ${metal} 55%, color-mix(in srgb, ${metal}, black 30%) 100%)`;

  return (
    <div
      ref={ref}
      className="relative flex min-h-[640px] flex-col items-center justify-center overflow-hidden p-5 text-center font-sans sm:min-h-[760px] sm:p-12"
      style={{
        ...designVars(design),
        backgroundColor: theme.primary,
        backgroundImage: `radial-gradient(ellipse 70% 55% at 50% 38%, color-mix(in srgb, ${theme.primary}, white 12%), transparent 70%), radial-gradient(ellipse at 50% 120%, color-mix(in srgb, ${theme.primary}, black 45%), transparent 60%), ${JALI(metal)}`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-15">
        <DynamicArchRenderer archStyle={design.arch} color={metal} className="h-auto w-[120%] max-w-2xl" />
      </div>

      <div
        className="envelope-card relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-[28px] border px-7 py-10 sm:px-12 sm:py-14"
        style={{
          borderColor: metal,
          background: `linear-gradient(160deg, color-mix(in srgb, ${theme.primary}, white 7%), ${theme.primary} 45%, color-mix(in srgb, ${theme.primary}, black 18%))`,
          boxShadow: `0 40px 80px -30px rgba(0,0,0,0.7), 0 0 0 6px color-mix(in srgb, ${theme.primary}, black 20%), 0 0 0 7px color-mix(in srgb, ${metal}, transparent 55%), inset 0 1px 0 color-mix(in srgb, ${metal}, transparent 50%)`,
        }}
      >
        {/* Inner gilt rule and filigree corners */}
        <div className="envelope-decor pointer-events-none absolute inset-3 rounded-[20px] border" style={{ borderColor: `color-mix(in srgb, ${metal}, transparent 55%)` }} />
        {(['left-3 top-3', 'right-3 top-3 rotate-90', 'bottom-3 right-3 rotate-180', 'bottom-3 left-3 -rotate-90'] as const).map((pos) => (
          <MandalaCornerSVG key={pos} color={metal} className={`envelope-decor pointer-events-none absolute h-14 w-14 opacity-60 ${pos}`} />
        ))}

        {/* The mandala motif is drawn as a corner fan, so the centred crest uses the lotus instead. */}
        <DynamicMotifRenderer motif={design.motif === 'mandala' ? 'lotus' : design.motif} color={metal} className="h-9 w-9" />

        <span className="flex items-center gap-3 whitespace-nowrap font-serif text-[10px] font-semibold uppercase tracking-[0.3em] sm:text-[11px] sm:tracking-[0.35em]" style={{ color: metal }}>
          <span className="h-px w-5 sm:w-8" style={{ background: `linear-gradient(to right, transparent, ${metal})` }} />
          Wedding Invitation
          <span className="h-px w-5 sm:w-8" style={{ background: `linear-gradient(to left, transparent, ${metal})` }} />
        </span>

        <h2 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
          <span className="block bg-clip-text text-transparent" style={{ backgroundImage: foil }}>{p1}</span>
          <span className="my-1 block font-serif text-2xl italic sm:text-3xl" style={{ color: metal }}>&amp;</span>
          <span className="block bg-clip-text text-transparent" style={{ backgroundImage: foil }}>{p2}</span>
        </h2>

        <div className="space-y-1 text-white/80">
          {weddingData.weddingDate && <p className="text-[11px] font-medium uppercase tracking-[0.25em]">{formatDate(weddingData.weddingDate)}</p>}
          {weddingData.city && <p className="font-serif text-sm italic">{weddingData.city}</p>}
        </div>

        <DividerOrnament color={metal} className="my-0" />

        {guestName && (
          <div
            className="rounded-full border px-4 py-1.5 font-serif text-sm italic text-white/90"
            style={{ borderColor: `color-mix(in srgb, ${metal}, transparent 55%)`, backgroundColor: `color-mix(in srgb, ${metal}, transparent 85%)` }}
          >
            Specially prepared for <strong className="ml-1 text-white">{guestName}</strong>
          </div>
        )}

        <p className="max-w-xs font-serif text-sm italic leading-relaxed text-white/75">
          The families of {weddingData.partner1.name} and {weddingData.partner2.name} cordially invite you to celebrate their wedding.
        </p>

        <button onClick={breakSeal} className="wax-seal group relative mt-2 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label="Break the wax seal to open the invitation">
          <div className="absolute -inset-4 animate-pulse rounded-full opacity-40 blur-xl transition-opacity group-hover:opacity-80" style={{ backgroundColor: metal }} />
          {/* Poured wax: an irregular metallic disc with a pressed ring and embossed monogram. */}
          <svg viewBox="0 0 120 120" className="relative h-28 w-28 drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:scale-105 sm:h-32 sm:w-32">
            <defs>
              <radialGradient id="wax" cx="38%" cy="32%" r="75%">
                <stop offset="0%" stopColor={`color-mix(in srgb, ${metal}, white 55%)`} />
                <stop offset="45%" stopColor={metal} />
                <stop offset="100%" stopColor={`color-mix(in srgb, ${metal}, black 45%)`} />
              </radialGradient>
            </defs>
            <path d={WAX_EDGE} fill="url(#wax)" />
            <circle cx="60" cy="60" r="38" fill="none" stroke={`color-mix(in srgb, ${metal}, black 40%)`} strokeWidth="2.5" />
            <circle cx="60" cy="60" r="38" fill="none" stroke={`color-mix(in srgb, ${metal}, white 50%)`} strokeWidth="1" transform="translate(0.8 0.8)" opacity="0.7" />
            <text x="60" y="68" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="24" fontWeight="600" fill={`color-mix(in srgb, ${metal}, black 55%)`}>
              {p1[0]}&amp;{p2[0]}
            </text>
          </svg>
        </button>

        <span className="animate-bounce text-[11px] uppercase tracking-[0.3em] text-white/70">Tap the seal to open</span>
      </div>
    </div>
  );
};

// Poured-wax outline: 11 soft, uneven lobes joined by curves (fixed radii, so it never jitters).
const WAX_EDGE = (() => {
  const radii = [55, 51, 56, 52, 54, 50, 56, 53, 51, 55, 52];
  const pt = (i: number) => {
    const a = (i / radii.length) * Math.PI * 2;
    return [60 + radii[i % radii.length] * Math.cos(a), 60 + radii[i % radii.length] * Math.sin(a)];
  };
  const mid = (i: number) => pt(i).map((v, k) => (v + pt(i + 1)[k]) / 2);
  const f = (xy: number[]) => xy.map((v) => v.toFixed(1)).join(' ');
  return `M${f(mid(0))}` + radii.map((_, i) => ` Q${f(pt(i + 1))} ${f(mid(i + 1))}`).join('') + ' Z';
})();

// Faint jali lattice in the theme's metal, as a CSS background layer.
const JALI = (metal: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><path d='M24 2 L46 24 L24 46 L2 24 Z M24 12 L36 24 L24 36 L12 24 Z' fill='none' stroke='${metal}' stroke-opacity='0.09' stroke-width='1'/></svg>`,
  )}")`;
