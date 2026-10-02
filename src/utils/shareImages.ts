// Shareable invitation images (Instagram story/post, WhatsApp status, square) drawn from the same
// WeddingData + ResolvedDesign as the website and the video. Card content, filenames, cropping and text
// fitting are pure functions (see shareImages.check.ts); only renderShareImage touches a canvas.
import type { WeddingData } from '../types/wedding';
import { formatTime, parseLocalDate, ResolvedDesign } from './design';
import { loadImage } from './videoExport';

export type ShareFormat = 'story' | 'post' | 'status' | 'square';
export const SHARE_FORMATS: Record<ShareFormat, { label: string; size: [number, number] }> = {
  story: { label: 'Instagram Story', size: [1080, 1920] },
  post: { label: 'Instagram Post', size: [1080, 1350] },
  status: { label: 'WhatsApp Status', size: [1080, 1920] }, // same canvas as a story
  square: { label: 'Square Invitation', size: [1080, 1080] },
};

export type Role = 'kicker' | 'small' | 'names' | 'amp' | 'title' | 'date' | 'detail';
export interface Block {
  role: Role;
  text: string;
}
export interface ShareCard {
  id: string;
  kind: 'save_the_date' | 'invitation' | 'event';
  label: string;
  /** Filename without format and extension: "priya-arjun-save-the-date". */
  fileStem: string;
  blocks: Block[];
}

export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const firstName = (p: { name: string; shortName?: string }) => (p.shortName || p.name).trim().split(/\s+/)[0] ?? '';
const longDate = (d: string) => (d ? parseLocalDate(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
// "Taj Falaknuma, Hyderabad"; skips blanks and a city already named in the venue.
const place = (...parts: (string | undefined)[]) =>
  parts.map((p) => p?.trim() ?? '').filter((p, i, all) => p && !all.slice(0, i).some((q) => q.toLowerCase().includes(p.toLowerCase()))).join(', ');
const blocks = (...xs: [Role, string | undefined | false][]): Block[] =>
  xs.filter(([, t]) => t && t.trim()).map(([role, text]) => ({ role, text: (text as string).trim() }));

/** Every card this wedding can produce. Only facts the couple entered appear; nothing is filled in for them. */
export function shareCards(d: WeddingData): ShareCard[] {
  const n1 = firstName(d.partner1);
  const n2 = firstName(d.partner2);
  const couple = [slugify(n1), slugify(n2)].filter(Boolean).join('-') || 'wedding';
  const names: [Role, string][] = [['names', n1], ['amp', '&'], ['names', n2]];
  const cards: ShareCard[] = [
    {
      id: 'save-the-date',
      kind: 'save_the_date',
      label: 'Save the Date',
      fileStem: `${couple}-save-the-date`,
      blocks: blocks(['kicker', 'Save the date'], ...names, ['date', longDate(d.weddingDate)], ['detail', d.city]),
    },
    {
      id: 'invitation',
      kind: 'invitation',
      label: 'Invitation',
      fileStem: `${couple}-wedding-invitation`,
      blocks: blocks(
        ['small', 'Together with their families'],
        ...names,
        ['small', 'invite you to celebrate their wedding'],
        ['date', longDate(d.weddingDate)],
        ['detail', d.weddingTime && `${formatTime(d.weddingTime)} onwards`],
        ['detail', place(d.mainVenue, d.city)],
      ),
    },
  ];
  const used = new Set(['save-the-date', 'wedding-invitation']);
  const events = [...d.events].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  for (const ev of events) {
    const base = slugify(ev.title) || 'event';
    let stem = base;
    for (let i = 2; used.has(stem); i++) stem = `${base}-${i}`;
    used.add(stem);
    const time = [ev.startTime, ev.endTime].filter(Boolean).map((t) => formatTime(t!)).join(' – ');
    cards.push({
      id: `event-${ev.id}`,
      kind: 'event',
      label: ev.title.trim() || 'Event',
      fileStem: `${couple}-${stem}`,
      blocks: blocks(
        ['kicker', `${n1} & ${n2}`],
        ['title', ev.title],
        ['date', longDate(ev.date)],
        ['detail', time],
        ['detail', place(ev.venue, ev.city)],
        ['detail', ev.dressCode && `Dress code · ${ev.dressCode}`],
      ),
    });
  }
  return cards;
}

export const shareFileName = (card: ShareCard, format: ShareFormat) => `${card.fileStem}-${format}.png`;

/** Source rectangle that fills a box without stretching. Portraits keep their upper part, where faces usually are. */
export function coverCrop(iw: number, ih: number, bw: number, bh: number) {
  const s = Math.max(bw / iw, bh / ih);
  const sw = bw / s;
  const sh = bh / s;
  // ponytail: no face detection; add a per-photo focal point if couples see heads cut off.
  const focusY = ih > iw * 1.1 ? 0.3 : 0.5;
  return { sx: (iw - sw) / 2, sy: (ih - sh) * focusY, sw, sh };
}

/* ───────────────────────────── text layout ───────────────────────────── */

export interface Font {
  family: 'heading' | 'body';
  size: number;
  weight: number;
  italic: boolean;
  /** Letter spacing in px. */
  spacing: number;
}
export type Measure = (text: string, font: Font) => number;
export interface Line {
  role: Role;
  text: string;
  font: Font;
  /** Top of the line box, relative to the block's top. */
  y: number;
  height: number;
}

const STYLE: Record<Role, { family: Font['family']; size: number; weight: number; italic?: boolean; spacing?: number; upper?: boolean; space: number; lh: number }> = {
  kicker: { family: 'body', size: 26, weight: 600, spacing: 0.32, upper: true, space: 0, lh: 1.5 },
  small: { family: 'heading', size: 40, weight: 400, italic: true, space: 34, lh: 1.3 },
  names: { family: 'heading', size: 156, weight: 400, space: 40, lh: 1.08 },
  amp: { family: 'heading', size: 84, weight: 400, italic: true, space: 0, lh: 1.15 },
  title: { family: 'heading', size: 120, weight: 400, space: 40, lh: 1.1 },
  date: { family: 'body', size: 34, weight: 600, spacing: 0.22, upper: true, space: 56, lh: 1.5 },
  detail: { family: 'body', size: 31, weight: 400, spacing: 0.02, space: 12, lh: 1.45 },
};

export function wrapText(text: string, maxWidth: number, width: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (line && width(test) > maxWidth) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

/**
 * Lays the card's text into a box: big type first (up to `maxScale` × the base sizes), shrinking until it fits. Every line fits the width
 * (a single long word is scaled down rather than overflowing), and the whole block fits the height
 * down to 30%.
 */
export function layoutText(card: Block[], boxW: number, boxH: number, measure: Measure, maxScale = 1) {
  let lines: Line[] = [];
  let height = 0;
  for (let k = maxScale; k >= 0.3; k *= 0.94) {
    lines = [];
    height = 0;
    card.forEach((b, i) => {
      const st = STYLE[b.role];
      const prev = card[i - 1];
      const size = st.size * k;
      const font: Font = { family: st.family, size, weight: st.weight, italic: !!st.italic, spacing: (st.spacing ?? 0) * size };
      const text = st.upper ? b.text.toUpperCase() : b.text;
      const big = b.role === 'names' || b.role === 'title';
      // Names and titles try to stay on one line (down to 60%) before wrapping.
      const w = measure(text, font);
      const fitted = big && w > boxW && w * 0.6 <= boxW ? { ...font, size: (font.size * boxW) / w, spacing: 0 } : font;
      if (prev && b.role !== 'amp' && prev.role !== 'amp') height += st.space * k;
      for (const t of wrapText(text, boxW, (s) => measure(s, fitted))) {
        const lw = measure(t, fitted);
        const f = lw > boxW ? { ...fitted, size: (fitted.size * boxW) / lw, spacing: 0 } : fitted;
        const h = f.size * st.lh;
        lines.push({ role: b.role, text: t, font: f, y: height, height: h });
        height += h;
      }
    });
    if (height <= boxH) break;
  }
  return { lines, height };
}

/* ─────────────────────────────── drawing ─────────────────────────────── */

export type Composition = 'editorial' | 'luxury' | 'traditional' | 'minimal' | 'cinematic';

/** The template decides the look; without a photo, photo-led looks become typography-first. */
export function compositionFor(design: ResolvedDesign, hasPhoto: boolean): Composition {
  if (design.layout === 'cinematic') return hasPhoto ? 'cinematic' : 'luxury';
  if (design.isDark) return 'luxury';
  if (design.layout === 'royal_arch') return 'traditional';
  if (design.layout === 'editorial') return 'editorial';
  return 'minimal';
}

const fontCss = (f: Font, design: ResolvedDesign) =>
  `${f.italic ? 'italic ' : ''}${f.weight} ${f.size}px ${f.family === 'heading' ? `"${design.fonts.heading}", Georgia, serif` : `"${design.fonts.body}", system-ui, sans-serif`}`;

export interface ShareRenderOptions {
  card: ShareCard;
  format: ShareFormat;
  design: ResolvedDesign;
  /** The couple's own photo, or null for a typography-first card. Never the sample couple's. */
  photoUrl: string | null;
  /** "Made with …" credit on free plans. */
  branding: string | null;
  /** 1 = full 1080px wide; previews and free downloads use less. */
  scale?: number;
}

/** Draws the card onto a new canvas. */
export async function drawShareImage(o: ShareRenderOptions): Promise<HTMLCanvasElement> {
  const [W, H] = SHARE_FORMATS[o.format].size;
  const scale = o.scale ?? 1;
  const { theme, isDark } = o.design;
  const photo = o.photoUrl ? await loadImage(o.photoUrl) : null;
  const comp = compositionFor(o.design, !!photo);
  await Promise.all(
    [400, 600].flatMap((w) => [`${w} 40px "${o.design.fonts.heading}"`, `italic ${w} 40px "${o.design.fonts.heading}"`, `${w} 40px "${o.design.fonts.body}"`]).map((f) => document.fonts.load(f)),
  ).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  const measure: Measure = (t, f) => {
    ctx.font = fontCss(f, o.design);
    ctx.letterSpacing = `${f.spacing}px`;
    return ctx.measureText(t).width;
  };

  const tall = H / W > 1.5;
  const square = H === W;
  const metal = theme.secondary;
  const onPhoto = comp === 'cinematic';
  const heading = onPhoto ? '#FFFFFF' : isDark ? theme.secondary : theme.primary;
  const ink = onPhoto ? 'rgba(255,255,255,0.9)' : theme.text;
  const color: Record<Role, string> = { kicker: metal, small: ink, names: heading, amp: metal, title: heading, date: onPhoto ? metal : heading, detail: ink };

  let photoShown = false;
  const drawPhoto = (x: number, y: number, w: number, h: number) => {
    if (!photo) return;
    photoShown = true;
    const c = coverCrop(photo.naturalWidth, photo.naturalHeight, w, h);
    ctx.drawImage(photo, c.sx, c.sy, c.sw, c.sh, x, y, w, h);
  };
  const arch = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };
  const diamond = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  };
  const frame = (inset: number) => {
    ctx.strokeStyle = metal;
    ctx.lineWidth = 2;
    ctx.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset);
    ctx.lineWidth = 1;
    ctx.strokeRect(inset + 14, inset + 14, W - 2 * inset - 28, H - 2 * inset - 28);
  };

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, W, H);

  // Each composition paints its backdrop and returns the text box: x, top, width, height, alignment, vertical anchor.
  let box: { x: number; y: number; w: number; h: number; align: 'left' | 'center'; anchor: 'center' | 'bottom' };
  if (comp === 'cinematic') {
    drawPhoto(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.25)');
    g.addColorStop(0.25, 'rgba(0,0,0,0.08)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.6)');
    g.addColorStop(0.75, 'rgba(0,0,0,0.82)');
    g.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    box = { x: 90, y: H * (square ? 0.3 : 0.4), w: W - 180, h: H * (square ? 0.58 : 0.5), align: 'center', anchor: 'bottom' };
  } else if (comp === 'editorial') {
    if (!photo) box = { x: 120, y: 200, w: W - 240, h: H - 420, align: 'left', anchor: 'center' };
    else if (square) {
      drawPhoto(0, 0, W * 0.46, H);
      box = { x: W * 0.46 + 70, y: 100, w: W * 0.54 - 140, h: H - 240, align: 'left', anchor: 'center' };
    } else {
      const ph = H * (tall ? 0.55 : 0.48);
      drawPhoto(0, 0, W, ph);
      box = { x: 100, y: ph + 80, w: W - 200, h: H - ph - 220, align: 'left', anchor: 'center' };
    }
    ctx.fillStyle = metal;
    ctx.fillRect(box.x, box.y - 30, 96, 3);
  } else if (comp === 'luxury' || comp === 'traditional') {
    if (isDark) {
      const glow = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H * 0.7);
      glow.addColorStop(0, metal);
      glow.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    frame(48);
    ctx.fillStyle = metal;
    for (const [cx, cy] of [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]]) diamond(cx, cy, 12);
    // Square cards have no room for a portrait; taller ones frame it in an arch (traditional) or a gilded panel (luxury).
    const pw = W * (tall ? 0.46 : 0.34);
    const ph = pw * (tall ? 1.3 : 1.15);
    const py = tall ? 170 : 130;
    let top = square ? 130 : 160;
    if (photo && !square) {
      ctx.save();
      if (comp === 'traditional') arch((W - pw) / 2, py, pw, ph);
      else {
        ctx.beginPath();
        ctx.roundRect((W - pw) / 2, py, pw, ph, 6);
      }
      ctx.clip();
      drawPhoto((W - pw) / 2, py, pw, ph);
      ctx.restore();
      ctx.strokeStyle = metal;
      ctx.lineWidth = 2;
      if (comp === 'traditional') arch((W - pw) / 2 - 16, py - 16, pw + 32, ph + 16);
      else {
        ctx.beginPath();
        ctx.roundRect((W - pw) / 2 - 14, py - 14, pw + 28, ph + 28, 10);
      }
      ctx.stroke();
      top = py + ph + 70;
    } else if (comp === 'traditional') {
      // No portrait: the arch still crowns the text.
      ctx.strokeStyle = metal;
      ctx.lineWidth = 2;
      const r = W * 0.3;
      ctx.beginPath();
      ctx.arc(W / 2, top + r, r, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.fillStyle = metal;
      diamond(W / 2, top, 10);
      top += 60;
    }
    box = { x: 130, y: top, w: W - 260, h: H - top - 180, align: 'center', anchor: 'center' };
  } else {
    // Minimal: whitespace, one small photo, centred type.
    let top = square ? 110 : H * 0.1;
    if (photo) {
      const pw = square ? 220 : W * (tall ? 0.42 : 0.3);
      const ph = square ? 220 : pw * 1.25;
      ctx.save();
      ctx.beginPath();
      if (square) ctx.arc(W / 2, top + pw / 2, pw / 2, 0, Math.PI * 2);
      else ctx.rect((W - pw) / 2, top, pw, ph);
      ctx.clip();
      drawPhoto((W - pw) / 2, top, pw, ph);
      ctx.restore();
      top += ph + 80;
    } else top = square ? 150 : H * 0.2;
    ctx.fillStyle = metal;
    ctx.fillRect(W / 2 - 40, top - 36, 80, 2);
    box = { x: 120, y: top, w: W - 240, h: H - top - 170, align: 'center', anchor: 'center' };
  }

  // Typography-only cards let the type grow into the space a photo would have taken.
  const { lines, height } = layoutText(o.card.blocks, box.w, box.h, measure, photoShown ? 1 : tall ? 1.9 : 1.45);
  const y0 = box.anchor === 'bottom' ? box.y + box.h - height : box.y + Math.max(0, (box.h - height) / 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = box.align;
  const x = box.align === 'center' ? W / 2 : box.x;
  if (onPhoto) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 24;
  }
  for (const l of lines) {
    ctx.font = fontCss(l.font, o.design);
    ctx.letterSpacing = `${l.font.spacing}px`;
    ctx.fillStyle = color[l.role];
    ctx.fillText(l.text, x, y0 + l.y + l.height / 2);
  }

  ctx.shadowColor = 'transparent';
  if (o.branding) {
    ctx.font = `500 22px "${o.design.fonts.body}", system-ui, sans-serif`;
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = ink;
    ctx.fillText(o.branding, W / 2, H - (comp === 'luxury' || comp === 'traditional' ? 92 : 60));
    ctx.globalAlpha = 1;
  }
  return canvas;
}

export async function renderShareImage(o: ShareRenderOptions): Promise<Blob> {
  const canvas = await drawShareImage(o);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image'))), 'image/png'));
}
