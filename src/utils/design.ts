import type { CSSProperties } from 'react';
import { ArchStyle, LayoutType, MotifType, TemplateDefinition, TemplateTheme } from '../types/template';
import { CustomDesignSettings } from '../types/wedding';

export interface ResolvedDesign {
  theme: TemplateTheme;
  fonts: { heading: string; body: string };
  layout: LayoutType;
  arch: ArchStyle;
  motif: MotifType;
  floatingPetals: boolean;
  isDark: boolean;
}

/** Perceived-brightness check; dark themes put a near-black `primary` on a near-black background. */
export function isDarkColor(hex: string): boolean {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return false;
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 128;
}

/** Template defaults overlaid with the couple's customizations. Single source for site, video and previews. */
export function resolveDesign(template: TemplateDefinition, custom?: CustomDesignSettings): ResolvedDesign {
  const p = custom?.customPalette;
  const theme: TemplateTheme = p
    ? {
        primary: p.primary,
        secondary: p.secondary,
        accent: p.accent,
        background: p.background,
        surface: p.surface ?? p.background,
        text: p.text ?? template.theme.text,
        // Curated palettes don't carry muted/border tones, so derive them from text + background.
        textMuted: `color-mix(in oklab, ${p.text ?? template.theme.text} 62%, ${p.background})`,
        border: `color-mix(in oklab, ${p.text ?? template.theme.text} 14%, ${p.background})`,
      }
    : template.theme;

  return {
    theme,
    fonts: {
      heading: custom?.fontHeading ?? template.fonts.heading,
      body: custom?.fontBody ?? template.fonts.body,
    },
    layout: custom?.layout ?? template.layout,
    arch: custom?.archStyle ?? template.decorations.archStyle,
    motif: custom?.motif ?? template.decorations.motif,
    floatingPetals: template.decorations.floatingPetals,
    isDark: isDarkColor(theme.background),
  };
}

/**
 * CSS variables consumed by the `inv-*` colour utilities (see index.css) and by
 * Tailwind's `font-serif` / `font-sans`, so everything under this element repaints.
 */
export function designVars({ theme, fonts, isDark }: ResolvedDesign): CSSProperties {
  return {
    // Headings and buttons switch to the metallic tone on dark themes so they stay legible.
    '--inv-heading': isDark ? theme.secondary : theme.primary,
    '--inv-cta': isDark ? theme.secondary : theme.primary,
    '--inv-on-cta': isDark ? theme.background : '#FFFFFF',
    '--inv-primary': theme.primary,
    '--inv-secondary': theme.secondary,
    '--inv-accent': theme.accent,
    '--inv-bg': theme.background,
    '--inv-surface': theme.surface,
    '--inv-text': theme.text,
    '--inv-muted': theme.textMuted,
    '--inv-border': theme.border,
    '--font-serif': `"${fonts.heading}", Georgia, serif`,
    '--font-sans': `"${fonts.body}", system-ui, sans-serif`,
  } as CSSProperties;
}

/** Parses YYYY-MM-DD as a local date (new Date('2026-12-14') would be UTC midnight and can shift a day). */
export function parseLocalDate(date: string, time = '00:00'): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
}

/** A blank date only exists before the couple enters one (previews); publishing requires it. */
export function formatDate(date: string, style: 'long' | 'short' = 'long'): string {
  if (!date) return 'Your wedding date';
  return parseLocalDate(date).toLocaleDateString('en-IN', {
    weekday: style === 'long' ? 'long' : undefined,
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  });
}

export function formatTime(time: string): string {
  if (!time) return '';
  return parseLocalDate('2000-01-01', time).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function timeUntil(target: Date, now = Date.now()) {
  const ms = Math.max(0, target.getTime() - now) || 0; // no date yet: zeros, not NaN
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

/** "A · B" or "A, B" without dangling separators when a part is blank. */
export const joinParts = (parts: (string | undefined)[], sep: string) => parts.map((p) => p?.trim()).filter(Boolean).join(sep);
