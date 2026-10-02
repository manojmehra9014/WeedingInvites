import { LayoutType } from '../types/template';

export const LAYOUT_OPTIONS: { id: LayoutType; label: string; description: string }[] = [
  { id: 'royal_arch', label: 'Royal Arch', description: 'Centred, ornamental, arch-framed portrait' },
  { id: 'cinematic', label: 'Cinematic', description: 'Full-bleed cover photo, timeline itinerary' },
  { id: 'editorial', label: 'Editorial', description: 'Magazine masthead, numbered chapters' },
  { id: 'modern_split', label: 'Modern Split', description: 'Side-by-side hero, gridded schedule' },
];

// Every family here must also be loaded by the Google Fonts link in index.html.
export const FONT_PAIRINGS: { id: string; label: string; heading: string; body: string }[] = [
  { id: 'heritage', label: 'Heritage', heading: 'Cormorant Garamond', body: 'Plus Jakarta Sans' },
  { id: 'modern', label: 'Modern', heading: 'Instrument Serif', body: 'Plus Jakarta Sans' },
  { id: 'classic', label: 'Classic Print', heading: 'Playfair Display', body: 'Lora' },
  { id: 'imperial', label: 'Imperial', heading: 'Cinzel', body: 'Cormorant Garamond' },
  { id: 'couture', label: 'Couture', heading: 'Bodoni Moda', body: 'Plus Jakarta Sans' },
  { id: 'riviera', label: 'Riviera', heading: 'Italiana', body: 'Lora' },
  { id: 'gallery', label: 'Gallery', heading: 'Marcellus', body: 'Plus Jakarta Sans' },
  { id: 'salon', label: 'Salon', heading: 'Gilda Display', body: 'Lora' },
];
