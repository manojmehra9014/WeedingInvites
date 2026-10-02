import { WeddingData } from '../types/wedding';
import { TemplateDefinition } from '../types/template';

/** Where every couple starts: nothing about anyone. Only the couple's own input ever fills it. */
export const EMPTY_WEDDING: WeddingData = {
  id: 'wedding',
  partner1: { name: '', shortName: '' },
  partner2: { name: '', shortName: '' },
  displayFormat: 'partner1_and_partner2',
  weddingDate: '',
  weddingTime: '',
  mainVenue: '',
  address: '',
  city: '',
  country: '',
  hashtag: '',
  welcomeMessage: 'With the blessings of our families, we joyfully invite you to celebrate our wedding with us.',
  closingMessage: 'Your presence and blessings are the greatest gift we could ask for.',
  coverPhotoUrl: '',
  couplePhotoUrl: '',
  story: [],
  events: [],
  gallery: [],
  selectedTemplateId: 'tpl-royal-maroon',
  selectedMusicId: 'track-royal-shehnai',
  rsvps: [],
  published: false,
  customSlug: '',
};

export const hasCoupleNames = (d: WeddingData) => !!(d.partner1.name.trim() || d.partner2.name.trim());

/**
 * For previews only (landing, catalog, studio, video, onboarding preview): blank fields read as neutral labels.
 * Until the couple has typed their names, the template's own artwork stands in for photos.
 * Never applied to published guest pages or anything sent to the server.
 */
export function withPlaceholders(d: WeddingData, template?: Pick<TemplateDefinition, 'previewImageUrl'>): WeddingData {
  const name = (p: WeddingData['partner1'], label: string) =>
    p.name.trim() ? { ...p, shortName: p.shortName || p.name.trim().split(/\s+/)[0] } : { ...p, name: label, shortName: label };
  const artwork = !hasCoupleNames(d) && template ? template.previewImageUrl : '';
  return {
    ...d,
    partner1: name(d.partner1, 'Bride'),
    partner2: name(d.partner2, 'Groom'),
    mainVenue: d.mainVenue.trim() || 'Your venue',
    customSlug: d.customSlug || 'your-names',
    couplePhotoUrl: d.couplePhotoUrl || artwork,
    coverPhotoUrl: d.coverPhotoUrl || artwork,
  };
}
