import { ArchStyle, CultureType, LayoutType, MotifType, OccasionType, StyleType, TemplateDefinition, TemplateTheme } from '../types/template';
import { CURATED_COLOR_PALETTES } from './colorPalettes';
import { FONT_PAIRINGS } from './designOptions';
import { isDarkColor } from '../utils/design';
import heroCoupleImg from '../assets/images/wedding_hero_cinematic_1790593004833.jpg';
import palaceBgImg from '../assets/images/wedding_palace_twilight_1790593034810.jpg';
import mockupImg from '../assets/images/wedding_invitation_mockup_1790593019208.jpg';
import jaipurPalaceImg from '../assets/images/jaipur_palace_card_1790593706031.jpg';
import goaBeachImg from '../assets/images/goa_beach_card_1790593729962.jpg';
import nikahEmeraldImg from '../assets/images/nikah_emerald_card_1790593743217.jpg';
import pichwaiLotusImg from '../assets/images/pichwai_lotus_card_1790593760203.jpg';
import kanjivaramSilkImg from '../assets/images/kanjivaram_silk_card_1790593775425.jpg';
import tuscanEditorialImg from '../assets/images/tuscan_editorial_card_1790593793298.jpg';
import peacockPalaceImg from '../assets/images/peacock_royal_palace_1790594759898.jpg';
import kashmirChinarImg from '../assets/images/kashmir_saffron_chinar_1790594776696.jpg';
import frenchLavenderImg from '../assets/images/french_lavender_garden_1790594790111.jpg';
import punjabiPhulkariImg from '../assets/images/punjabi_phulkari_festive_1790594803480.jpg';

export const BASE_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'tpl-royal-maroon',
    name: 'Mewar Royal Arch',
    slug: 'mewar-royal-arch',
    tagline: 'Regal crimson velvet with hand-embossed antique gold jali arches',
    badge: 'Signature Royal',
    occasions: ['wedding', 'reception', 'sangeet'],
    culture: 'hindu',
    style: 'royal',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: heroCoupleImg,
    theme: {
      primary: '#6E1727', // Royal Crimson / Maroon
      secondary: '#C9A45C', // Antique Gold
      accent: '#B38B45',
      background: '#FBF8F4',
      surface: '#FFFFFF',
      text: '#201618',
      textMuted: '#68595C',
      border: '#E8DCCB',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'mandala',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'gu', 'mr'],
  },
  {
    id: 'tpl-jaipur-lotus',
    name: 'Jaipur Pink Mahal Lotus',
    slug: 'jaipur-pink-mahal-lotus',
    tagline: 'Sandstone rose quartz with delicate golden lotus motifs and vintage jharokha borders',
    badge: 'Heritage Award',
    occasions: ['wedding', 'engagement', 'reception'],
    culture: 'royal_fusion',
    style: 'palace',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: jaipurPalaceImg,
    theme: {
      primary: '#8A2D43', // Sandstone Rose
      secondary: '#D4AF37', // Polished Gold
      accent: '#C49742',
      background: '#FDF7F5',
      surface: '#FFFFFF',
      text: '#26151B',
      textMuted: '#6B525A',
      border: '#ECD9D4',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'lotus',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'gu'],
  },
  {
    id: 'tpl-nikah-emerald',
    name: 'Noor-e-Nikah Emerald Jali',
    slug: 'noor-e-nikah-emerald-jali',
    tagline: 'Imperial deep emerald with Moroccan filigree gold arches and crescent moon crest',
    badge: 'Nikah Royale',
    occasions: ['nikah', 'reception', 'engagement'],
    culture: 'muslim',
    style: 'luxury',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'cinematic',
    previewImageUrl: nikahEmeraldImg,
    theme: {
      primary: '#0D382B', // Imperial Emerald
      secondary: '#D4AF37', // Antique Moroccan Gold
      accent: '#A88434',
      background: '#F6FAF8',
      surface: '#FFFFFF',
      text: '#10241D',
      textMuted: '#4F665C',
      border: '#D3E3DC',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'temple_arch',
      motif: 'mandala',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'ur'],
  },
  {
    id: 'tpl-pichwai-shrinath',
    name: 'Pichwai Lotus & Kamdhenu',
    slug: 'pichwai-lotus-kamdhenu',
    tagline: 'Sacred blooming lotus pond, holy Kamdhenu cows, and artisanal 24k gold leaf dust',
    badge: 'Sacred Folk Art',
    occasions: ['wedding', 'haldi', 'mehendi'],
    culture: 'hindu',
    style: 'traditional',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: pichwaiLotusImg,
    theme: {
      primary: '#942E46', // Pichwai Rose
      secondary: '#D9822B', // Sacred Amber
      accent: '#C9A45C',
      background: '#FCF8F2',
      surface: '#FFFFFF',
      text: '#2A181E',
      textMuted: '#70535B',
      border: '#ECD8C5',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'lotus',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'gu', 'mr'],
  },
  {
    id: 'tpl-kanjivaram-heritage',
    name: 'Chettinad Kanjivaram Diya',
    slug: 'chettinad-kanjivaram-diya',
    tagline: 'Deep crimson temple silk with pure gold zari borders and sacred brass diya lanterns',
    badge: 'Temple Classical',
    occasions: ['wedding', 'engagement'],
    culture: 'south_indian',
    style: 'traditional',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: kanjivaramSilkImg,
    theme: {
      primary: '#781522', // Temple Kumkum
      secondary: '#CBA358', // Zari Gold
      accent: '#D99B26',
      background: '#FAF6EF',
      surface: '#FFFFFF',
      text: '#221114',
      textMuted: '#684F52',
      border: '#E8DCBF',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'temple_arch',
      motif: 'peacock',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'ta', 'te', 'kn', 'ml'],
  },
  {
    id: 'tpl-goa-sunset',
    name: 'Vagator Palms Bohemian Sunset',
    slug: 'vagator-palms-bohemian-sunset',
    tagline: 'Warm terracotta sunset over coconut palms, fairy lights, and deckle edge cotton paper',
    badge: 'Destination Beach',
    occasions: ['wedding', 'sangeet', 'cocktail', 'reception'],
    culture: 'interfaith',
    style: 'pastel',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'cinematic',
    previewImageUrl: goaBeachImg,
    theme: {
      primary: '#9C4F2B', // Sunset Terracotta
      secondary: '#D49B55', // Sandy Amber
      accent: '#5A6B5C', // Olive Sage
      background: '#FDF9F3',
      surface: '#FFFFFF',
      text: '#281A12',
      textMuted: '#6D594C',
      border: '#EADCCE',
    },
    fonts: {
      heading: 'Instrument Serif',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'botanical',
      hasGoldBorder: false,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi'],
  },
  {
    id: 'tpl-tuscan-deckle',
    name: "Villa D'Este Tuscan Deckle",
    slug: 'villa-deste-tuscan-deckle',
    tagline: 'Handmade cotton rag paper with blind-debossed olive branch crest and stark serif type',
    badge: 'Editorial Minimal',
    occasions: ['wedding', 'reception', 'save_the_date'],
    culture: 'modern_minimal',
    style: 'editorial',
    formats: ['website', 'card', 'story'],
    layout: 'editorial',
    previewImageUrl: tuscanEditorialImg,
    theme: {
      primary: '#1D241D', // Olive Noir
      secondary: '#8F8474', // Warm Taupe
      accent: '#BFA370', // Subtle Gold
      background: '#F9F7F2',
      surface: '#FFFFFF',
      text: '#1B1E1B',
      textMuted: '#696F69',
      border: '#E4DFD5',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lora',
    },
    decorations: {
      archStyle: 'minimal_oval',
      motif: 'botanical',
      hasGoldBorder: false,
      floatingPetals: false,
    },
    supportedLanguages: ['en'],
  },
  {
    id: 'tpl-emerald-heritage',
    name: 'Udaipur Emerald Darbar',
    slug: 'udaipur-emerald-darbar',
    tagline: 'Deep forest emerald paired with polished brass filigree and illuminated palace waters',
    badge: 'Royal Palace',
    occasions: ['wedding', 'engagement', 'reception'],
    culture: 'royal_fusion',
    style: 'palace',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: palaceBgImg,
    theme: {
      primary: '#18362B', // Deep Emerald
      secondary: '#D4B26F', // Polished Gold
      accent: '#B38B45',
      background: '#F8F9F7',
      surface: '#FFFFFF',
      text: '#13241C',
      textMuted: '#52685E',
      border: '#DDE5E0',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'lotus',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'pa'],
  },
  {
    id: 'tpl-ivory-minimal',
    name: 'Atelier Ivory & Serif',
    slug: 'atelier-ivory-serif',
    tagline: 'Warm textured handmade paper with stark editorial serifs and blind deboss',
    badge: 'Haute Minimal',
    occasions: ['wedding', 'reception', 'save_the_date'],
    culture: 'modern_minimal',
    style: 'minimal',
    formats: ['website', 'card', 'story'],
    layout: 'modern_split',
    previewImageUrl: mockupImg,
    theme: {
      primary: '#1D1A17', // Charcoal Ink
      secondary: '#8C8275', // Muted Taupe
      accent: '#C4A87C',
      background: '#FAF7F2',
      surface: '#FFFFFF',
      text: '#1D1A17',
      textMuted: '#6E675E',
      border: '#E6E0D7',
    },
    fonts: {
      heading: 'Instrument Serif',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'minimal_oval',
      motif: 'geometric',
      hasGoldBorder: false,
      floatingPetals: false,
    },
    supportedLanguages: ['en'],
  },
  {
    id: 'tpl-midnight-sapphire',
    name: 'Jodhpur Sapphire Nocturne',
    slug: 'jodhpur-sapphire-nocturne',
    tagline: 'Lustrous starry midnight indigo with gold constellation accents for celestial sangeet',
    badge: 'Cinematic Dark',
    occasions: ['sangeet', 'cocktail', 'reception'],
    culture: 'royal_fusion',
    style: 'dark_luxury',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'cinematic',
    previewImageUrl: heroCoupleImg,
    theme: {
      primary: '#0D1726', // Midnight Blue
      secondary: '#E6C98A', // Celestial Gold
      accent: '#D4B26F',
      background: '#070C14',
      surface: '#121F33',
      text: '#F5F7FA',
      textMuted: '#A0ADC0',
      border: '#233854',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'temple_arch',
      motif: 'geometric',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi'],
  },
  {
    id: 'tpl-rose-botanical',
    name: 'Gulab Bagh Botanical',
    slug: 'gulab-bagh-botanical',
    tagline: 'Blush English tea rose watercolours with sage leaf vines and deckle edges',
    badge: 'Romantic Floral',
    occasions: ['mehendi', 'wedding', 'engagement'],
    culture: 'interfaith',
    style: 'floral',
    formats: ['website', 'video', 'card'],
    layout: 'editorial',
    previewImageUrl: palaceBgImg,
    theme: {
      primary: '#7A2E3D', // Rose Wine
      secondary: '#4A5B4D', // Sage Olive
      accent: '#C79A73',
      background: '#FDF9F8',
      surface: '#FFFFFF',
      text: '#28171B',
      textMuted: '#785A62',
      border: '#EEDDD8',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'botanical',
      hasGoldBorder: false,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'bn'],
  },
  {
    id: 'tpl-sunlit-haldi',
    name: 'Kashmiri Saffron & Haldi',
    slug: 'kashmiri-saffron-haldi',
    tagline: 'Warm saffron mustard with joyous marigold garlands and folk brass bells',
    badge: 'Festive Vibrant',
    occasions: ['haldi', 'mehendi'],
    culture: 'punjabi',
    style: 'traditional',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'modern_split',
    previewImageUrl: mockupImg,
    theme: {
      primary: '#B86A04', // Saffron Mustard
      secondary: '#E09F3E', // Marigold Amber
      accent: '#D47A08',
      background: '#FFFBF2',
      surface: '#FFFFFF',
      text: '#2B1A04',
      textMuted: '#755428',
      border: '#F0E2C8',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'marigold',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'pa'],
  },
  {
    id: 'tpl-amritsar-anand',
    name: 'Amritsar Gurdwara Anand Karaj',
    slug: 'amritsar-gurdwara-anand-karaj',
    tagline: 'Sacred pure white marble aesthetic with divine gold foil Ek Onkar aura and floral kalash',
    badge: 'Anand Karaj',
    occasions: ['anand_karaj', 'wedding', 'reception'],
    culture: 'punjabi',
    style: 'royal',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: jaipurPalaceImg,
    theme: {
      primary: '#122543', // Royal Navy
      secondary: '#D4AF37', // Golden Temple Zari
      accent: '#C79F32',
      background: '#F9FAFC',
      surface: '#FFFFFF',
      text: '#121C2B',
      textMuted: '#58677E',
      border: '#D9E2EE',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'mandala',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'pa', 'hi'],
  },
  {
    id: 'tpl-varanasi-ghat',
    name: 'Kashi Sandhya Ganga Aarti',
    slug: 'kashi-sandhya-ganga-aarti',
    tagline: 'Sacred riverfront evening glow, terracotta diyas, and chants of eternal union',
    badge: 'Spiritual Vedic',
    occasions: ['wedding', 'engagement'],
    culture: 'hindu',
    style: 'traditional',
    formats: ['website', 'video', 'card'],
    layout: 'cinematic',
    previewImageUrl: pichwaiLotusImg,
    theme: {
      primary: '#851C2C', // Aarti Crimson
      secondary: '#DA8A28', // Glowing Diya Gold
      accent: '#B56E1A',
      background: '#FAF4EB',
      surface: '#FFFFFF',
      text: '#261317',
      textMuted: '#6E5559',
      border: '#E8DBC9',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'temple_arch',
      motif: 'marigold',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'sa'],
  },
  {
    id: 'tpl-south-temple',
    name: 'Madurai Temple Kanjivaram',
    slug: 'madurai-temple-kanjivaram',
    tagline: 'Auspicious vermillion and turmeric yellow inspired by woven silk borders',
    badge: 'Sacred Heritage',
    occasions: ['wedding', 'engagement'],
    culture: 'south_indian',
    style: 'traditional',
    formats: ['website', 'video', 'card'],
    layout: 'royal_arch',
    previewImageUrl: kanjivaramSilkImg,
    theme: {
      primary: '#851722', // Temple Kumkum
      secondary: '#B58D3D', // Zari Gold
      accent: '#C49742',
      background: '#FCF9F3',
      surface: '#FFFFFF',
      text: '#241416',
      textMuted: '#6B5456',
      border: '#E8D9C2',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'temple_arch',
      motif: 'peacock',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'ta', 'te', 'kn', 'ml'],
  },
  {
    id: 'tpl-modern-monochrome',
    name: 'Milanese Noir & Pearl',
    slug: 'milanese-noir-pearl',
    tagline: 'High-contrast monochromatic haute couture typography with pearl borders',
    badge: 'Contemporary',
    occasions: ['cocktail', 'reception', 'save_the_date'],
    culture: 'modern_minimal',
    style: 'contemporary',
    formats: ['website', 'video', 'story'],
    layout: 'modern_split',
    previewImageUrl: tuscanEditorialImg,
    theme: {
      primary: '#121212',
      secondary: '#555555',
      accent: '#999999',
      background: '#F7F7F7',
      surface: '#FFFFFF',
      text: '#111111',
      textMuted: '#666666',
      border: '#DEDEDE',
    },
    fonts: {
      heading: 'Instrument Serif',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'minimal_oval',
      motif: 'geometric',
      hasGoldBorder: false,
      floatingPetals: false,
    },
    supportedLanguages: ['en'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-peacock-indigo',
    name: 'Mayur Palace Royal Indigo',
    slug: 'mayur-palace-royal-indigo',
    tagline: 'Imperial Udaipur peacock blue and 24k gold leaf with Pichola lake reflections',
    badge: 'Udaipur Signature',
    occasions: ['wedding', 'reception', 'sangeet'],
    culture: 'royal_fusion',
    style: 'royal',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: peacockPalaceImg,
    theme: {
      primary: '#0E2F44', // Peacock Indigo
      secondary: '#E5B84B', // Radiant Gold
      accent: '#2C5D88',
      background: '#F0F5F9',
      surface: '#FFFFFF',
      text: '#0C1E2C',
      textMuted: '#4E677B',
      border: '#CBE0ED',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'peacock',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'gu', 'mr'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-kashmir-saffron',
    name: 'Noor-e-Kashmir Chinar & Saffron',
    slug: 'noor-e-kashmir-chinar-saffron',
    tagline: 'Dal Lake twilight sunset, golden Chinar leaf embroidery and royal Mughal garden romance',
    badge: 'Mughal Heritage',
    occasions: ['nikah', 'wedding', 'reception'],
    culture: 'muslim',
    style: 'luxury',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'cinematic',
    previewImageUrl: kashmirChinarImg,
    theme: {
      primary: '#7E1D2D', // Kashmiri Pashmina Wine
      secondary: '#DE9932', // Saffron Amber
      accent: '#B04B1D',
      background: '#FCF7F3',
      surface: '#FFFFFF',
      text: '#220E13',
      textMuted: '#68454D',
      border: '#E8D2C6',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'botanical',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'ur'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-french-lavender',
    name: 'Wisteria & Lavender Bloom',
    slug: 'wisteria-lavender-bloom',
    tagline: 'Dreamy pastel wisteria trellis with lilac watercolor washes and champagne foil calligraphy',
    badge: 'Pastel Botanical',
    occasions: ['engagement', 'wedding', 'cocktail'],
    culture: 'interfaith',
    style: 'pastel',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'editorial',
    previewImageUrl: frenchLavenderImg,
    theme: {
      primary: '#5D4068', // French Wisteria
      secondary: '#C99E74', // Champagne Gold
      accent: '#7D5C8A',
      background: '#F9F6FA',
      surface: '#FFFFFF',
      text: '#24172B',
      textMuted: '#65506E',
      border: '#DFD3E3',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lora',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'botanical',
      hasGoldBorder: false,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'fr'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-punjabi-phulkari',
    name: 'Dhol & Phulkari Jashn',
    slug: 'dhol-phulkari-jashn',
    tagline: 'Vibrant mustard yellow, sacred crimson phulkari embroidery and joyous musical dholak beats',
    badge: 'Festive Sangeet',
    occasions: ['sangeet', 'mehendi', 'haldi'],
    culture: 'punjabi',
    style: 'traditional',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'modern_split',
    previewImageUrl: punjabiPhulkariImg,
    theme: {
      primary: '#C77700', // Phulkari Mustard
      secondary: '#9B1B30', // Crimson Thread
      accent: '#DE9B15',
      background: '#FFFDF5',
      surface: '#FFFFFF',
      text: '#2E1900',
      textMuted: '#704B14',
      border: '#EED9A6',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'marigold',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'pa'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-shonar-bangla',
    name: 'Shonar Bangla Alpona & Topor',
    slug: 'shonar-bangla-alpona-topor',
    tagline: 'Sacred red vermillion, hand-drawn rice flour Alpona scrolls, and Rabindra musical soul',
    badge: 'Bengal Heritage',
    occasions: ['wedding', 'reception', 'engagement'],
    culture: 'bengali',
    style: 'traditional',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'editorial',
    previewImageUrl: pichwaiLotusImg,
    theme: {
      primary: '#9B111E', // Shankha-Pola Ruby Red
      secondary: '#D4AF37', // Polished Gold
      accent: '#BA2D3C',
      background: '#FCF8F5',
      surface: '#FFFFFF',
      text: '#240C0E',
      textMuted: '#684547',
      border: '#EEDCDA',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'lotus',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'bn'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-gujarati-patola',
    name: 'Patan Patola & Bandhani Raas',
    slug: 'patan-patola-bandhani-raas',
    tagline: 'Imperial geometric silk weave, radiant scarlet crimson, and auspicious elephant crests',
    badge: 'Gujarati Royale',
    occasions: ['wedding', 'sangeet', 'mehendi'],
    culture: 'gujarati',
    style: 'traditional',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: kanjivaramSilkImg,
    theme: {
      primary: '#851329', // Patola Scarlet
      secondary: '#DAA520', // Zari Amber
      accent: '#BF2638',
      background: '#FDF7F5',
      surface: '#FFFFFF',
      text: '#2B1218',
      textMuted: '#704850',
      border: '#ECD6D2',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'mandala',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'gu', 'hi'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-kerala-kasavu',
    name: 'Kumarakom Kasavu & Backwaters',
    slug: 'kumarakom-kasavu-backwaters',
    tagline: 'Pure off-white cotton with 24k gold Kasavu border, brass Nilavilakku glow and coconut palms',
    badge: 'Kerala Classical',
    occasions: ['wedding', 'engagement'],
    culture: 'south_indian',
    style: 'minimal',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'modern_split',
    previewImageUrl: goaBeachImg,
    theme: {
      primary: '#1A3323', // Kerala Palm Green
      secondary: '#D4AF37', // Pure Kasavu Gold
      accent: '#C59B27',
      background: '#FAF8F2',
      surface: '#FFFFFF',
      text: '#16241B',
      textMuted: '#586A5F',
      border: '#E8E1CE',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'temple_arch',
      motif: 'lotus',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'ml', 'ta'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-marathi-paithani',
    name: 'Peshwai Paithani & Mor-Bangadi',
    slug: 'peshwai-paithani-mor-bangadi',
    tagline: 'Deep royal purple silk, iridescent gold peacock zari motifs, and auspicious Chandrakor crest',
    badge: 'Maratha Royal',
    occasions: ['wedding', 'reception', 'sangeet'],
    culture: 'marathi',
    style: 'royal',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: peacockPalaceImg,
    theme: {
      primary: '#47184A', // Paithani Royal Purple
      secondary: '#E5B84B', // Shaniwar Wada Gold
      accent: '#6E2973',
      background: '#FAF6FA',
      surface: '#FFFFFF',
      text: '#220B24',
      textMuted: '#68456C',
      border: '#EADCEB',
    },
    fonts: {
      heading: 'Cinzel',
      body: 'Cormorant Garamond',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'peacock',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'mr', 'hi'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-himalayan-cedar',
    name: 'Shimla Pines & Champagne Chalet',
    slug: 'shimla-pines-champagne-chalet',
    tagline: 'Misty pine forest green, golden twilight glow, fireside warmth for mountain destination vows',
    badge: 'Mountain Destination',
    occasions: ['wedding', 'cocktail', 'reception'],
    culture: 'interfaith',
    style: 'luxury',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'cinematic',
    previewImageUrl: palaceBgImg,
    theme: {
      primary: '#1C352D', // Alpine Forest Green
      secondary: '#CCA460', // Warm Champagne Gold
      accent: '#3B584D',
      background: '#F7FAF8',
      surface: '#FFFFFF',
      text: '#13211C',
      textMuted: '#51645D',
      border: '#DCE5E0',
    },
    fonts: {
      heading: 'Instrument Serif',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'minimal_oval',
      motif: 'botanical',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-gatsby-art-deco',
    name: 'Manhattan Art Deco 1920s',
    slug: 'manhattan-art-deco-1920s',
    tagline: 'Obsidian black lacquer, geometric champagne chevron arches, and Great Gatsby grand ball flair',
    badge: 'Haute Noir',
    occasions: ['cocktail', 'reception', 'save_the_date'],
    culture: 'modern_minimal',
    style: 'dark_luxury',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'cinematic',
    previewImageUrl: heroCoupleImg,
    theme: {
      primary: '#111215', // Obsidian Lacquer
      secondary: '#DFB15B', // 24k Deco Gold
      accent: '#E5C07B',
      background: '#0B0C0E',
      surface: '#181A1F',
      text: '#F3F4F6',
      textMuted: '#9CA3AF',
      border: '#2C3038',
    },
    fonts: {
      heading: 'Cinzel',
      body: 'Cormorant Garamond',
    },
    decorations: {
      archStyle: 'minimal_oval',
      motif: 'geometric',
      hasGoldBorder: true,
      floatingPetals: false,
    },
    supportedLanguages: ['en'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-vrindavan-raslila',
    name: 'Vrindavan Kadamba & Mayur Plume',
    slug: 'vrindavan-kadamba-mayur-plume',
    tagline: 'Yamuna twilight blue, sacred peacock feather aura, and celestial bansuri flute romance',
    badge: 'Sacred Devotion',
    occasions: ['wedding', 'engagement', 'sangeet'],
    culture: 'hindu',
    style: 'royal',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'royal_arch',
    previewImageUrl: peacockPalaceImg,
    theme: {
      primary: '#12324C', // Yamuna Deep Teal
      secondary: '#E0AA3E', // Divine Pitambar Gold
      accent: '#28587B',
      background: '#F4F8FA',
      surface: '#FFFFFF',
      text: '#0E2233',
      textMuted: '#4F6C82',
      border: '#D2E1EC',
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'royal_arch',
      motif: 'peacock',
      hasGoldBorder: true,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'hi', 'sa'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
  {
    id: 'tpl-coorg-rainforest',
    name: 'Coorg Rainforest & Arabica Mist',
    slug: 'coorg-rainforest-arabica-mist',
    tagline: 'Lush Western Ghats moss, roasted hazelnut bronze, and deckle edge coffee blossom flora',
    badge: 'Estate Nature',
    occasions: ['wedding', 'engagement', 'cocktail'],
    culture: 'south_indian',
    style: 'floral',
    formats: ['website', 'video', 'card', 'story'],
    layout: 'editorial',
    previewImageUrl: tuscanEditorialImg,
    theme: {
      primary: '#2F4032', // Deep Moss
      secondary: '#9E6747', // Roasted Hazelnut
      accent: '#647D68',
      background: '#F8F9F5',
      surface: '#FFFFFF',
      text: '#1E2B20',
      textMuted: '#586A5A',
      border: '#DEE4DB',
    },
    fonts: {
      heading: 'Instrument Serif',
      body: 'Plus Jakarta Sans',
    },
    decorations: {
      archStyle: 'scalloped',
      motif: 'botanical',
      hasGoldBorder: false,
      floatingPetals: true,
    },
    supportedLanguages: ['en', 'kn', 'ta'],
    colorPalettes: CURATED_COLOR_PALETTES,
  },
];

/* ─────────────────────────── generated catalog ───────────────────────────
 * Every generated template is a unique palette × layout × font pairing combination.
 * Culture, style, occasions, name and photo are derived from the palette so they never contradict
 * each other. Run `npx tsx src/data/templatesCatalog.check.ts` after editing anything below.
 */

interface PaletteSeed {
  name: string;
  primary: string;
  secondary: string;
  bg: string;
  styles: StyleType[];
  cultures: CultureType[];
  surface?: string;
  text?: string;
  accent?: string;
}

const GENERATOR_PALETTES: PaletteSeed[] = [
  { name: 'Crimson Gold', primary: '#6E1727', secondary: '#C9A45C', bg: '#FBF8F4', styles: ['royal', 'palace', 'traditional'], cultures: ['hindu', 'royal_fusion', 'punjabi'] },
  { name: 'Emerald Brass', primary: '#1B362A', secondary: '#D4B26F', bg: '#F8F9F7', styles: ['luxury', 'royal'], cultures: ['muslim', 'royal_fusion', 'south_indian'] },
  { name: 'Sapphire Nocturne', primary: '#192638', secondary: '#E6C98A', bg: '#0A121E', styles: ['dark_luxury'], cultures: ['interfaith', 'royal_fusion', 'muslim'] },
  { name: 'Terracotta Sand', primary: '#854D27', secondary: '#E0A96D', bg: '#FAF6F0', styles: ['editorial', 'contemporary'], cultures: ['interfaith', 'gujarati', 'christian'] },
  { name: 'Rose Quartz', primary: '#7A2E3D', secondary: '#C79A73', bg: '#FDF9F8', styles: ['floral', 'pastel'], cultures: ['christian', 'interfaith', 'hindu'] },
  { name: 'Raw Silk', primary: '#4A3B32', secondary: '#B89B72', bg: '#F9F7F5', styles: ['minimal', 'editorial'], cultures: ['modern_minimal', 'interfaith', 'bengali'] },
  { name: 'Lilac Mist', primary: '#2D3142', secondary: '#B0A8B9', bg: '#F6F6F8', styles: ['pastel', 'minimal'], cultures: ['christian', 'modern_minimal'] },
  { name: 'Saffron Sun', primary: '#B86A04', secondary: '#E09F3E', bg: '#FFFBF2', styles: ['traditional', 'floral'], cultures: ['hindu', 'gujarati', 'marathi'] },
  { name: 'Imperial Jali', primary: '#0D382B', secondary: '#D4AF37', bg: '#F6FAF8', styles: ['palace', 'luxury'], cultures: ['muslim', 'royal_fusion'] },
  { name: 'Pichwai Glow', primary: '#942E46', secondary: '#D9822B', bg: '#FCF8F2', styles: ['traditional', 'floral'], cultures: ['hindu', 'gujarati'] },
  { name: 'Kanjivaram Zari', primary: '#781522', secondary: '#CBA358', bg: '#FAF6EF', styles: ['traditional', 'royal'], cultures: ['south_indian', 'marathi'] },
  { name: 'Peshwai Purple', primary: '#47184A', secondary: '#E5B84B', bg: '#FAF6FA', styles: ['royal', 'luxury'], cultures: ['marathi', 'royal_fusion'] },
  { name: 'Kasavu Cream', primary: '#1A3323', secondary: '#D4AF37', bg: '#FAF8F2', styles: ['minimal', 'traditional'], cultures: ['south_indian', 'bengali'] },
  { name: 'Art Deco Noir', primary: '#111215', secondary: '#DFB15B', bg: '#0B0C0E', styles: ['dark_luxury', 'editorial'], cultures: ['interfaith', 'christian', 'modern_minimal'] },
  { name: 'Banarasi Magenta', primary: '#7B1450', secondary: '#D9A94E', bg: '#FCF7F8', styles: ['royal', 'traditional'], cultures: ['hindu', 'punjabi', 'gujarati'] },
  { name: 'Mughal Turquoise', primary: '#0F4C5C', secondary: '#C99A48', bg: '#F5F9F8', styles: ['palace', 'luxury'], cultures: ['muslim', 'royal_fusion'] },
  { name: 'Bordeaux Champagne', primary: '#5A1A2B', secondary: '#C4A06A', bg: '#FBF7F2', styles: ['luxury', 'royal'], cultures: ['christian', 'interfaith', 'royal_fusion'] },
  { name: 'Sindoor Marigold', primary: '#9C2A12', secondary: '#E3A13A', bg: '#FFF9F0', styles: ['traditional', 'floral'], cultures: ['hindu', 'marathi', 'bengali'] },
  { name: 'Temple Bronze', primary: '#3E2A14', secondary: '#C8963E', bg: '#FAF5EC', styles: ['traditional', 'palace'], cultures: ['south_indian', 'marathi'] },
  { name: 'Alta Crimson', primary: '#8E1B1B', secondary: '#D8AE63', bg: '#FFFAF4', styles: ['traditional', 'royal'], cultures: ['bengali', 'hindu'] },
  { name: 'Champagne Ivory', primary: '#3B3530', secondary: '#B08F5E', bg: '#FBF9F5', styles: ['minimal', 'editorial'], cultures: ['modern_minimal', 'christian'] },
  { name: 'Onyx Rose Gold', primary: '#1A1416', secondary: '#E3B7A0', bg: '#0E0B0C', styles: ['dark_luxury', 'luxury'], cultures: ['interfaith', 'modern_minimal', 'punjabi'] },
];

// Style/culture tags for the curated customizer palettes, so they join the generator too.
const CURATED_TAGS: Record<string, Pick<PaletteSeed, 'styles' | 'cultures'>> = {
  palette_royal_maroon: { styles: ['royal', 'palace'], cultures: ['royal_fusion', 'hindu'] },
  palette_imperial_emerald: { styles: ['luxury', 'palace'], cultures: ['muslim', 'punjabi'] },
  palette_peacock_indigo: { styles: ['royal', 'luxury'], cultures: ['hindu', 'marathi'] },
  palette_jaipur_rose: { styles: ['palace', 'floral'], cultures: ['royal_fusion', 'punjabi'] },
  palette_kashi_saffron: { styles: ['traditional'], cultures: ['hindu', 'bengali'] },
  palette_chettinad_crimson: { styles: ['traditional', 'royal'], cultures: ['south_indian'] },
  palette_french_lavender: { styles: ['pastel', 'floral'], cultures: ['christian', 'interfaith'] },
  palette_tuscan_olive: { styles: ['editorial', 'contemporary'], cultures: ['interfaith', 'christian'] },
  palette_midnight_velvet: { styles: ['dark_luxury'], cultures: ['modern_minimal', 'interfaith'] },
  palette_punjabi_mustard: { styles: ['traditional', 'floral'], cultures: ['punjabi', 'gujarati'] },
};

/** Linear blend of two #RRGGBB colours; t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Jewel-toned dark edition of a light palette: its own primary deepened into the background. */
function nocturne(p: PaletteSeed): PaletteSeed {
  // Headings use `secondary` on dark themes, so it must be the lighter of the two accents.
  const metal = isDarkColor(p.secondary) ? p.primary : p.secondary;
  return {
    name: `${p.name} Nocturne`,
    primary: mix(p.primary, '#000000', 0.3),
    secondary: mix(metal, '#FFFFFF', 0.15),
    bg: mix(p.primary, '#000000', 0.78),
    surface: mix(p.primary, '#000000', 0.66),
    styles: ['dark_luxury', ...p.styles.filter((s) => s !== 'pastel' && s !== 'minimal')],
    cultures: p.cultures,
  };
}

function themeFrom(p: PaletteSeed): TemplateTheme {
  const dark = isDarkColor(p.bg);
  const text = p.text ?? (dark ? '#F4F1EA' : '#1C1917');
  return {
    primary: p.primary,
    secondary: p.secondary,
    accent: p.accent ?? p.secondary,
    background: p.bg,
    surface: p.surface ?? (dark ? mix(p.bg, '#FFFFFF', 0.06) : '#FFFFFF'),
    text,
    textMuted: mix(text, p.bg, 0.4),
    border: mix(text, p.bg, 0.86),
  };
}

const LIGHT_PALETTES: PaletteSeed[] = [
  ...GENERATOR_PALETTES,
  ...CURATED_COLOR_PALETTES.map((c) => ({
    name: c.name.split(' & ')[0],
    primary: c.primary,
    secondary: c.secondary,
    accent: c.accent,
    bg: c.background,
    surface: c.surface,
    text: c.text,
    ...CURATED_TAGS[c.id],
  })),
];

export const CATALOG_PALETTES: PaletteSeed[] = [
  ...LIGHT_PALETTES,
  ...LIGHT_PALETTES.filter((p) => !isDarkColor(p.bg)).map(nocturne),
];

const OCCASIONS_BY_CULTURE: Record<CultureType, OccasionType[][]> = {
  hindu: [['wedding', 'reception'], ['wedding', 'mehendi', 'sangeet'], ['haldi', 'mehendi'], ['engagement'], ['save_the_date']],
  royal_fusion: [['wedding', 'reception'], ['sangeet', 'cocktail'], ['engagement'], ['save_the_date']],
  punjabi: [['anand_karaj', 'reception'], ['sangeet', 'cocktail'], ['mehendi', 'haldi'], ['engagement']],
  gujarati: [['wedding', 'reception'], ['mehendi', 'sangeet'], ['haldi'], ['engagement']],
  south_indian: [['wedding', 'reception'], ['engagement'], ['haldi'], ['save_the_date']],
  marathi: [['wedding', 'reception'], ['haldi', 'sangeet'], ['engagement']],
  bengali: [['wedding', 'reception'], ['haldi'], ['save_the_date']],
  muslim: [['nikah', 'reception'], ['mehendi', 'sangeet'], ['engagement']],
  christian: [['church_wedding', 'reception'], ['cocktail'], ['engagement'], ['save_the_date']],
  interfaith: [['wedding', 'reception'], ['sangeet', 'cocktail'], ['engagement'], ['save_the_date']],
  modern_minimal: [['wedding', 'reception'], ['cocktail'], ['save_the_date']],
};

// Place names never repeat across cultures, which keeps generated names globally unique.
const PLACES_BY_CULTURE: Record<CultureType, string[]> = {
  hindu: ['Varanasi', 'Rishikesh', 'Vrindavan', 'Ujjain', 'Pushkar', 'Haridwar', 'Mathura', 'Ayodhya', 'Nathdwara', 'Omkareshwar'],
  royal_fusion: ['Mewar', 'Rambagh', 'Udaivilas', 'Amber', 'Mehrangarh', 'Jaisalmer', 'Chittor', 'Bikaner', 'Neemrana', 'Samode'],
  punjabi: ['Amritsar', 'Patiala', 'Kapurthala', 'Anandpur', 'Ludhiana', 'Jalandhar', 'Nabha', 'Faridkot', 'Bathinda', 'Ropar'],
  gujarati: ['Patan', 'Kutch', 'Vadodara', 'Bhuj', 'Somnath', 'Champaner', 'Rajkot', 'Surat', 'Bhavnagar', 'Junagadh'],
  south_indian: ['Chettinad', 'Kanjivaram', 'Madurai', 'Mysore', 'Thanjavur', 'Kumarakom', 'Kovalam', 'Hampi', 'Coorg', 'Mahabalipuram'],
  marathi: ['Peshwa', 'Paithan', 'Kolhapur', 'Nashik', 'Shaniwar', 'Alibaug', 'Satara', 'Raigad', 'Sinhagad', 'Tuljapur'],
  bengali: ['Shonar', 'Kolkata', 'Shantiniketan', 'Murshidabad', 'Bishnupur', 'Hooghly', 'Sundarban', 'Darjeeling', 'Kalimpong', 'Nabadwip'],
  muslim: ['Nawab', 'Lucknow', 'Hyderabad', 'Bhopal', 'Rampur', 'Awadh', 'Deccan', 'Mughal', 'Firdaus', 'Noor'],
  christian: ['Fontainhas', 'Pondicherry', 'Shillong', 'Kochi', 'Bandra', 'Mussoorie', 'Ooty', 'Kodaikanal', 'Tranquebar', 'Panjim', 'Lonavala', 'Munnar', 'Shimla', 'Mangalore', 'Assagao'],
  interfaith: ['Amalfi', 'Santorini', 'Provence', 'Tuscany', 'Kyoto', 'Lisbon', 'Seville', 'Bali', 'Marrakech', 'Cappadocia', 'Como', 'Positano', 'Mykonos', 'Dubrovnik', 'Capri'],
  modern_minimal: ['Linen', 'Ivory', 'Mono', 'Atelier', 'Studio', 'Paper', 'Quartz', 'Slate', 'Nordic', 'Alabaster', 'Porcelain', 'Vellum', 'Opaline', 'Travertine', 'Chalk'],
};

const UNIVERSAL_SUFFIXES = ['Pavilion', 'Courtyard', 'Vows', 'Serenade', 'Heirloom', 'Symphony', 'Manuscript', 'Reverie', 'Promenade', 'Folio', 'Chronicle', 'Soirée', 'Garden', 'Terrace', 'Veranda', 'Aria', 'Ballad'];
const INDIAN_SUFFIXES = ['Darbar', 'Jharokha', 'Mahal', 'Bagh', 'Vilas', 'Utsav', 'Sangam', 'Haveli', 'Zari', 'Toran', 'Mandap', 'Shehnai'];
const GLOBAL_CULTURES: CultureType[] = ['christian', 'interfaith', 'modern_minimal'];

// Photo pool per culture so a Nikah template never opens on a Goa beach.
const IMAGES_BY_CULTURE: Record<CultureType, string[]> = {
  hindu: [pichwaiLotusImg, heroCoupleImg, palaceBgImg],
  royal_fusion: [jaipurPalaceImg, peacockPalaceImg, palaceBgImg, heroCoupleImg],
  punjabi: [punjabiPhulkariImg, jaipurPalaceImg, heroCoupleImg],
  gujarati: [punjabiPhulkariImg, pichwaiLotusImg, jaipurPalaceImg],
  south_indian: [kanjivaramSilkImg, goaBeachImg, pichwaiLotusImg],
  marathi: [peacockPalaceImg, kanjivaramSilkImg, heroCoupleImg],
  bengali: [pichwaiLotusImg, kashmirChinarImg, heroCoupleImg],
  muslim: [nikahEmeraldImg, kashmirChinarImg, palaceBgImg],
  christian: [goaBeachImg, frenchLavenderImg, tuscanEditorialImg],
  interfaith: [tuscanEditorialImg, frenchLavenderImg, goaBeachImg, mockupImg],
  modern_minimal: [mockupImg, tuscanEditorialImg, frenchLavenderImg],
};

const LAYOUTS: LayoutType[] = ['royal_arch', 'cinematic', 'editorial', 'modern_split'];
const ARCHES: Exclude<ArchStyle, 'none'>[] = ['royal_arch', 'temple_arch', 'scalloped', 'minimal_oval'];
const MOTIFS: MotifType[] = ['marigold', 'lotus', 'peacock', 'mandala', 'botanical', 'geometric'];
const ARCH_LABEL: Record<ArchStyle, string> = { royal_arch: 'Rajput', temple_arch: 'Temple', scalloped: 'Scalloped', minimal_oval: 'Oval', none: 'Open' };

function tagline(layout: LayoutType, palette: string, font: string, motif: MotifType, arch: ArchStyle): string {
  switch (layout) {
    case 'cinematic':
      return `Full-bleed cinematic opening in ${palette}, ${font} titles and ${motif} accents`;
    case 'editorial':
      return `Magazine-style ${palette} spread with ${font} headlines and ${motif} flourishes`;
    case 'modern_split':
      return `Split-screen ${palette} hero, gridded itinerary, ${font} type and ${motif} detail`;
    default:
      return `${ARCH_LABEL[arch]} arch in ${palette}, crowned with ${motif} ornament and ${font} lettering`;
  }
}

/** Deterministic PRNG so the catalog order is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Visual identity of a template; two templates with the same signature look the same. */
export function designSignature(t: TemplateDefinition): string {
  const { theme, layout, fonts } = t;
  return [theme.primary, theme.secondary, theme.background, layout, fonts.heading, fonts.body].join('|').toUpperCase();
}

export function generateCatalog(): TemplateDefinition[] {
  const combos: { palette: PaletteSeed; layout: LayoutType; font: (typeof FONT_PAIRINGS)[number] }[] = [];
  for (const palette of CATALOG_PALETTES)
    for (const layout of LAYOUTS) for (const font of FONT_PAIRINGS) combos.push({ palette, layout, font });

  const rand = mulberry32(20261214);
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }

  const result: TemplateDefinition[] = [...BASE_TEMPLATES];
  const seenSignatures = new Set(BASE_TEMPLATES.map(designSignature));
  const seenNames = new Set(BASE_TEMPLATES.map((t) => t.name));
  const perCulture = new Map<CultureType, number>();

  combos.forEach(({ palette, layout, font }, k) => {
    const culture = palette.cultures[k % palette.cultures.length];
    const n = perCulture.get(culture) ?? 0;
    perCulture.set(culture, n + 1);

    const places = PLACES_BY_CULTURE[culture];
    const suffixes = GLOBAL_CULTURES.includes(culture) ? UNIVERSAL_SUFFIXES : [...INDIAN_SUFFIXES, ...UNIVERSAL_SUFFIXES];
    // Place and suffix both advance every step (neighbours never share a word), and the walk is a
    // bijection over places×suffixes while gcd(places + 1, suffixes) = 1. A per-culture offset keeps
    // the first template of each culture from all landing on the same suffix.
    const offset = Object.keys(PLACES_BY_CULTURE).indexOf(culture) * 5;
    const place = places[n % places.length];
    const suffix = suffixes[((n % places.length) + Math.floor(n / places.length) * (places.length + 1) + offset) % suffixes.length];
    let name = `${place} ${suffix}`;
    if (seenNames.has(name)) name = `${name} · ${palette.name}`;

    const motif = MOTIFS[k % MOTIFS.length];
    const archStyle = ARCHES[k % ARCHES.length];
    const template: TemplateDefinition = {
      id: `tpl-g${k + 1}`,
      name,
      slug: name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      tagline: tagline(layout, palette.name, font.heading, motif, archStyle),
      occasions: OCCASIONS_BY_CULTURE[culture][n % OCCASIONS_BY_CULTURE[culture].length],
      culture,
      style: palette.styles[k % palette.styles.length],
      formats: ['website', 'video', 'card', 'story'],
      layout,
      previewImageUrl: IMAGES_BY_CULTURE[culture][n % IMAGES_BY_CULTURE[culture].length],
      theme: themeFrom(palette),
      fonts: { heading: font.heading, body: font.body },
      decorations: {
        archStyle,
        motif,
        hasGoldBorder: !palette.styles.includes('minimal'),
        floatingPetals: !palette.styles.includes('minimal'),
      },
      supportedLanguages: GLOBAL_CULTURES.includes(culture) ? ['en'] : ['en', 'hi'],
      colorPalettes: CURATED_COLOR_PALETTES,
    };

    const sig = designSignature(template);
    if (seenSignatures.has(sig)) return; // a hand-authored template already owns this look
    seenSignatures.add(sig);
    seenNames.add(name);
    result.push(template);
  });

  return result;
}

/**
 * A showcase set where no two templates share a layout+font, a font twice in a row, or a palette:
 * the fastest way to show the catalog's range on the landing page.
 */
export function pickShowcase(all: TemplateDefinition[], count: number): TemplateDefinition[] {
  const picked: TemplateDefinition[] = [];
  const palettes = new Set<string>();
  for (let i = 0; picked.length < count && i < LAYOUTS.length * 50; i++) {
    const layout = LAYOUTS[picked.length % LAYOUTS.length];
    const prevFont = picked[picked.length - 1]?.fonts.heading;
    const t = all.find(
      (c) =>
        c.layout === layout &&
        c.fonts.heading !== prevFont &&
        !palettes.has(c.theme.primary) &&
        !picked.some((p) => p.id === c.id || (p.layout === c.layout && p.fonts.heading === c.fonts.heading)),
    );
    if (!t) break;
    picked.push(t);
    palettes.add(t.theme.primary);
  }
  return picked;
}
