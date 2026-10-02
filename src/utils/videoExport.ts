import { WeddingData } from '../types/wedding';
import { formatDate, formatTime, ResolvedDesign } from './design';

export type Aspect = '9:16' | '1:1' | '16:9';

export interface VideoScene {
  id: string;
  title: string;
  durationSeconds: number;
  photo: 'cover' | 'couple';
  kicker: string;
  heading: string;
  lines: string[];
}

/** The storyboard, built from the couple's own details. The on-screen preview and the exported file both read it. */
export function videoScenes(d: WeddingData): VideoScene[] {
  const events = [...d.events].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).slice(0, 4);
  return [
    { id: 'intro', title: 'Invitation', durationSeconds: 4, photo: 'cover', kicker: 'With the blessings of our families', heading: 'Two Souls.\nOne Journey.', lines: ['You are invited'] },
    { id: 'couple', title: 'The Couple', durationSeconds: 4.5, photo: 'couple', kicker: 'Together with their families', heading: `${d.partner1.name}\n&\n${d.partner2.name}`, lines: ['joyfully invite you to celebrate their wedding'] },
    { id: 'date', title: 'Save the Date', durationSeconds: 4, photo: 'cover', kicker: 'Save the date', heading: formatDate(d.weddingDate), lines: [`${formatTime(d.weddingTime)} onwards`, d.city] },
    { id: 'events', title: 'Celebrations', durationSeconds: 5, photo: 'cover', kicker: 'The celebrations', heading: '', lines: events.map((e) => `${e.title} · ${formatDate(e.date, 'short')}, ${formatTime(e.startTime)}`) },
    { id: 'venue', title: 'Venue', durationSeconds: 4, photo: 'couple', kicker: 'The venue', heading: d.mainVenue, lines: [[d.city, d.country].filter(Boolean).join(', ')] },
    { id: 'rsvp', title: 'RSVP', durationSeconds: 3.5, photo: 'cover', kicker: 'Kindly RSVP', heading: 'Your presence is\nour blessing', lines: [d.hashtag].filter(Boolean) },
  ];
}

export const SIZES: Record<Aspect, [number, number]> = { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] };

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) return resolve(null); // no photo: callers draw a typography-only frame
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

function pickMime() {
  const options = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  return options.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

export const canExportVideo = () => typeof MediaRecorder !== 'undefined' && !!pickMime() && 'captureStream' in HTMLCanvasElement.prototype;

/**
 * Renders the storyboard onto a canvas in real time and records it (plus `audio`, if given).
 * Takes as long as the video itself; resolves with the file.
 */
export async function renderVideo(opts: {
  data: WeddingData;
  design: ResolvedDesign;
  aspect: Aspect;
  audio?: MediaStream | null;
  onProgress?: (fraction: number) => void;
}): Promise<{ blob: Blob; extension: 'mp4' | 'webm' }> {
  const { data, design, aspect } = opts;
  const [W, H] = SIZES[aspect];
  const scenes = videoScenes(data);
  const total = scenes.reduce((s, x) => s + x.durationSeconds, 0);
  const [cover, couple] = await Promise.all([loadImage(data.coverPhotoUrl || data.couplePhotoUrl), loadImage(data.couplePhotoUrl)]);
  const heading = `"${design.fonts.heading}", Georgia, serif`;
  const body = `"${design.fonts.body}", system-ui, sans-serif`;
  await Promise.all([document.fonts.load(`64px ${heading}`), document.fonts.load(`32px ${body}`)]).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const unit = Math.min(W, H) / 1080; // type scales with the short side
  const gold = design.theme.secondary;

  const drawCover = (img: HTMLImageElement, scale: number, shiftX: number) => {
    const r = Math.max(W / img.width, H / img.height) * scale;
    const w = img.width * r;
    const h = img.height * r;
    ctx.drawImage(img, (W - w) / 2 + shiftX, (H - h) / 2, w, h);
  };

  const wrap = (text: string, maxWidth: number) => {
    const out: string[] = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  };

  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  function frame(t: number) {
    let start = 0;
    let i = 0;
    while (i < scenes.length - 1 && t >= start + scenes[i].durationSeconds) start += scenes[i++].durationSeconds;
    const scene = scenes[i];
    const local = t - start;
    const p = local / scene.durationSeconds;

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Backdrop: slow Ken Burns push, tinted with the template colour.
    const img = scene.photo === 'couple' ? couple ?? cover : cover ?? couple;
    if (img) {
      ctx.globalAlpha = 0.5;
      drawCover(img, 1.22 - 0.18 * p, (i % 2 ? 1 : -1) * 0.03 * W * (1 - p));
    }
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = design.theme.primary;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Text block, vertically centred; each line rises in on a stagger.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const blocks: { text: string; font: string; color: string; gap: number }[] = [];
    const kickerFont = `600 ${26 * unit}px ${body}`;
    const headFont = `${(scene.heading.length > 40 ? 64 : 86) * unit}px ${heading}`;
    const lineFont = `${(scene.id === 'events' ? 34 : 32) * unit}px ${body}`;
    ctx.font = kickerFont;
    blocks.push({ text: scene.kicker.toUpperCase().split('').join(' '), font: kickerFont, color: gold, gap: 36 * unit });
    ctx.font = headFont;
    for (const l of wrap(scene.heading, W * 0.8)) if (l) blocks.push({ text: l, font: headFont, color: '#FAF8F5', gap: 96 * unit });
    ctx.font = lineFont;
    for (const l of scene.lines) for (const w of wrap(l, W * 0.82)) blocks.push({ text: w, font: lineFont, color: 'rgba(255,255,255,0.88)', gap: 52 * unit });

    const height = blocks.reduce((s, b) => s + b.gap, 0);
    let y = H / 2 - height / 2;
    blocks.forEach((b, k) => {
      const a = ease((local - 0.1 - k * 0.14) / 1.1);
      ctx.globalAlpha = a * Math.min(1, (scene.durationSeconds - local) / 0.35); // fade out at the cut
      ctx.font = b.font;
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, W / 2, y + b.gap / 2 + (1 - a) * 26 * unit);
      y += b.gap;
    });

    // Gold hairlines frame the text.
    ctx.globalAlpha = 0.7 * ease(local / 1.2);
    ctx.fillStyle = gold;
    const lw = 160 * unit * ease(local / 1.2);
    ctx.fillRect(W / 2 - lw / 2, H / 2 - height / 2 - 40 * unit, lw, 2 * unit);
    ctx.fillRect(W / 2 - lw / 2, H / 2 + height / 2 + 40 * unit, lw, 2 * unit);
  }

  const mimeType = pickMime();
  const stream = canvas.captureStream(30);
  opts.audio?.getAudioTracks().forEach((track) => stream.addTrack(track));
  // 4 Mbps ≈ 13 MB for 25 s: under WhatsApp's 16 MB media limit.
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  frame(0);
  recorder.start(1000);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= total) return resolve();
      frame(t);
      opts.onProgress?.(t / total);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await done;
  opts.onProgress?.(1);
  return { blob: new Blob(chunks, { type: mimeType.split(';')[0] }), extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' };
}
