import React, { useLayoutEffect, useRef, useState } from 'react';
import { SITE } from '../../../site.config';
import { CLASSIC, inr, ROYAL } from '../../data/pricing';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../utils/gsap';
import { useGsapReveal } from '../../hooks/useGsapReveal';
import { AppView } from '../../hooks/useWeddingState';
import { Menu, X, Sparkles, ArrowRight, Eye, Video, CheckCircle, Compass, UserRound } from 'lucide-react';

interface TopNavProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  onOpenCheckout?: (plan?: 'digital_classic' | 'royal_suite') => void;
}

export const TopNav: React.FC<TopNavProps> = ({ currentView, setCurrentView, onOpenCheckout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  useGsapReveal(header); // magnetic CTA

  // Get out of the way while reading; come back the moment the visitor scrolls up.
  useLayoutEffect(() => {
    const el = header.current;
    if (!el || prefersReducedMotion()) return;
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const hide = self.direction === 1 && self.scroll() > 240;
        gsap.to(el, { yPercent: hide ? -100 : 0, duration: 0.45, ease: 'power3.out', overwrite: true });
      },
    });
    return () => {
      st.kill();
      gsap.set(el, { clearProps: 'transform' });
    };
  }, []);

  useLayoutEffect(() => {
    if (!mobileMenuOpen || !drawer.current || prefersReducedMotion()) return;
    const tween = gsap.from(drawer.current.children, { autoAlpha: 0, y: -12, stagger: 0.05, duration: 0.6 });
    return () => {
      tween.revert();
    };
  }, [mobileMenuOpen]);

  const navLinks: { label: string; view: AppView; icon: React.ReactNode }[] = [
    { label: 'Templates', view: 'catalog', icon: <Compass className="w-4 h-4" /> },
    { label: 'Live Invite', view: 'invite-preview', icon: <Eye className="w-4 h-4" /> },
    { label: 'Video Studio', view: 'video-maker', icon: <Video className="w-4 h-4" /> },
    { label: 'RSVP Hub', view: 'dashboard', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Sign in', view: 'account', icon: <UserRound className="w-4 h-4" /> },
  ];

  return (
    <header ref={header} className="sticky top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E2D8] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
        {/* Brand wordmark */}
        <button
          onClick={() => {
            setCurrentView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-2xl sm:text-3xl font-serif tracking-tight text-[#191614] hover:text-[#B38B45] transition-colors text-left focus-visible:outline-none flex items-center gap-2 cursor-pointer"
        >
          <span>{SITE.name}</span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B655E]">
          {navLinks.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.label}
                onClick={() => setCurrentView(item.view)}
                className={`transition-colors relative py-1 focus-visible:outline-none flex items-center gap-1.5 cursor-pointer ${
                  isActive ? 'text-[#191614] font-semibold' : 'hover:text-[#191614]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#B38B45] rounded-full" />
                )}
              </button>
            );
          })}
          {onOpenCheckout && (
            <button
              onClick={() => onOpenCheckout('royal_suite')}
              className="transition-colors py-1 hover:text-[#191614] flex items-center gap-1 text-[#8F6D31] font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pricing ({inr(CLASSIC.priceInr)}/{inr(ROYAL.priceInr)})</span>
            </button>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {onOpenCheckout && (
            <button
              onClick={() => onOpenCheckout('royal_suite')}
              className="px-3.5 py-2 text-xs font-semibold text-[#8F6D31] bg-[#FFF8EC] border border-[#E8D9B8] hover:border-[#B38B45] transition-colors rounded-lg flex items-center gap-1.5 whitespace-nowrap min-h-[44px] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B38B45]" />
              <span>Plans {inr(CLASSIC.priceInr)} / {inr(ROYAL.priceInr)}</span>
            </button>
          )}

          {currentView !== 'onboarding' ? (
            <button
              data-magnetic
              onClick={() => setCurrentView('onboarding')}
              className="px-5 py-2.5 text-xs font-semibold tracking-wide uppercase text-white bg-[#191614] hover:bg-[#B38B45] transition-colors rounded-full shadow-sm flex items-center gap-2 whitespace-nowrap min-h-[44px] cursor-pointer"
            >
              <span>Create Invitation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentView('invite-preview')}
              className="px-5 py-2.5 text-xs font-semibold tracking-wide uppercase text-[#191614] bg-[#FAF8F5] border border-[#191614]/20 hover:border-[#191614] transition-colors rounded-lg whitespace-nowrap min-h-[44px] cursor-pointer"
            >
              View Preview
            </button>
          )}
        </div>

        {/* Mobile quick actions & hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {currentView !== 'onboarding' && (
            <button
              onClick={() => setCurrentView('onboarding')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#191614] rounded-lg min-h-[38px] active:scale-95 transition-transform"
            >
              Create
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#191614] hover:text-[#B38B45] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div ref={drawer} className="sm:hidden border-b border-[#E8E2D8] bg-[#FAF8F5] px-4 pt-3 pb-6 space-y-2 shadow-lg">
          {navLinks.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.label}
                onClick={() => {
                  setCurrentView(item.view);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left py-3 px-3 rounded-xl text-sm font-medium flex items-center justify-between transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-[#EFE8DD] text-[#191614] font-semibold'
                    : 'text-[#564F48] hover:bg-[#F3EFE9] hover:text-[#191614]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-[#B38B45]' : 'text-[#8E867C]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-[#B38B45]" />
                )}
              </button>
            );
          })}
          <div className="pt-2 border-t border-[#E8E2D8]">
            <button
              onClick={() => {
                setCurrentView('onboarding');
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 text-center text-xs font-semibold tracking-wider uppercase text-white bg-[#191614] hover:bg-[#B38B45] rounded-xl flex items-center justify-center gap-2 min-h-[46px] shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#C9A45C]" />
              <span>Create My Invitation</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
