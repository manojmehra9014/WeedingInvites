import React from 'react';
import { AppView } from '../../hooks/useWeddingState';
import { DividerOrnament } from '../common/Motifs';
import jaipurPalaceImg from '../../assets/images/jaipur_palace_card_1790593706031.jpg';
import nikahEmeraldImg from '../../assets/images/nikah_emerald_card_1790593743217.jpg';
import pichwaiLotusImg from '../../assets/images/pichwai_lotus_card_1790593760203.jpg';
import kanjivaramSilkImg from '../../assets/images/kanjivaram_silk_card_1790593775425.jpg';
import goaBeachImg from '../../assets/images/goa_beach_card_1790593729962.jpg';
import tuscanEditorialImg from '../../assets/images/tuscan_editorial_card_1790593793298.jpg';

interface CulturalShowcaseProps {
  setCurrentView: (view: AppView) => void;
  selectTemplate: (id: string) => void;
}

export const CulturalShowcase: React.FC<CulturalShowcaseProps> = ({
  setCurrentView,
  selectTemplate,
}) => {
  const cultures = [
    {
      id: 'tpl-jaipur-lotus',
      name: 'Jaipur & Mewar Palace',
      tradition: 'Rajputana & Vedic Heritage',
      description: 'Pink sandstone jharokhas, hand-embossed 24k gold foil lotus motifs, and regal courtyard symmetry.',
      image: jaipurPalaceImg,
      color: '#8A2D43',
      accent: '#D4AF37',
    },
    {
      id: 'tpl-nikah-emerald',
      name: 'Noor-e-Nikah Royale',
      tradition: 'Islamic & Mughal Jali',
      description: 'Imperial emerald velvet with Moroccan filigree gold arches, crescent crests, and Dua-e-Khair blessings.',
      image: nikahEmeraldImg,
      color: '#0D382B',
      accent: '#D4AF37',
    },
    {
      id: 'tpl-pichwai-shrinath',
      name: 'Pichwai Lotus & Kamdhenu',
      tradition: 'Nathdwara Sacred Folk Art',
      description: 'Sacred blooming lotus ponds, divine painted white cows, holy bells, and pure gold leaf dust textures.',
      image: pichwaiLotusImg,
      color: '#942E46',
      accent: '#D9822B',
    },
    {
      id: 'tpl-kanjivaram-heritage',
      name: 'Chettinad & Kanjivaram',
      tradition: 'South Indian Temple Classical',
      description: 'Deep crimson temple silk with woven pure gold zari borders, auspicious brass diyas, and fresh jasmine.',
      image: kanjivaramSilkImg,
      color: '#781522',
      accent: '#CBA358',
    },
    {
      id: 'tpl-goa-sunset',
      name: 'Vagator Palms & Sunset',
      tradition: 'Beach Destination & Boho',
      description: 'Warm coral terracotta sunset over coconut palms, fairy lights, acoustic melodies, and beachside vows.',
      image: goaBeachImg,
      color: '#9C4F2B',
      accent: '#D49B55',
    },
    {
      id: 'tpl-tuscan-deckle',
      name: "Villa D'Este Tuscan Deckle",
      tradition: 'Modern Minimal & Editorial',
      description: 'Handmade deckle-edge cotton paper, blind debossed olive branches, stark Italian serifs, and quiet luxury.',
      image: tuscanEditorialImg,
      color: '#1D241D',
      accent: '#BFA370',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#FAF8F5] border-t border-[#E8E2D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span data-reveal className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-2">
            Cultural Depth &amp; Regional Heritage
          </span>
          <h2 data-split className="text-3xl sm:text-5xl md:text-6xl font-serif text-[#191614] mb-3 sm:mb-4">
            Honoring Every Sacred Tradition
          </h2>
          <p className="text-sm sm:text-base text-[#6B655E] px-2 leading-relaxed">
            From regal palace vows in Rajasthan to sacred Kanjivaram morning pheras and sun-kissed beach celebrations,
            our templates are crafted with authentic cultural depth.
          </p>
          <DividerOrnament color="#B38B45" className="my-5 sm:my-6" />
        </div>

        <div data-stagger="0.1" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cultures.map((c) => (
            <div
              key={c.name}
              data-tilt
              className="group rounded-2xl overflow-hidden bg-white border border-[#E8E2D8] hover:border-[#B38B45] hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[4/3] overflow-hidden bg-[#191614]">
                  <img
                    src={c.image}
                    alt={c.name}
                    data-parallax="-0.08"
                    className="absolute -top-[8%] left-0 h-[116%] w-full object-cover opacity-90 transition-[filter] duration-700 group-hover:brightness-110"
                  />
                  <div
                    className="absolute inset-0 opacity-25 mix-blend-multiply"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-[#E5CE9F] text-[10px] uppercase font-semibold backdrop-blur-sm">
                    {c.tradition}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="text-lg font-serif font-semibold text-[#191614] group-hover:text-[#B38B45] transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-[#6B655E] leading-relaxed">
                    {c.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={() => {
                    selectTemplate(c.id);
                    setCurrentView('invite-preview');
                  }}
                  className="w-full py-2.5 rounded-lg border border-[#E8E2D8] hover:border-[#191614] hover:bg-[#191614] hover:text-white text-xs font-semibold uppercase tracking-wider text-[#191614] transition-all cursor-pointer min-h-[40px]"
                >
                  Explore Collection
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
