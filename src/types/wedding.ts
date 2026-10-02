import { ArchStyle, LayoutType, MotifType } from './template';
import type { PlanTier } from '../data/pricing';

export interface Partner {
  name: string;
  shortName: string;
  parents?: string;
  bio?: string;
  photoUrl?: string;
}

export interface WeddingEvent {
  id: string;
  eventType: 'mehendi' | 'haldi' | 'sangeet' | 'wedding' | 'reception' | 'cocktail' | 'anand_karaj' | 'nikah' | 'custom';
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  venue: string;
  address: string;
  city: string;
  dressCode?: string;
  description: string;
  mapUrl?: string;
  iconName?: string;
}

/** What a personal link (`?g=<token>`) knows about its guest. Built by the server's publicView. */
export interface GuestPersonalization {
  name: string;
  /** Seats the couple reserved; the RSVP can't ask for more. */
  seats?: number;
  /** The couple's line under "Dear <name>,". */
  note?: string;
  /** The couple has their number, so the RSVP doesn't ask for it. */
  hasPhone: boolean;
  /** Their latest reply, so they can see and change it. */
  reply?: Pick<GuestRSVP, 'attending' | 'guestsCount' | 'eventsAttending' | 'mealPreference'>;
}

export interface LoveStoryChapter {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption?: string;
}

export interface GuestRSVP {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  attending: boolean;
  guestsCount: number;
  eventsAttending: string[];
  mealPreference: 'vegetarian' | 'non_vegetarian' | 'jain' | 'vegan' | 'any';
  dietaryRestrictions?: string;
  message?: string;
  submittedAt: string;
}

export interface CustomDesignSettings {
  paletteId?: string;
  customPalette?: {
    name: string;
    primary: string;
    secondary: string;
    background: string;
    accent: string;
    surface?: string;
    text?: string;
  };
  fontHeading?: string;
  fontBody?: string;
  archStyle?: ArchStyle;
  motif?: MotifType;
  layout?: LayoutType;
  showWaxSealEnvelope?: boolean;
  ambientMusicEnabled?: boolean;
  personalizedGuestName?: string;
}

export interface WeddingData {
  id: string;
  partner1: Partner;
  partner2: Partner;
  displayFormat: 'partner1_and_partner2' | 'partner2_and_partner1';
  weddingDate: string; // YYYY-MM-DD
  weddingTime: string; // HH:mm
  mainVenue: string;
  address: string;
  city: string;
  country: string;
  mapUrl?: string;
  hashtag: string;
  welcomeMessage: string;
  closingMessage: string;
  dressCodeOverall?: string;
  coverPhotoUrl: string;
  couplePhotoUrl: string;
  story: LoveStoryChapter[];
  events: WeddingEvent[];
  gallery: GalleryPhoto[];
  selectedTemplateId: string;
  selectedMusicId: string;
  rsvps: GuestRSVP[];
  published: boolean;
  customSlug: string;
  customDesign?: CustomDesignSettings;
  plan?: PlanTier;
  invoiceId?: string;
  paidAt?: string;
  amountPaidInr?: number;
  /** Secret returned on first publish; proves this browser owns the live invitation. Never shared. */
  editKey?: string;
}

