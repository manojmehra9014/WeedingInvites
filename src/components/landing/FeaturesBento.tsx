import React from 'react';
import { SITE } from '../../../site.config';
import { AppView } from '../../hooks/useWeddingState';
import { 
  Share2, Calendar, Users, Film, Languages, RefreshCw, 
  MapPin, CheckCircle2, ShieldCheck, ArrowRight 
} from 'lucide-react';
import { DividerOrnament } from '../common/Motifs';

interface FeaturesBentoProps {
  setCurrentView: (view: AppView) => void;
}

export const FeaturesBento: React.FC<FeaturesBentoProps> = ({ setCurrentView }) => {
  return (
    <section className="py-24 bg-white border-t border-[#E8E2D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-2">
            Engineered for Modern Celebrations
          </span>
          <h2 data-split className="text-4xl sm:text-6xl font-serif text-[#191614] mb-4">
            Everything Your Wedding Needs
          </h2>
          <p className="text-base text-[#6B655E]">
            No messy spreadsheets, no expensive printers, and no broken links. A cohesive suite
            built to make hosting effortless for couples and families.
          </p>
          <DividerOrnament color="#B38B45" className="my-6" />
        </div>

        {/* Asymmetric Bento Grid */}
        <div data-stagger="0.1" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Card 1 (Span 2): WhatsApp First Sharing */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-[#FAF8F5] border border-[#E8E2D8] flex flex-col justify-between hover:border-[#B38B45] transition-colors" data-spotlight>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2D8] flex items-center justify-center text-[#B38B45] mb-5 shadow-sm">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                Zero Friction Guest Experience
              </span>
              <h3 className="text-2xl font-serif text-[#191614] mb-3">
                1-Tap WhatsApp Invites &amp; QR Codes
              </h3>
              <p className="text-sm text-[#6B655E] leading-relaxed max-w-xl mb-6">
                Over 90% of Indian wedding guests view invitations on WhatsApp. {SITE.name} generates
                custom rich link previews, personalized names, and ready-to-print QR codes for physical
                mithai boxes.
              </p>
            </div>

            <div className="pt-4 border-t border-[#E8E2D8] flex flex-wrap items-center gap-4 text-xs font-medium text-[#191614]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#B38B45]" />
                Rich OpenGraph Preview Cards
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#B38B45]" />
                Direct WhatsApp API Integration
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#B38B45]" />
                Print-Ready Vector QR Codes
              </span>
            </div>
          </div>

          {/* Bento Card 2: Live RSVP Tracker */}
          <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-[#E8E2D8] flex flex-col justify-between hover:border-[#B38B45] transition-colors" data-spotlight>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2D8] flex items-center justify-center text-[#B38B45] mb-5 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                Hospitality Command
              </span>
              <h3 className="text-2xl font-serif text-[#191614] mb-3">
                Live RSVP &amp; Meal Counts
              </h3>
              <p className="text-sm text-[#6B655E] leading-relaxed mb-4">
                Track exact attendance numbers, party sizes, and catering breakdowns (Pure Vegetarian,
                Jain, Non-Vegetarian) in real time with one-click CSV export for caterers.
              </p>
            </div>

            <button
              onClick={() => setCurrentView('dashboard')}
              className="text-xs font-semibold text-[#8F6D31] hover:text-[#191614] flex items-center gap-1.5 pt-4 border-t border-[#E8E2D8]"
            >
              <span>Explore Live RSVP Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bento Card 3: Multi-Event Dynamic Timeline */}
          <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-[#E8E2D8] flex flex-col justify-between hover:border-[#B38B45] transition-colors" data-spotlight>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2D8] flex items-center justify-center text-[#B38B45] mb-5 shadow-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                Multi-Day Itinerary
              </span>
              <h3 className="text-2xl font-serif text-[#191614] mb-3">
                1-Tap Calendar &amp; Maps
              </h3>
              <p className="text-sm text-[#6B655E] leading-relaxed">
                Whether you have 2 ceremonies or 7 multi-day events, guests can add each ceremony to
                Google Calendar or Apple iCal and launch turn-by-turn navigation with one tap.
              </p>
            </div>
          </div>

          {/* Bento Card 4: Animated Video Auto-Render */}
          <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-[#E8E2D8] flex flex-col justify-between hover:border-[#B38B45] transition-colors" data-spotlight>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2D8] flex items-center justify-center text-[#B38B45] mb-5 shadow-sm">
                <Film className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                Zero Video Editing
              </span>
              <h3 className="text-2xl font-serif text-[#191614] mb-3">
                Animated 9:16 Video Maker
              </h3>
              <p className="text-sm text-[#6B655E] leading-relaxed">
                The exact same wedding data automatically renders into a cinematic multi-scene motion
                invitation with authentic royal shehnai and classical sitar audio.
              </p>
            </div>
          </div>

          {/* Bento Card 5: Real-time Live Updates */}
          <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-[#E8E2D8] flex flex-col justify-between hover:border-[#B38B45] transition-colors" data-spotlight>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2D8] flex items-center justify-center text-[#B38B45] mb-5 shadow-sm">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                Dynamic Updates
              </span>
              <h3 className="text-2xl font-serif text-[#191614] mb-3">
                Never Reprint Again
              </h3>
              <p className="text-sm text-[#6B655E] leading-relaxed">
                Sangeet timings shifted by an hour? Weather changed the courtyard venue? Update your
                details once and all guests instantly see the updated schedule on their existing link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
