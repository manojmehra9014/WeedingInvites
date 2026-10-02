import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { track } from '../../utils/analytics';
import { CLASSIC, inr, ROYAL } from '../../data/pricing';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../utils/gsap';
import { TemplateDefinition, OccasionType, CultureType, StyleType, LayoutType, ArchStyle, MotifType } from '../../types/template';
import { CustomDesignSettings, WeddingData } from '../../types/wedding';
import { AppView } from '../../hooks/useWeddingState';
import { Search, Eye, Check, Sparkles, Filter, X, ArrowLeft, Smartphone, Monitor, ChevronDown, CheckCircle2, Palette } from 'lucide-react';
import { RoyalArchSVG, LotusMotifSVG, DividerOrnament, DynamicArchRenderer, DynamicMotifRenderer } from '../common/Motifs';
import { CURATED_COLOR_PALETTES } from '../../data/colorPalettes';
import { LAYOUT_OPTIONS } from '../../data/designOptions';
import { resolveDesign } from '../../utils/design';
import { InvitationSite } from '../templates/InvitationSite';
import { TemplateThumbnail } from '../templates/TemplateThumbnail';

interface TemplateCatalogViewProps {
  weddingData: WeddingData;
  allTemplates: TemplateDefinition[];
  selectedTemplateId: string;
  selectTemplate: (id: string, design?: CustomDesignSettings) => void;
  setCurrentView: (view: AppView) => void;
  onOpenCheckout?: (plan?: 'digital_classic' | 'royal_suite') => void;
}

export const TemplateCatalogView: React.FC<TemplateCatalogViewProps> = ({
  allTemplates,
  selectedTemplateId,
  selectTemplate,
  setCurrentView,
  onOpenCheckout,
  weddingData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('all');
  const [selectedCulture, setSelectedCulture] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedLayout, setSelectedLayout] = useState<string>('all');
  const [previewModalTemplate, setPreviewModalTemplate] = useState<TemplateDefinition | null>(null);
  const [modalDevice, setModalDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [visibleCount, setVisibleCount] = useState<number>(32);
  const [modalCustomPalette, setModalCustomPalette] = useState<typeof CURATED_COLOR_PALETTES[0] | null>(null);
  const [modalCustomArch, setModalCustomArch] = useState<ArchStyle>('royal_arch');
  const [modalCustomMotif, setModalCustomMotif] = useState<MotifType>('lotus');
  const [modalLayout, setModalLayout] = useState<LayoutType>('royal_arch');

  const quickFilterPills = [
    { label: 'All Designs', occasion: 'all', culture: 'all', style: 'all' },
    { label: 'Royal Arch & Palace', occasion: 'all', culture: 'royal_fusion', style: 'royal' },
    { label: 'Nikah Royale', occasion: 'nikah', culture: 'muslim', style: 'all' },
    { label: 'Pichwai & Sacred Lotus', occasion: 'all', culture: 'hindu', style: 'traditional' },
    { label: 'Temple Kanjivaram', occasion: 'all', culture: 'south_indian', style: 'all' },
    { label: 'Anand Karaj', occasion: 'anand_karaj', culture: 'punjabi', style: 'all' },
    { label: 'Beach Destination', occasion: 'all', culture: 'all', style: 'pastel' },
    { label: 'Haute Minimalist', occasion: 'all', culture: 'modern_minimal', style: 'minimal' },
    { label: 'Festive Haldi & Sangeet', occasion: 'haldi', culture: 'all', style: 'all' },
  ];

  const occasionsList = [
    { value: 'all', label: 'All Ceremonies' },
    { value: 'wedding', label: 'Wedding & Pheras' },
    { value: 'sangeet', label: 'Sangeet & Cocktail' },
    { value: 'mehendi', label: 'Mehendi' },
    { value: 'haldi', label: 'Haldi' },
    { value: 'reception', label: 'Reception' },
    { value: 'save_the_date', label: 'Save the Date' },
    { value: 'anand_karaj', label: 'Anand Karaj' },
    { value: 'nikah', label: 'Nikah' },
  ];

  const culturesList = [
    { value: 'all', label: 'All Traditions' },
    { value: 'hindu', label: 'Hindu / Vedic' },
    { value: 'royal_fusion', label: 'Royal Rajputana' },
    { value: 'punjabi', label: 'Punjabi & Sikh' },
    { value: 'south_indian', label: 'South Indian' },
    { value: 'muslim', label: 'Islamic / Nikah' },
    { value: 'modern_minimal', label: 'Modern Minimal' },
    { value: 'interfaith', label: 'Interfaith / Fusion' },
  ];

  const stylesList = [
    { value: 'all', label: 'All Styles' },
    { value: 'royal', label: 'Royal Palace' },
    { value: 'minimal', label: 'Clean Minimal' },
    { value: 'floral', label: 'Floral & Botanical' },
    { value: 'dark_luxury', label: 'Dark Midnight' },
    { value: 'traditional', label: 'Traditional Silk' },
    { value: 'pastel', label: 'Beach & Pastel' },
    { value: 'editorial', label: 'Editorial Deckle' },
  ];

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((tpl) => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = tpl.name.toLowerCase().includes(query);
        const matchesTagline = tpl.tagline.toLowerCase().includes(query);
        const matchesCulture = tpl.culture.toLowerCase().includes(query);
        const matchesStyle = tpl.style.toLowerCase().includes(query);
        if (!matchesName && !matchesTagline && !matchesCulture && !matchesStyle) {
          return false;
        }
      }

      // Occasion filter
      if (selectedOccasion !== 'all') {
        if (!tpl.occasions.includes(selectedOccasion as OccasionType)) {
          return false;
        }
      }

      // Culture filter
      if (selectedCulture !== 'all') {
        if (tpl.culture !== (selectedCulture as CultureType)) {
          return false;
        }
      }

      // Style filter
      if (selectedStyle !== 'all') {
        if (tpl.style !== (selectedStyle as StyleType)) {
          return false;
        }
      }

      if (selectedLayout !== 'all' && tpl.layout !== selectedLayout) {
        return false;
      }

      return true;
    });
  }, [allTemplates, searchQuery, selectedOccasion, selectedCulture, selectedStyle, selectedLayout]);

  // Tweaks made inside Quick Look travel with the template instead of being silently dropped.
  const modalOverrides = (): CustomDesignSettings => ({
    layout: modalLayout,
    archStyle: modalCustomArch,
    motif: modalCustomMotif,
    ...(modalCustomPalette ? { paletteId: modalCustomPalette.id, customPalette: modalCustomPalette } : {}),
  });

  // Only cards that weren't on the page before animate (filters reset the count, "load more" doesn't),
  // revealed in batches as they scroll in.
  const gridRef = useRef<HTMLDivElement>(null);
  const shownCount = useRef(0);
  const shownFor = useRef(filteredTemplates);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (shownFor.current !== filteredTemplates) shownCount.current = 0;
    shownFor.current = filteredTemplates;
    const fresh = Array.from(grid.children).slice(shownCount.current) as HTMLElement[];
    shownCount.current = grid.children.length;
    if (!fresh.length || prefersReducedMotion()) return;
    gsap.set(fresh, { autoAlpha: 0, y: 40 });
    const triggers = ScrollTrigger.batch(fresh, {
      start: 'top 95%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.9, overwrite: true }),
    });
    return () => {
      triggers.forEach((t) => t.kill());
      gsap.set(fresh, { autoAlpha: 1, y: 0 }); // never leave a card hidden when the effect re-runs
    };
  }, [filteredTemplates, visibleCount]);

  const modalRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!previewModalTemplate || !modalRef.current || prefersReducedMotion()) return;
    const tween = gsap.from(modalRef.current, { autoAlpha: 0, y: 40, scale: 0.96, duration: 0.8 });
    return () => {
      tween.revert();
    };
  }, [previewModalTemplate?.id]);

  const handleSelectTemplate = (id: string) => {
    track('template_tried', id);
    if (previewModalTemplate) {
      selectTemplate(id, modalOverrides());
      setPreviewModalTemplate(null);
    } else {
      selectTemplate(id);
    }
  };

  const handleApplyAndCustomize = (id: string) => {
    track('template_tried', id);
    selectTemplate(id, modalOverrides());
    setPreviewModalTemplate(null);
    setCurrentView('onboarding');
  };

  const openPreviewModal = (tpl: TemplateDefinition) => {
    track('template_viewed', tpl.id);
    setPreviewModalTemplate(tpl);
    setModalCustomPalette(null);
    setModalCustomArch(tpl.decorations.archStyle);
    setModalCustomMotif(tpl.decorations.motif);
    setModalLayout(tpl.layout);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E8E2D8] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => setCurrentView('landing')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8F6D31] hover:text-[#191614] mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
              <div className="flex items-center gap-3">
                <h1 data-split className="text-3xl sm:text-5xl font-serif text-[#191614]">
                  {allTemplates.length.toLocaleString('en-IN')} Unique Wedding Designs
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-1 bg-[#FFF9EE] border border-[#E8D9B8] text-[#8F6D31] rounded-full text-xs font-semibold">
                  Dynamic Color Studio
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B655E] mt-1 max-w-2xl">
                Every design is a one-of-a-kind combination of layout, palette and typography, previewed here with your names. Customize anything after choosing. All templates included in {CLASSIC.name} ({inr(CLASSIC.priceInr)}) and {ROYAL.name} ({inr(ROYAL.priceInr)}) plans.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {onOpenCheckout && (
                <>
                  <button
                    onClick={() => onOpenCheckout('digital_classic')}
                    className="px-3 py-2 rounded-lg bg-white border border-[#E8E2D8] hover:border-[#191614] text-xs font-semibold text-[#191614] cursor-pointer"
                  >
                    Classic ({inr(CLASSIC.priceInr)})
                  </button>
                  <button
                    onClick={() => onOpenCheckout('royal_suite')}
                    className="px-3.5 py-2 rounded-lg bg-[#191614] hover:bg-[#B38B45] text-white text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="w-3 h-3 text-[#C9A45C]" />
                    <span>Suite ({inr(ROYAL.priceInr)})</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setCurrentView('invite-preview')}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#191614] bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg transition-colors text-center cursor-pointer"
              >
                Live Preview
              </button>
              <button
                onClick={() => setCurrentView('onboarding')}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#191614] hover:bg-[#B38B45] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* Quick-tap Pill Carousel (Mobile scrollable) */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {quickFilterPills.map((pill) => {
              const isActive =
                selectedOccasion === pill.occasion &&
                selectedCulture === pill.culture &&
                selectedStyle === pill.style;
              return (
                <button
                  key={pill.label}
                  onClick={() => {
                    setSelectedOccasion(pill.occasion);
                    setSelectedCulture(pill.culture);
                    setSelectedStyle(pill.style);
                    setSearchQuery('');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#191614] text-white shadow-sm'
                      : 'bg-[#F4EFE6] text-[#554C44] hover:bg-[#EAE2D5] hover:text-[#191614]'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Search bar & structured filter dropdowns */}
          <div className="mt-4 space-y-3">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-[#8E867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates (e.g. Royal Maroon, Udaipur, Haldi, Nikah, Kanjivaram)..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#B38B45] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8E867C] hover:text-[#191614]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter:
              </span>

              {/* Occasion */}
              <select
                value={selectedOccasion}
                onChange={(e) => setSelectedOccasion(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E8E2D8] rounded-lg text-[#191614] focus:outline-none focus:border-[#B38B45]"
              >
                {occasionsList.map((occ) => (
                  <option key={occ.value} value={occ.value}>
                    {occ.label}
                  </option>
                ))}
              </select>

              {/* Culture */}
              <select
                value={selectedCulture}
                onChange={(e) => setSelectedCulture(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E8E2D8] rounded-lg text-[#191614] focus:outline-none focus:border-[#B38B45]"
              >
                {culturesList.map((cul) => (
                  <option key={cul.value} value={cul.value}>
                    {cul.label}
                  </option>
                ))}
              </select>

              {/* Style */}
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E8E2D8] rounded-lg text-[#191614] focus:outline-none focus:border-[#B38B45]"
              >
                {stylesList.map((stl) => (
                  <option key={stl.value} value={stl.value}>
                    {stl.label}
                  </option>
                ))}
              </select>

              {/* Layout */}
              <select
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E8E2D8] rounded-lg text-[#191614] focus:outline-none focus:border-[#B38B45]"
              >
                <option value="all">All Layouts</option>
                {LAYOUT_OPTIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>

              {(selectedOccasion !== 'all' ||
                selectedCulture !== 'all' ||
                selectedStyle !== 'all' ||
                selectedLayout !== 'all' ||
                searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedOccasion('all');
                    setSelectedCulture('all');
                    setSelectedStyle('all');
                    setSelectedLayout('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#8F6D31] underline hover:text-[#191614] ml-2 cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Grid Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-[#6B655E] uppercase tracking-wider font-semibold">
            Showing{' '}
            <span className="text-[#191614] font-bold tabular-nums">
              {Math.min(visibleCount, filteredTemplates.length)}
            </span>{' '}
            of <span className="tabular-nums">{filteredTemplates.length}</span> Matching Designs
          </p>
        </div>

        {/* Responsive Grid: 1 col on mobile, 2 on sm, 3 on md, 4 on xl */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTemplates.slice(0, visibleCount).map((tpl) => {
            const isSelected = tpl.id === selectedTemplateId;
            return (
              <div
                key={tpl.id}
                className={`group relative flex flex-col rounded-[22px] bg-gradient-to-b from-white to-[#FBF8F3] p-2.5 shadow-[0_1px_2px_rgba(25,22,20,0.06),0_12px_32px_-18px_rgba(25,22,20,0.35)] ring-1 transition-[box-shadow,translate] duration-500 hover:-translate-y-1.5 hover:shadow-[0_2px_4px_rgba(25,22,20,0.06),0_28px_50px_-22px_rgba(143,109,49,0.55)] ${
                  isSelected ? 'ring-2 ring-[#B38B45]' : 'ring-[#E8E2D8] hover:ring-[#C9A45C]'
                }`}
              >
                {/* The invitation itself, matted like a card in a gilt frame */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl" style={{ backgroundColor: tpl.theme.background }}>
                  {/* Rendered at 520px: every layout's portrait composition, so names read at card size. */}
                  <TemplateThumbnail template={tpl} weddingData={weddingData} renderWidth={520} />
                  <div className="pointer-events-none absolute inset-1.5 rounded-[13px] border" style={{ borderColor: `color-mix(in srgb, ${tpl.theme.secondary}, transparent 45%)` }} />

                  <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
                    <span className="rounded-full bg-[#191614]/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3E3BF] backdrop-blur-md">
                      {tpl.badge ?? tpl.culture.replace('_', ' ')}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#8F6D31] via-[#D9B872] to-[#B38B45] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#191614] shadow">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => openPreviewModal(tpl)}
                    className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-[#191614] shadow-lg backdrop-blur transition-[opacity,translate] duration-300 cursor-pointer hover:bg-white [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Eye className="h-3.5 w-3.5" /> Quick Look
                  </button>
                </div>

                <div className="flex flex-1 flex-col px-2.5 pb-1.5 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8F6D31]">
                    {[...new Set([LAYOUT_OPTIONS.find((l) => l.id === tpl.layout)?.label, tpl.style.replace('_', ' ')].map((w) => w?.toLowerCase()))].join(' · ')}
                  </p>
                  <h3 className="mt-1 truncate font-serif text-xl font-semibold text-[#191614]">{tpl.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6B655E]">{tpl.tagline}</p>

                  {/* Palette and typeface: what actually differs between two templates */}
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#F0EAE0] pt-3">
                    <div className="flex -space-x-1.5" title="Colour palette">
                      {[tpl.theme.primary, tpl.theme.secondary, tpl.theme.background].map((c) => (
                        <span key={c} className="h-5 w-5 rounded-full shadow-[inset_0_0_0_1px_rgba(25,22,20,0.15)] ring-2 ring-white" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className="truncate text-[15px] text-[#191614]" style={{ fontFamily: `"${tpl.fonts.heading}", serif` }} title="Heading typeface">
                      {tpl.fonts.heading}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#EFE8DD] text-[#8F6D31]' : 'bg-[#191614] text-white hover:bg-gradient-to-r hover:from-[#8F6D31] hover:to-[#B38B45]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Use Template'}
                    </button>
                    <button
                      onClick={() => openPreviewModal(tpl)}
                      className="rounded-xl border border-[#E8E2D8] p-2.5 text-[#191614] transition-colors hover:border-[#191614] cursor-pointer"
                      title="Quick Look"
                      aria-label={`Quick Look: ${tpl.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More */}
        {visibleCount < filteredTemplates.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 32)}
              className="px-8 py-3.5 bg-white border border-[#E8E2D8] hover:border-[#B38B45] text-[#191614] text-xs font-semibold uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Load More Designs</span>
              <ChevronDown className="w-4 h-4 text-[#8F6D31]" />
            </button>
            <p className="text-xs text-[#8E867C] mt-2">
              Viewing {Math.min(visibleCount, filteredTemplates.length)} of {filteredTemplates.length} designs
            </p>
          </div>
        )}
      </div>

      {/* Responsive Preview Modal */}
      {previewModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div ref={modalRef} className={`bg-[#FAF8F5] rounded-3xl w-full ${modalDevice === 'desktop' ? 'max-w-6xl' : 'max-w-3xl'} border border-white/20 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col`}>
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-white">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8F6D31] block">
                  Design Preview
                </span>
                <h3 className="text-xl font-serif text-[#191614]">
                  {previewModalTemplate.name}
                </h3>
              </div>

              {/* Device switch inside modal */}
              <div className="flex items-center gap-2">
                <div className="hidden xs:flex items-center bg-[#F2ECE3] rounded-lg p-1 border border-[#E8E2D8]">
                  <button
                    onClick={() => setModalDevice('mobile')}
                    className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                      modalDevice === 'mobile' ? 'bg-white shadow text-[#191614]' : 'text-[#6B655E]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (9:16)</span>
                  </button>
                  <button
                    onClick={() => setModalDevice('desktop')}
                    className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                      modalDevice === 'desktop' ? 'bg-white shadow text-[#191614]' : 'text-[#6B655E]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                </div>

                <button
                  onClick={() => setPreviewModalTemplate(null)}
                  className="p-2 text-[#8E867C] hover:text-[#191614] rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dynamic Customization Control Bar */}
            <div className="px-5 py-3 bg-[#FAF8F5] border-b border-[#E8E2D8] flex flex-col gap-2.5">
              {/* Palette Selection Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8F6D31] shrink-0 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Color:</span>
                </span>
                {CURATED_COLOR_PALETTES.map((pal) => {
                  const isSel = (modalCustomPalette?.id || previewModalTemplate.theme.primary) === pal.id || modalCustomPalette?.primary === pal.primary;
                  return (
                    <button
                      key={pal.id}
                      onClick={() => setModalCustomPalette(pal)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        isSel
                          ? 'border-[#B38B45] bg-[#FFF8EC] text-[#191614] font-bold shadow-xs'
                          : 'border-[#E8E2D8] bg-white text-[#6B655E] hover:border-[#B38B45]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: pal.primary }} />
                      <span>{pal.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Layout, Arch & Motif Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#6B655E]">Layout:</span>
                  {LAYOUT_OPTIONS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setModalLayout(l.id)}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer border ${
                        modalLayout === l.id
                          ? 'bg-[#191614] text-white border-[#191614] font-semibold'
                          : 'border-[#E8E2D8] bg-white text-[#6B655E] hover:border-[#191614]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#6B655E]">Arch:</span>
                  {[
                    { id: 'royal_arch', label: 'Royal' },
                    { id: 'temple_arch', label: 'Temple' },
                    { id: 'scalloped', label: 'Scalloped' },
                    { id: 'minimal_oval', label: 'Minimal' },
                  ].map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setModalCustomArch(a.id as ArchStyle)}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer border ${
                        modalCustomArch === a.id
                          ? 'bg-[#191614] text-white border-[#191614] font-semibold'
                          : 'border-[#E8E2D8] bg-white text-[#6B655E] hover:border-[#191614]'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#6B655E]">Motif:</span>
                  {(['lotus', 'peacock', 'mandala', 'marigold', 'botanical'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setModalCustomMotif(m)}
                      className={`px-2 py-0.5 rounded text-[10px] capitalize cursor-pointer border ${
                        modalCustomMotif === m
                          ? 'bg-[#B38B45] text-white border-[#B38B45] font-semibold'
                          : 'border-[#E8E2D8] bg-white text-[#6B655E] hover:border-[#B38B45]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Body: the real guest site, rendered with the modal's overrides */}
            <div className="p-3 sm:p-6 flex justify-center bg-[#1A1715] flex-1 min-h-0">
              <div
                className={
                  modalDevice === 'mobile'
                    ? 'w-[min(100%,360px)] rounded-[32px] bg-[#100E0C] p-2.5 border-4 border-[#3A332C] shadow-2xl'
                    : 'w-full rounded-xl border border-white/10 shadow-2xl overflow-hidden'
                }
              >
                <div className={`h-[min(60vh,640px)] overflow-y-auto ${modalDevice === 'mobile' ? 'rounded-[22px]' : ''}`}>
                  <InvitationSite
                    weddingData={weddingData}
                    design={resolveDesign(previewModalTemplate, {
                      customPalette: modalCustomPalette ?? undefined,
                      archStyle: modalCustomArch,
                      motif: modalCustomMotif,
                      layout: modalLayout,
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-5 py-4 bg-white border-t border-[#E8E2D8] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-[#6B655E]">
                <span>Culture: <strong className="text-[#191614] capitalize">{previewModalTemplate.culture.replace('_', ' ')}</strong></span>
                <span>•</span>
                <span>Style: <strong className="text-[#191614] capitalize">{previewModalTemplate.style}</strong></span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleSelectTemplate(previewModalTemplate.id)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] text-[#191614] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Set as Active
                </button>
                <button
                  onClick={() => handleApplyAndCustomize(previewModalTemplate.id)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#191614] hover:bg-[#B38B45] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A45C]" />
                  <span>Use Template</span>
                </button>
                {onOpenCheckout && (
                  <button
                    onClick={() => {
                      setPreviewModalTemplate(null);
                      onOpenCheckout('royal_suite');
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-[#B38B45] to-[#D4AF37] hover:brightness-110 text-[#191614] text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <span>Get Plan ({inr(ROYAL.priceInr)})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
