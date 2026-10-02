import React from 'react';
import { ArrowRight, Edit3, Share2, Wand2 } from 'lucide-react';
import { AppView } from '../../hooks/useWeddingState';

interface WorkflowSectionProps {
  setCurrentView: (view: AppView) => void;
}

const STEPS = [
  {
    icon: Wand2,
    title: 'Choose a design',
    body: 'Browse one-of-a-kind layouts, palettes and typefaces, each previewed with your own names. Switch any time without losing a detail.',
    meta: 'Two minutes',
  },
  {
    icon: Edit3,
    title: 'Tell us once',
    body: 'Names, families, every ceremony from Mehendi to Reception, venues, dress codes and photos, all in one guided form.',
    meta: 'Five minutes',
  },
  {
    icon: Share2,
    title: 'Share & celebrate',
    body: 'Send the website on WhatsApp, post the film to Stories, and watch RSVPs and meal counts arrive in your dashboard.',
    meta: 'The rest of your engagement',
  },
];

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ setCurrentView }) => (
  <section className="relative overflow-hidden border-t border-[#E8E2D8] bg-[#FAF8F5] py-24 sm:py-32">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto mb-20 max-w-2xl text-center">
        <p data-reveal className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8F6D31]">How it works</p>
        <h2 data-split className="font-serif text-4xl leading-tight text-[#191614] sm:text-6xl">
          From <em className="text-[#B38B45]">yes</em> to shared, in an evening.
        </h2>
      </div>

      <div className="relative">
        {/* The thread that ties the steps together: draws itself as you scroll, one bead per step */}
        <div aria-hidden className="relative mb-8 hidden h-16 md:block">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 64" preserveAspectRatio="none" fill="none">
            <path data-draw d="M200 32 C 330 -8, 470 72, 600 32 S 870 -8, 1000 32" stroke="#B38B45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          {['16.667%', '50%', '83.333%'].map((left, i) => (
            <span
              key={left}
              style={{ left }}
              className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#B38B45] bg-[#FAF8F5] font-serif text-sm text-[#8F6D31] shadow-[0_0_0_6px_#FAF8F5]"
            >
              {i + 1}
            </span>
          ))}
        </div>

        <ol data-stagger="0.15" className="relative grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body, meta }, i) => (
            <li key={title} data-spotlight className="group rounded-3xl border border-[#E8E2D8] bg-white/80 p-8 text-center backdrop-blur transition-colors hover:border-[#B38B45]">
              <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-[#E8E2D8] bg-[#FAF8F5] transition-colors duration-500 group-hover:border-[#B38B45] group-hover:bg-[#191614]">
                <Icon className="h-7 w-7 text-[#8F6D31] transition-colors duration-500 group-hover:text-[#E5CE9F]" />
                <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#B38B45] font-serif text-sm text-[#191614] md:hidden">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-serif text-2xl text-[#191614]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#6B655E]">{body}</p>
              <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-[#8F6D31]">{meta}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-16 text-center">
        <button
          data-magnetic
          onClick={() => setCurrentView('catalog')}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#191614] px-8 py-4 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#B38B45]"
        >
          Start with a design
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  </section>
);
