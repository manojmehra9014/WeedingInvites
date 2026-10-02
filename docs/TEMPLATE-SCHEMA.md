# WeddingVerse — Template Schema & Engine Specification

## 1. Schema Philosophy
Templates in WeddingVerse are not hardcoded static pages. They are structured JSON configurations consumed by a universal component renderer.

## 2. Core Template Schema Type Definitions

```typescript
export interface TemplateSchema {
  id: string;
  name: string;
  slug: string;
  category: ('wedding' | 'engagement' | 'reception' | 'mehendi' | 'sangeet' | 'haldi' | 'nikah' | 'anand_karaj')[];
  culture: ('hindu' | 'punjabi' | 'gujarati' | 'south_indian' | 'marathi' | 'bengali' | 'muslim' | 'christian' | 'interfaith' | 'royal_fusion')[];
  style: ('royal' | 'minimal' | 'luxury' | 'floral' | 'palace' | 'dark_luxury' | 'pastel' | 'contemporary')[];
  layout: 'cinematic' | 'editorial' | 'royal_arch' | 'modern_split' | 'story_scroll';
  formats: ('website' | 'video' | 'card' | 'story')[];
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
  fonts: {
    heading: 'Cormorant Garamond' | 'Playfair Display' | 'Instrument Serif' | 'Cinzel';
    body: 'Plus Jakarta Sans' | 'Inter' | 'Lora' | 'Satoshi';
  };
  decorations: {
    archStyle: 'none' | 'mughal' | 'rajasthani' | 'minimal_oval' | 'classic_scallop';
    motif: 'marigold' | 'lotus' | 'peacock' | 'mandala' | 'botanical' | 'geometric_gold';
    showFloatingPetals: boolean;
  };
  sections: Array<{
    type: 'hero' | 'countdown' | 'story' | 'events' | 'gallery' | 'venue' | 'rsvp' | 'wishes' | 'footer';
    variant: string;
    enabled: boolean;
  }>;
}
```

## 3. 1,000+ Combinatorial Strategy
The catalog is derived from:
- 15 Layout styles
- 10 Cultural motifs & treatments
- 8 Curated Luxury Palettes
- 5 Editorial Typography pairings
- 4 Event timeline variants
= 6,000 potential unique deterministically-rendered templates.
Users can filter and preview dynamically.
