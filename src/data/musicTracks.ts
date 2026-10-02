import { SITE } from '../../site.config';
// Original music synthesised live in the browser (utils/audioEngine): no licensing, no downloads.
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: 'Romantic' | 'Royal Shehnai' | 'Classical Sitar' | 'Celebration' | 'Calm Piano';
  durationSeconds: number;
  bpm: number;
  mood: string;
  /** Synth voicing: drone root in Hz and average seconds between chimes. */
  rootHz: number;
  chimeEverySeconds: number;
}

export const WEDDING_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track-royal-shehnai',
    rootHz: 73.42,
    chimeEverySeconds: 3.4,
    title: 'Kalyan Darbar (Tanpura in D)',
    artist: `${SITE.name} Originals`,
    category: 'Royal Shehnai',
    durationSeconds: 165,
    bpm: 78,
    mood: 'Regal, Sacred, Auspicious',
  },
  {
    id: 'track-sitar-morning',
    rootHz: 82.41,
    chimeEverySeconds: 2.6,
    title: 'Yaman in Bloom (Tanpura in E)',
    artist: `${SITE.name} Originals`,
    category: 'Classical Sitar',
    durationSeconds: 190,
    bpm: 82,
    mood: 'Emotional, Warm, Meditative',
  },
  {
    id: 'track-romantic-piano',
    rootHz: 65.41,
    chimeEverySeconds: 4.2,
    title: 'Eternal Vows (Slow drone in C)',
    artist: `${SITE.name} Originals`,
    category: 'Romantic',
    durationSeconds: 145,
    bpm: 72,
    mood: 'Romantic, Cinematic, Moving',
  },
  {
    id: 'track-dhol-sangeet',
    rootHz: 98.0,
    chimeEverySeconds: 1.4,
    title: 'Sangeet Bells (Bright, in G)',
    artist: `${SITE.name} Originals`,
    category: 'Celebration',
    durationSeconds: 130,
    bpm: 112,
    mood: 'Festive, Joyous, Uplifting',
  },
  {
    id: 'track-flute-serenade',
    rootHz: 87.31,
    chimeEverySeconds: 5.0,
    title: 'Lakeside Calm (Ambient in F)',
    artist: `${SITE.name} Originals`,
    category: 'Calm Piano',
    durationSeconds: 180,
    bpm: 68,
    mood: 'Peaceful, Divine, Soft',
  },
];
