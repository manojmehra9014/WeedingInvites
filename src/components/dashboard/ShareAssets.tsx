import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Lock, Share2, X } from 'lucide-react';
import { SITE } from '../../../site.config';
import { WeddingData } from '../../types/wedding';
import { ResolvedDesign } from '../../utils/design';
import { entitlements, inr, PLANS } from '../../data/pricing';
import { renderShareImage, SHARE_FORMATS, ShareFormat, shareCards, shareFileName } from '../../utils/shareImages';
import { track } from '../../utils/analytics';

const FORMATS = Object.keys(SHARE_FORMATS) as ShareFormat[];

/** The couple's own photo; without one the cards are typography-only. */
const ownPhoto = (d: WeddingData) => d.couplePhotoUrl || d.coverPhotoUrl || null;

const saveFile = (file: File) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/** Story, post, status and square images of every card, drawn from the wedding details and the chosen template. */
export const ShareAssets: React.FC<{
  weddingData: WeddingData;
  design: ResolvedDesign;
  onUpgrade?: (plan?: 'digital_classic' | 'royal_suite') => void;
}> = ({ weddingData, design, onUpgrade }) => {
  const cards = useMemo(() => shareCards(weddingData), [weddingData]);
  const [open, setOpen] = useState(false);
  const [cardId, setCardId] = useState('save-the-date');
  const card = cards.find((c) => c.id === cardId) ?? cards[0];
  const paid = entitlements(weddingData.plan).shareImages;
  const unlocked = paid || card.kind === 'save_the_date';
  const branding = paid ? null : `Made with ${SITE.name}`;
  const photoUrl = useMemo(() => ownPhoto(weddingData), [weddingData]);
  const opts = { card, design, photoUrl, branding };

  // Live previews at 40% size; the previous set stays on screen until the new one is drawn.
  const [previews, setPreviews] = useState<Partial<Record<ShareFormat, string>>>({});
  const [zoom, setZoom] = useState<ShareFormat | null>(null);
  const shown = useRef<string[]>([]);
  const files = useRef(new Map<ShareFormat, File>()); // full-size renders of the current card
  useEffect(() => {
    files.current.clear();
    if (!open) return;
    let live = true;
    Promise.all(FORMATS.map(async (f) => [f, URL.createObjectURL(await renderShareImage({ ...opts, format: f, scale: 0.4 }))] as const)).then(
      (entries) => {
        if (!live) return entries.forEach(([, u]) => URL.revokeObjectURL(u));
        shown.current.forEach((u) => URL.revokeObjectURL(u));
        shown.current = entries.map(([, u]) => u);
        setPreviews(Object.fromEntries(entries));
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card, design, photoUrl, branding]);
  useEffect(() => () => shown.current.forEach((u) => URL.revokeObjectURL(u)), []);
  useEffect(() => {
    if (open) track('asset_previewed', card.kind);
  }, [open, card.kind]);

  const [busy, setBusy] = useState<ShareFormat | null>(null);
  const [notice, setNotice] = useState('');
  const detail = (f: ShareFormat) => `${card.kind}:${f}`;

  const generate = async (format: ShareFormat) => {
    const cached = files.current.get(format);
    if (cached) return cached;
    setBusy(format);
    try {
      // Free downloads are half size (540px wide) and carry the credit.
      const blob = await renderShareImage({ ...opts, format, scale: paid ? 1 : 0.5 });
      const file = new File([blob], shareFileName(card, format), { type: 'image/png' });
      files.current.set(format, file);
      track('asset_generated', detail(format));
      return file;
    } finally {
      setBusy(null);
    }
  };

  const download = async (format: ShareFormat) => {
    if (!unlocked) return onUpgrade?.('digital_classic');
    setNotice('');
    saveFile(await generate(format));
    track('asset_downloaded', detail(format));
  };

  const share = async (format: ShareFormat) => {
    if (!unlocked) return onUpgrade?.('digital_classic');
    setNotice('');
    const file = await generate(format);
    if (!navigator.canShare?.({ files: [file] })) {
      saveFile(file); // desktop browsers: the download is the share
      track('asset_downloaded', detail(format));
      return setNotice('Your browser can’t share images directly, so it was downloaded instead.');
    }
    try {
      await navigator.share({ files: [file], title: `${card.label} · ${weddingData.partner1.shortName} & ${weddingData.partner2.shortName}` });
      track('asset_shared', detail(format));
    } catch (e) {
      const name = (e as Error).name;
      // Safari only shares straight after a tap; drawing the image can take longer than it allows.
      if (name === 'NotAllowedError') setNotice('Image ready. Tap Share again to send it.');
      else if (name !== 'AbortError') saveFile(file);
    }
  };

  if (!open) {
    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E8E2D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ImageIcon className="w-6 h-6 text-[#B38B45] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-serif text-lg text-[#191614]">Shareable invitation images</h2>
            <p className="text-xs text-[#6B655E] mt-0.5">
              Instagram story and post, WhatsApp status and a square invitation, made from your details in your template’s style. Nothing to design.
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-3 text-xs font-semibold uppercase tracking-wider bg-[#191614] hover:bg-[#B38B45] text-white rounded-xl cursor-pointer shrink-0"
        >
          Create shareable invitation
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Shareable invitation images" className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E8E2D8] shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-[#191614]">Shareable images</h2>
          <p className="text-xs text-[#6B655E] mt-0.5">
            {paid
              ? 'Every card in full 1080px quality, ready for Instagram and WhatsApp.'
              : `Free plan: download the Save the Date at preview size with a small ${SITE.name} credit. Every card in full 1080px quality without the credit from ${inr(PLANS.digital_classic.priceInr)}.`}
          </p>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close shareable images" className="p-1 text-[#8E867C] hover:text-[#191614] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Card">
        {cards.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === card.id}
            onClick={() => setCardId(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer flex items-center gap-1 ${
              c.id === card.id ? 'bg-[#191614] text-white border-[#191614]' : 'bg-[#FAF8F5] text-[#191614] border-[#E8E2D8] hover:border-[#191614]'
            }`}
          >
            {!paid && c.kind !== 'save_the_date' && <Lock className="w-3 h-3" />}
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {FORMATS.map((f) => {
          const [w, h] = SHARE_FORMATS[f].size;
          return (
            <div key={f} className="flex flex-col gap-2" data-format={f}>
              <button
                onClick={() => setZoom(f)}
                aria-label={`Preview ${SHARE_FORMATS[f].label}`}
                className="relative w-full rounded-lg overflow-hidden border border-[#E8E2D8] bg-[#F4EFE6] cursor-zoom-in"
                style={{ aspectRatio: `${w} / ${h}` }}
              >
                {previews[f] && <img src={previews[f]} alt={`${card.label}, ${SHARE_FORMATS[f].label}`} className="w-full h-full object-cover" />}
                {!unlocked && (
                  <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/65 text-white text-[10px] font-semibold py-1 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> Paid plans
                  </span>
                )}
              </button>
              <div>
                <div className="text-xs font-semibold text-[#191614]">{SHARE_FORMATS[f].label}</div>
                <div className="text-[10px] text-[#8E867C]">{paid ? `${w} × ${h}` : `${w / 2} × ${h / 2} preview size`}</div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => download(f)}
                  disabled={busy !== null}
                  className="px-2 py-2 text-[11px] font-semibold bg-[#191614] text-white hover:bg-[#B38B45] rounded-lg cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {unlocked ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {busy === f ? '…' : unlocked ? 'Download' : 'Unlock'}
                </button>
                <button
                  onClick={() => share(f)}
                  disabled={busy !== null || !unlocked}
                  className="px-2 py-2 text-[11px] font-semibold bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {notice && <p role="status" className="text-xs text-[#6B655E]">{notice}</p>}
      {!photoUrl && (
        <p className="text-[11px] text-[#8E867C]">No couple photo yet, so these are typography-only. Add your portrait in “Add details” to put it on the cards.</p>
      )}

      {zoom && previews[zoom] && (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Image preview">
          <img src={previews[zoom]} alt={`${card.label}, ${SHARE_FORMATS[zoom].label}`} className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </section>
  );
};
