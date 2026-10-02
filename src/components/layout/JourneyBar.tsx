import React, { useLayoutEffect, useRef } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { AppView } from '../../hooks/useWeddingState';
import { gsap } from '../../utils/gsap';

// The product flow, end to end. Every app view is one step; landing sits outside it.
export const JOURNEY: { view: AppView; label: string; short: string; next: string }[] = [
  { view: 'catalog', label: 'Choose a design', short: 'Design', next: 'Add your details' },
  { view: 'onboarding', label: 'Add your details', short: 'Details', next: 'Preview your website' },
  { view: 'invite-preview', label: 'Preview your website', short: 'Website', next: 'Make your video' },
  { view: 'video-maker', label: 'Make your video', short: 'Video', next: 'Share & track RSVPs' },
  { view: 'dashboard', label: 'Share & track RSVPs', short: 'Share', next: '' },
];

interface JourneyBarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export const JourneyBar: React.FC<JourneyBarProps> = ({ currentView, setCurrentView }) => {
  const index = JOURNEY.findIndex((s) => s.view === currentView);
  const fill = useRef<HTMLDivElement>(null);
  const dark = currentView === 'invite-preview' || currentView === 'video-maker';

  useLayoutEffect(() => {
    if (!fill.current) return;
    gsap.to(fill.current, { scaleX: index / (JOURNEY.length - 1), duration: 1.1 });
  }, [index]);

  if (index < 0) return null;
  const step = JOURNEY[index];
  const next = JOURNEY[index + 1];

  return (
    <nav
      aria-label="Your invitation journey"
      className={`border-b ${dark ? 'bg-[#0F0D0B] border-white/10 text-white' : 'bg-white border-[#E8E2D8] text-[#191614]'}`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Compact label on phones */}
        <p className="text-xs sm:hidden">
          <span className={dark ? 'text-white/50' : 'text-[#8E867C]'}>
            Step {index + 1}/{JOURNEY.length} ·
          </span>{' '}
          <strong className="font-semibold">{step.label}</strong>
        </p>

        <ol className="relative hidden flex-1 items-center justify-between sm:flex">
          <div className={`absolute inset-x-3 top-3 h-px ${dark ? 'bg-white/15' : 'bg-[#E8E2D8]'}`} />
          <div ref={fill} className="absolute inset-x-3 top-3 h-px origin-left scale-x-0 bg-[#B38B45]" />
          {JOURNEY.map((s, i) => {
            const done = i < index;
            const active = i === index;
            return (
              <li key={s.view} className="relative z-10">
                <button
                  onClick={() => setCurrentView(s.view)}
                  aria-current={active ? 'step' : undefined}
                  className="group flex cursor-pointer flex-col items-center gap-1.5"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-500 ${
                      active
                        ? 'scale-110 border-[#B38B45] bg-[#B38B45] text-[#191614] shadow-[0_0_0_4px_rgb(179_139_69/0.2)]'
                        : done
                          ? 'border-[#B38B45] bg-[#B38B45]/15 text-[#B38B45]'
                          : dark
                            ? 'border-white/20 bg-[#0F0D0B] text-white/50 group-hover:border-white/50'
                            : 'border-[#DCD3C6] bg-white text-[#8E867C] group-hover:border-[#B38B45]'
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span
                    className={`text-[11px] tracking-wide transition-colors ${
                      active ? 'font-semibold' : dark ? 'text-white/50 group-hover:text-white' : 'text-[#8E867C] group-hover:text-[#191614]'
                    }`}
                  >
                    <span className="hidden lg:inline">{s.label}</span>
                    <span className="lg:hidden">{s.short}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {next && (
          <button
            onClick={() => setCurrentView(next.view)}
            className="group ml-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#B38B45] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#191614] transition-colors hover:bg-[#C9A45C] sm:ml-6"
          >
            <span className="hidden sm:inline">Next:</span> {step.next}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </nav>
  );
};
