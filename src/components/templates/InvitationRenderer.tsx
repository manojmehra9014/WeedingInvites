import React, { useLayoutEffect, useRef, useState } from 'react';
import { track } from '../../utils/analytics';
import { gsap, prefersReducedMotion } from '../../utils/gsap';
import { WeddingData, GuestRSVP } from '../../types/wedding';
import { ArchStyle, MotifType, TemplateDefinition } from '../../types/template';
import { AppView } from '../../hooks/useWeddingState';
import {
  Share2, Sparkles, Smartphone, Monitor, ArrowLeft,
  Music, Volume2, Maximize2, Palette, RefreshCw, RotateCcw
} from 'lucide-react';
import { CURATED_COLOR_PALETTES } from '../../data/colorPalettes';
import { FONT_PAIRINGS, LAYOUT_OPTIONS } from '../../data/designOptions';
import { formatDate, resolveDesign } from '../../utils/design';
import { weddingAudio } from '../../utils/audioEngine';
import { InvitationSite } from './InvitationSite';
import { WaxSealEnvelope } from './WaxSealEnvelope';
import { inviteUrl } from '../../utils/api';
import { CLASSIC, entitlements, inr, ROYAL } from '../../data/pricing';

interface InvitationRendererProps {
  weddingData: WeddingData;
  updateWeddingData?: (updates: Partial<WeddingData>) => void;
  activeTemplate: TemplateDefinition;
  submitRSVP: (rsvp: Omit<GuestRSVP, 'id' | 'submittedAt'>) => GuestRSVP;
  setCurrentView: (view: AppView) => void;
  previewDevice: 'desktop' | 'mobile';
  setPreviewDevice: (device: 'desktop' | 'mobile') => void;
  onOpenCheckout?: (plan?: 'digital_classic' | 'royal_suite') => void;
  publish: () => Promise<WeddingData>;
}

export const InvitationRenderer: React.FC<InvitationRendererProps> = ({
  weddingData,
  updateWeddingData,
  activeTemplate,
  submitRSVP,
  setCurrentView,
  previewDevice,
  setPreviewDevice,
  onOpenCheckout,
  publish,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [isEnvelopeSealed, setIsEnvelopeSealed] = useState(weddingData.customDesign?.showWaxSealEnvelope ?? true);
  const [guestNameInput, setGuestNameInput] = useState(weddingData.customDesign?.personalizedGuestName || '');

  const design = resolveDesign(activeTemplate, weddingData.customDesign);
  const { theme, layout, motif: activeMotif, arch: activeArch } = design;

  const customize = (patch: Partial<NonNullable<WeddingData['customDesign']>>) =>
    updateWeddingData?.({ customDesign: { ...weddingData.customDesign, ...patch } });

  const handleArchSelect = (archStyle: ArchStyle) => customize({ archStyle });
  const handleMotifSelect = (motif: MotifType) => customize({ motif });
  const handlePaletteSelect = (palette: (typeof CURATED_COLOR_PALETTES)[0]) =>
    customize({ paletteId: palette.id, customPalette: palette });

  // Drops every visual override but keeps guest personalization.
  const resetDesign = () =>
    updateWeddingData?.({
      customDesign: {
        personalizedGuestName: weddingData.customDesign?.personalizedGuestName,
        showWaxSealEnvelope: weddingData.customDesign?.showWaxSealEnvelope,
      },
    });

  const handleGuestNameChange = (name: string) => {
    setGuestNameInput(name);
    customize({ personalizedGuestName: name });
  };

  const customizerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!showCustomizer || !customizerRef.current || prefersReducedMotion()) return;
    const tween = gsap.from(customizerRef.current, { height: 0, autoAlpha: 0, duration: 0.7, ease: 'expo.out' });
    return () => {
      tween.revert();
    };
  }, [showCustomizer]);

  const openInvitation = () => {
    setIsEnvelopeSealed(false);
    weddingAudio.play();
    setIsMusicPlaying(true);
  };

  const toggleMusic = () => {
    const playing = weddingAudio.toggle();
    setIsMusicPlaying(playing);
  };

  // Sharing needs a live link, so the first share publishes the invitation.
  const [shareError, setShareError] = useState('');
  const liveUrl = async () => {
    setShareError('');
    try {
      const live = weddingData.editKey ? weddingData : await publish();
      return inviteUrl(live.customSlug, guestNameInput);
    } catch (e) {
      setShareError((e as Error).message);
      return null;
    }
  };

  const handleShareWhatsApp = async () => {
    // Open the window synchronously so popup blockers allow it, then point it at WhatsApp.
    const win = window.open('', '_blank');
    const url = await liveUrl();
    if (!url) return win?.close();
    const guestPrefix = guestNameInput ? `Dear ${guestNameInput},\n\n` : '';
    const text = encodeURIComponent(
      `✨ ${guestPrefix}We joyfully invite you and your family to the wedding celebrations of ${weddingData.partner1.name} & ${weddingData.partner2.name}!\n\n📅 ${formatDate(weddingData.weddingDate)}\n📍 ${weddingData.mainVenue}, ${weddingData.city}\n\nView the invitation & RSVP:\n${url}\n\nWith love and blessings!`
    );
    if (win) win.location.href = `https://api.whatsapp.com/send?text=${text}`;
    track('wedding_shared', 'whatsapp');
  };

  const handleCopyLink = async () => {
    const url = await liveUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => window.prompt('Copy your invitation link:', url));
    setCopiedLink(true);
    track('wedding_shared', 'copy');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const headerActions = (
    <>
      <button
        onClick={toggleMusic}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-inv-border px-2.5 py-1.5 text-[10px] font-semibold text-inv-heading transition-colors ${
          isMusicPlaying ? 'bg-inv-secondary/20' : ''
        }`}
        title={isMusicPlaying ? 'Mute music' : 'Play music'}
      >
        {isMusicPlaying ? <Volume2 className="h-3.5 w-3.5 animate-pulse" /> : <Music className="h-3.5 w-3.5" />}
        <span className="hidden @md:inline">{isMusicPlaying ? 'Playing' : 'Music'}</span>
      </button>
      <button
        onClick={() => setIsEnvelopeSealed(true)}
        className="flex cursor-pointer items-center gap-1 rounded-lg border border-inv-border px-2 py-1.5 text-[10px] font-medium text-inv-text hover:bg-inv-text/5"
        title="Preview the wax-seal envelope"
      >
        <RefreshCw className="h-3 w-3" />
        <span className="hidden @md:inline">Envelope</span>
      </button>
      <button
        onClick={handleShareWhatsApp}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm"
        title="Share on WhatsApp"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden @md:inline">WhatsApp</span>
      </button>
    </>
  );

  const content = isEnvelopeSealed ? (
    <WaxSealEnvelope weddingData={weddingData} design={design} guestName={guestNameInput} onOpen={openInvitation} />
  ) : (
    <InvitationSite
      weddingData={weddingData}
      design={design}
      guestName={guestNameInput}
      headerActions={headerActions}
      onSubmitRSVP={submitRSVP}
      branding={entitlements(weddingData.plan).branding}
    />
  );

  return (
    <div className="min-h-screen bg-[#1E1B18] text-white">
      {/* Top Controller Bar */}
      <div className="sticky top-0 z-40 bg-[#141210] border-b border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-1.5 text-xs text-[#D4C3A3] hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back</span>
          </button>
          <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />
          <span className="text-xs text-[#FAF8F5] hidden sm:block font-serif truncate max-w-xs">
            Template: <strong className="text-[#C9A45C]">{activeTemplate.name}</strong>
          </span>
        </div>

        {/* Device Switcher & Share actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Customizer Drawer Button */}
          <button
            onClick={() => setShowCustomizer(!showCustomizer)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              showCustomizer 
                ? 'bg-[#C9A45C] text-[#191614] border-[#C9A45C]' 
                : 'bg-white/10 hover:bg-white/20 text-[#FAF8F5] border-white/15'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Customize<span className="hidden sm:inline"> Design</span></span>
          </button>

          <div className="flex items-center bg-black/40 rounded-lg p-0.5 sm:p-1 border border-white/10">
            <button
              onClick={() => {
                setPreviewDevice('desktop');
                setIsFullScreen(false);
              }}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                previewDevice === 'desktop' && !isFullScreen
                  ? 'bg-[#C9A45C] text-[#191614] font-semibold'
                  : 'text-white/70 hover:text-white'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Desktop</span>
            </button>
            <button
              onClick={() => {
                setPreviewDevice('mobile');
                setIsFullScreen(false);
              }}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                previewDevice === 'mobile' && !isFullScreen
                  ? 'bg-[#C9A45C] text-[#191614] font-semibold'
                  : 'text-white/70 hover:text-white'
              }`}
              title="Mobile Device View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mobile Frame</span>
            </button>
            <button
              onClick={() => setIsFullScreen(true)}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                isFullScreen ? 'bg-[#C9A45C] text-[#191614] font-semibold' : 'text-white/70 hover:text-white'
              }`}
              title="Full Screen Guest View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Full Screen</span>
            </button>
          </div>

          <button
            onClick={() => setCurrentView('catalog')}
            className="px-2.5 sm:px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg text-white border border-white/15 cursor-pointer whitespace-nowrap"
          >
            Change Template
          </button>

          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 text-xs bg-[#B38B45] hover:bg-[#8F6D31] text-[#191614] font-semibold rounded-lg cursor-pointer whitespace-nowrap"
          >
            {copiedLink ? 'Copied!' : weddingData.editKey ? 'Copy Link' : 'Publish & Copy Link'}
          </button>

          {onOpenCheckout && (
            <button
              onClick={() => onOpenCheckout('royal_suite')}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-[#B38B45] to-[#D4AF37] hover:brightness-110 text-[#191614] font-bold rounded-lg cursor-pointer whitespace-nowrap hidden sm:flex items-center gap-1 shadow-sm"
              title="Activate full suite features"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrade</span>
            </button>
          )}
        </div>
      </div>

      {shareError && (
        <div role="alert" className="bg-rose-950 px-4 py-2 text-center text-xs text-rose-100">
          Couldn&rsquo;t publish: {shareError}
        </div>
      )}

      {/* Floating Interactive Palette & Studio Customizer Bar */}
      {showCustomizer && (
        <div ref={customizerRef} className="overflow-hidden bg-[#181613] border-b border-white/15 px-4 sm:px-8 py-4">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-serif font-bold text-[#E5B84B] flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Design Studio
                </h4>
                <p className="text-xs text-white/60">
                  Layout, typography and colour repaint this invitation and the video suite instantly.
                </p>
              </div>

              {/* Guest Personalization Simulator Input */}
              <div className="w-full md:w-auto flex items-center gap-2">
                <span className="text-xs text-white/70 shrink-0">Personalize for Guest:</span>
                <input
                  type="text"
                  value={guestNameInput}
                  onChange={(e) => handleGuestNameChange(e.target.value)}
                  placeholder="e.g. The Kapoor Family"
                  className="px-3 py-1.5 bg-black/50 border border-white/20 rounded-lg text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#C9A45C] w-full md:w-56"
                />
              </div>
            </div>

            {/* Layout & typography: the biggest levers, so they come first */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Layout</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {LAYOUT_OPTIONS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => customize({ layout: l.id })}
                      title={l.description}
                      className={`px-2 py-2 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                        layout === l.id
                          ? 'bg-[#B38B45] text-[#191614] border-[#B38B45] font-semibold'
                          : 'border-white/10 bg-black/30 text-white/75 hover:text-white hover:border-white/30'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Typography</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {FONT_PAIRINGS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => customize({ fontHeading: f.heading, fontBody: f.body })}
                      title={`${f.heading} + ${f.body}`}
                      style={{ fontFamily: `"${f.heading}", serif` }}
                      className={`px-2 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        design.fonts.heading === f.heading && design.fonts.body === f.body
                          ? 'bg-[#B38B45] text-[#191614] border-[#B38B45] font-semibold'
                          : 'border-white/10 bg-black/30 text-white/75 hover:text-white hover:border-white/30'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Curated Palette Swatch Circles */}
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 pt-1">
              {CURATED_COLOR_PALETTES.map((pal) => {
                const isSelected = (weddingData.customDesign?.paletteId || '') === pal.id || (!weddingData.customDesign?.paletteId && pal.primary === activeTemplate.theme.primary);
                return (
                  <button
                    key={pal.id}
                    onClick={() => handlePaletteSelect(pal)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer group flex flex-col items-center text-center ${
                      isSelected 
                        ? 'border-[#E5B84B] bg-white/15 ring-2 ring-[#E5B84B]/50' 
                        : 'border-white/10 hover:border-white/30 bg-black/30'
                    }`}
                  >
                    {/* Double-circle swatch */}
                    <div className="flex items-center -space-x-1.5 mb-1.5">
                      <div 
                        className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: pal.primary }}
                      />
                      <div 
                        className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: pal.secondary }}
                      />
                    </div>
                    <span className="text-[10px] text-white/90 font-medium truncate w-full">
                      {pal.name.split(' ')[0]} {pal.name.split(' ')[1] || ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Arch & Motif Architecture Row */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white/70">Arch Style:</span>
                {[
                  { id: 'royal_arch', label: 'Royal Arch' },
                  { id: 'temple_arch', label: 'Temple Gopuram' },
                  { id: 'scalloped', label: 'Scalloped' },
                  { id: 'minimal_oval', label: 'Minimal Oval' },
                  { id: 'none', label: 'Clean' },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleArchSelect(a.id as ArchStyle)}
                    className={`px-2 py-0.5 rounded text-[11px] cursor-pointer border ${
                      activeArch === a.id
                        ? 'bg-[#B38B45] text-[#191614] border-[#B38B45] font-semibold'
                        : 'border-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white/70">Motif:</span>
                {(['lotus', 'marigold', 'peacock', 'mandala', 'botanical', 'geometric'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMotifSelect(m)}
                    className={`px-2 py-0.5 rounded text-[11px] capitalize cursor-pointer border ${
                      activeMotif === m 
                        ? 'bg-[#B38B45] text-[#191614] border-[#B38B45] font-semibold' 
                        : 'border-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={isEnvelopeSealed}
                    onChange={(e) => {
                      setIsEnvelopeSealed(e.target.checked);
                      customize({ showWaxSealEnvelope: e.target.checked });
                    }}
                    className="rounded text-[#B38B45] focus:ring-0"
                  />
                  <span>Wax-seal envelope for guests (Royal)</span>
                </label>

                <button
                  onClick={resetDesign}
                  className="px-2 py-1 rounded border border-white/10 text-white/70 hover:text-white cursor-pointer flex items-center gap-1"
                  title="Restore the template's own layout, fonts and colours"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to template</span>
                </button>

                {onOpenCheckout && (
                  <button
                    onClick={() => onOpenCheckout('royal_suite')}
                    className="px-3 py-1 bg-gradient-to-r from-[#B38B45] to-[#D4AF37] hover:brightness-110 text-[#191614] font-bold rounded-lg shadow-sm text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Get Suite ({inr(CLASSIC.priceInr)} / {inr(ROYAL.priceInr)})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <div className="py-4 sm:py-8 flex justify-center px-2 sm:px-4">
        {isFullScreen ? (
          /* Full Screen Guest Experience View */
          <div className="w-full max-w-4xl rounded-2xl overflow-clip shadow-2xl border border-white/10">
            {content}
          </div>
        ) : previewDevice === 'mobile' ? (
          /* Fluid Mobile Device Frame (Never overflows small screens!) */
          <div className="w-full max-w-[390px] rounded-[36px] sm:rounded-[44px] bg-[#100E0C] p-2 sm:p-3.5 shadow-2xl border-2 sm:border-4 border-[#352F28] ring-1 ring-white/10">
            <div className="w-20 sm:w-24 h-3 sm:h-4 bg-[#26221D] rounded-full mx-auto mb-2 sm:mb-3" />
            <div className="rounded-[24px] sm:rounded-[32px] overflow-hidden max-h-[820px] overflow-y-auto border border-white/5 scrollbar-thin">
              {content}
            </div>
          </div>
        ) : (
          /* Desktop Browser Container */
          <div className="w-full max-w-5xl rounded-2xl overflow-clip shadow-2xl border border-white/10">
            {content}
          </div>
        )}
      </div>
    </div>
  );
};
