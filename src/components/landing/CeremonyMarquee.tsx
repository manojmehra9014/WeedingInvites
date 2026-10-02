import React, { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../utils/gsap';

const ROWS = [
  ['Pheras', 'Nikah', 'Anand Karaj', 'Church Vows', 'Saptapadi', 'Varmala', 'Kanyadaan'],
  ['Mehendi', 'Haldi', 'Sangeet', 'Cocktail', 'Reception', 'Save the Date', 'Gaye Holud'],
];

/** Two ceremony ribbons drifting in opposite directions; scrolling speeds them up (and reverses them). */
export const CeremonyMarquee: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const loops = gsap.utils.toArray<HTMLElement>('.marquee-track').map((track, i) =>
        gsap.to(track, { xPercent: i % 2 ? 0 : -50, startAt: { xPercent: i % 2 ? -50 : 0 }, duration: 38, ease: 'none', repeat: -1 }),
      );
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const boost = gsap.utils.clamp(-6, 6, self.getVelocity() / 300);
          loops.forEach((loop) =>
            gsap.to(loop, { timeScale: boost || 1, duration: 0.25, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: 1, duration: 1.2 }) }),
          );
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} aria-hidden className="select-none overflow-hidden border-y border-[#E8E2D8] bg-[#191614] py-5 text-[#E5CE9F]">
      {ROWS.map((row, r) => (
        <div key={r} className={`marquee-track flex w-max whitespace-nowrap ${r ? 'mt-2 text-white/35' : ''}`}>
          {[...row, ...row, ...row, ...row].map((word, i) => (
            <span key={i} className={`flex items-center font-serif ${r ? 'text-2xl sm:text-3xl' : 'text-3xl italic sm:text-5xl'}`}>
              <span className="px-6 sm:px-10">{word}</span>
              <span className="h-1.5 w-1.5 rotate-45 bg-[#B38B45]" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
