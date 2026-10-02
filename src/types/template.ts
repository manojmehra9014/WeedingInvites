export type OccasionType = 
  | 'wedding' 
  | 'engagement' 
  | 'reception' 
  | 'mehendi' 
  | 'sangeet' 
  | 'haldi' 
  | 'nikah' 
  | 'anand_karaj' 
  | 'church_wedding'
  | 'cocktail'
  | 'save_the_date';

export type CultureType = 
  | 'hindu' 
  | 'punjabi' 
  | 'gujarati' 
  | 'south_indian' 
  | 'marathi' 
  | 'bengali' 
  | 'muslim' 
  | 'christian' 
  | 'interfaith' 
  | 'royal_fusion'
  | 'modern_minimal';

export type StyleType = 
  | 'royal' 
  | 'minimal' 
  | 'luxury' 
  | 'floral' 
  | 'palace' 
  | 'dark_luxury' 
  | 'pastel' 
  | 'contemporary'
  | 'traditional'
  | 'editorial';

export type FormatType = 'website' | 'video' | 'card' | 'story';

// Layout drives the whole guest-site composition: hero treatment, section order and section variants.
export type LayoutType = 'royal_arch' | 'cinematic' | 'editorial' | 'modern_split';

export type ArchStyle = 'royal_arch' | 'temple_arch' | 'scalloped' | 'minimal_oval' | 'none';
export type MotifType = 'marigold' | 'lotus' | 'peacock' | 'mandala' | 'botanical' | 'geometric';

export interface TemplateTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface ColorPaletteOption {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  badge?: string;
  occasions: OccasionType[];
  culture: CultureType;
  style: StyleType;
  formats: FormatType[];
  layout: LayoutType;
  previewImageUrl: string;
  theme: TemplateTheme;
  fonts: {
    heading: string;
    body: string;
  };
  decorations: {
    archStyle: ArchStyle;
    motif: MotifType;
    hasGoldBorder: boolean;
    floatingPetals: boolean;
  };
  supportedLanguages: string[];
  colorPalettes?: ColorPaletteOption[];
}

