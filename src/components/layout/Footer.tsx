import React from 'react';
import { SITE } from '../../../site.config';
import { AppView } from '../../hooks/useWeddingState';
import { Heart } from 'lucide-react';
import { LEGAL_SECTIONS } from '../legal/LegalPage';

interface FooterProps {
  setCurrentView: (view: AppView) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentView }) => {
  return (
    <footer className="border-t border-[#E8E2D8] bg-[#FAF8F5] pt-14 pb-12 text-[#6B655E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <span className="text-2xl font-serif text-[#191614] block">{SITE.name}</span>
            <p className="text-sm leading-relaxed text-[#6B655E]">{SITE.footerBlurb}</p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#191614] mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="hover:text-[#191614] transition-colors"
                >
                  1,900+ Wedding Templates
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('invite-preview')}
                  className="hover:text-[#191614] transition-colors"
                >
                  Interactive Wedding Website
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('video-maker')}
                  className="hover:text-[#191614] transition-colors"
                >
                  Animated Video Invitation
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="hover:text-[#191614] transition-colors"
                >
                  Live RSVP Guest Tracker
                </button>
              </li>
            </ul>
          </div>

          {/* Regional Traditions */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#191614] mb-4">
              Traditions & Styles
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="hover:text-[#191614] transition-colors"
                >
                  Royal Rajputana & Udaipur
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="hover:text-[#191614] transition-colors"
                >
                  Sikh Anand Karaj & Sangeet
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="hover:text-[#191614] transition-colors"
                >
                  South Indian Temple & Kanjivaram
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('catalog')}
                  className="hover:text-[#191614] transition-colors"
                >
                  Contemporary Minimal & Floral
                </button>
              </li>
            </ul>
          </div>

          {/* Promise */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#191614]">
              Design Promise
            </h4>
            <p className="text-sm leading-relaxed text-[#6B655E]">
              Zero clip-art slop. Every template is crafted with authentic Indian cultural depth,
              hand-tuned typography tokens, and effortless WhatsApp sharing.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#E8E2D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} {SITE.business.legalName}. All rights reserved.</p>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {LEGAL_SECTIONS.map(([id, label]) => (
              <a key={id} href={`#/legal/${id}`} className="hover:text-[#191614] transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1 text-[#6B655E]">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-[#B38B45] fill-current" />
            <span>for timeless celebrations worldwide.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
