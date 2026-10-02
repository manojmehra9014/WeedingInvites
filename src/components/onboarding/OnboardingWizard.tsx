import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { track } from '../../utils/analytics';
import { WeddingData, WeddingEvent } from '../../types/wedding';
import { AppView } from '../../hooks/useWeddingState';
import { TemplateDefinition } from '../../types/template';
import { 
  Heart, Calendar, MapPin, Sparkles, Image as ImageIcon, 
  Palette, Plus, Trash2, ArrowRight, ArrowLeft, Check, Wand2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TemplateThumbnail } from '../templates/TemplateThumbnail';
import { InvitationSite } from '../templates/InvitationSite';
import { resolveDesign } from '../../utils/design';
import { gsap, prefersReducedMotion } from '../../utils/gsap';
import { resizeImage } from '../../utils/image';
import { GalleryPhoto, LoveStoryChapter } from '../../types/wedding';
import { withPlaceholders } from '../../data/emptyWedding';

const EVENT_PRESETS: [string, WeddingEvent['eventType'], string][] = [
  ['Haldi', 'haldi', '10:00'],
  ['Mehendi', 'mehendi', '16:00'],
  ['Sangeet', 'sangeet', '19:00'],
  ['Baraat', 'custom', '17:00'],
  ['Wedding', 'wedding', '19:00'],
  ['Nikah', 'nikah', '12:00'],
  ['Walima', 'custom', '19:00'],
  ['Anand Karaj', 'anand_karaj', '10:00'],
  ['Church Ceremony', 'custom', '11:00'],
  ['Cocktail', 'cocktail', '20:00'],
  ['Reception', 'reception', '19:30'],
  ['Custom event', 'custom', '19:00'],
];

// The name shown in the hero, envelope and video is the first word of the full name.
const firstName = (full: string, fallback: string) => full.trim().split(/\s+/)[0] || fallback;

interface OnboardingWizardProps {
  weddingData: WeddingData;
  updateWeddingData: (updates: Partial<WeddingData>) => void;
  allTemplates: TemplateDefinition[];
  selectedTemplateId: string;
  selectTemplate: (id: string) => void;
  setCurrentView: (view: AppView) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  weddingData,
  updateWeddingData,
  allTemplates,
  selectedTemplateId,
  selectTemplate,
  setCurrentView,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStepText, setGenerationStepText] = useState<string>('');
  const [generationProgress, setGenerationProgress] = useState(0);

  // Local draft state
  const [partner1Name, setPartner1Name] = useState(weddingData.partner1.name);
  const [partner2Name, setPartner2Name] = useState(weddingData.partner2.name);
  const [weddingDate, setWeddingDate] = useState(weddingData.weddingDate);
  const [weddingTime, setWeddingTime] = useState(weddingData.weddingTime);
  const [mainVenue, setMainVenue] = useState(weddingData.mainVenue);
  const [city, setCity] = useState(weddingData.city);
  const [hashtag, setHashtag] = useState(weddingData.hashtag);
  const [welcomeMessage, setWelcomeMessage] = useState(weddingData.welcomeMessage);
  const [events, setEvents] = useState<WeddingEvent[]>(weddingData.events);
  const [dressCodeOverall, setDressCodeOverall] = useState(weddingData.dressCodeOverall || '');
  const [address, setAddress] = useState(weddingData.address);
  const [parents1, setParents1] = useState(weddingData.partner1.parents || '');
  const [parents2, setParents2] = useState(weddingData.partner2.parents || '');
  const [couplePhotoUrl, setCouplePhotoUrl] = useState(weddingData.couplePhotoUrl);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(weddingData.coverPhotoUrl);
  const [gallery, setGallery] = useState<GalleryPhoto[]>(weddingData.gallery);
  const [photoError, setPhotoError] = useState('');
  const [stepError, setStepError] = useState('');
  const [story, setStory] = useState(weddingData.story);

  // A hashtag from their names, unless they typed their own.
  const fillHashtag = () => {
    if (hashtag.trim()) return;
    setHashtag(`#${firstName(partner1Name, '')}${firstName(partner2Name, '')}Wedding`.replace(/[^#\p{L}\p{N}]/gu, ''));
  };

  // Events are edited immutably: the draft must never write into the saved state's objects.
  const updateEvent = (id: string, patch: Partial<WeddingEvent>) =>
    setEvents((list) => list.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)));

  const pickPhoto = async (files: FileList | null, apply: (urls: string[]) => void) => {
    if (!files?.length) return;
    setPhotoError('');
    try {
      apply(await Promise.all(Array.from(files).map((f) => resizeImage(f))));
    } catch (e) {
      setPhotoError((e as Error).message || 'That photo could not be read. Try a JPEG or PNG.');
    }
  };

  // One tap per ceremony, across traditions; every field stays editable afterwards.
  const addEvent = ([title, eventType, startTime]: (typeof EVENT_PRESETS)[number]) => {
    const newEvent: WeddingEvent = {
      id: `evt-custom-${Date.now()}`,
      eventType,
      title,
      date: weddingDate,
      startTime,
      venue: mainVenue,
      address,
      city,
      dressCode: '',
      description: '',
    };
    setEvents((list) => [...list, newEvent]);
  };

  const updateChapter = (id: string, patch: Partial<LoveStoryChapter>) =>
    setStory((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  // Remove event
  const removeEvent = (id: string) => {
    setEvents((list) => list.filter((e) => e.id !== id));
  };

  // Written examples, not generated text: they cycle in order and only mention facts the couple entered.
  const [exampleIndex, setExampleIndex] = useState(0);
  const showBlessingExample = () => {
    const examples = [
      'With the blessings of our families, we joyfully invite you to celebrate our wedding with us.',
      `Two families unite, two hearts become one. We would love for you to celebrate with us${city.trim() ? ` in ${city.trim()}` : ''}.`,
      'Your love and guidance have shaped our journey. We cannot imagine beginning this new chapter without your blessings.',
      'With gratitude for the love that surrounds us, we invite you to share in the joy of our wedding.',
    ];
    setWelcomeMessage(examples[exampleIndex % examples.length]);
    setExampleIndex((i) => i + 1);
  };

  // Everything typed so far, as WeddingData: drives the live preview and is what gets saved.
  const draft = useMemo<WeddingData>(
    () => ({
      ...weddingData,
      partner1: { ...weddingData.partner1, name: partner1Name, shortName: firstName(partner1Name, weddingData.partner1.shortName), parents: parents1 },
      partner2: { ...weddingData.partner2, name: partner2Name, shortName: firstName(partner2Name, weddingData.partner2.shortName), parents: parents2 },
      weddingDate,
      weddingTime,
      mainVenue,
      address,
      city,
      // A custom venue invalidates the sample's pinned map link; directions then search the venue name.
      mapUrl: mainVenue === weddingData.mainVenue ? weddingData.mapUrl : undefined,
      hashtag,
      welcomeMessage,
      events,
      dressCodeOverall,
      couplePhotoUrl,
      coverPhotoUrl,
      gallery,
      story: story.filter((c) => c.title.trim() || c.description.trim()),
    }),
    [weddingData, partner1Name, partner2Name, parents1, parents2, weddingDate, weddingTime, mainVenue, address, city, hashtag, welcomeMessage, events, dressCodeOverall, couplePhotoUrl, coverPhotoUrl, gallery, story],
  );
  const activeTemplate = allTemplates.find((t) => t.id === selectedTemplateId) ?? allTemplates[0];
  const design = useMemo(() => resolveDesign(activeTemplate, weddingData.customDesign), [activeTemplate, weddingData.customDesign]);
  // The live preview fills blanks with neutral labels; `draft` itself (what gets saved) stays exactly as typed.
  const preview = useMemo(() => withPlaceholders(draft, activeTemplate), [draft, activeTemplate]);

  // Step change: new fields slide in from the direction of travel.
  const formRef = useRef<HTMLDivElement>(null);
  const prevStep = useRef(currentStep);
  useLayoutEffect(() => {
    const dir = currentStep >= prevStep.current ? 1 : -1;
    prevStep.current = currentStep;
    const step = formRef.current?.firstElementChild;
    if (!step || prefersReducedMotion()) return;
    const tween = gsap.from(step.children, { autoAlpha: 0, x: 40 * dir, stagger: 0.07, duration: 0.8 });
    return () => {
      tween.revert();
    };
  }, [currentStep]);

  // Save current step data to parent state
  const syncState = () => {
    const { rsvps: _r, ...details } = draft;
    updateWeddingData(details);
  };

  // Only what the invitation truly can't render without.
  const missing = () => {
    if (currentStep === 1 && (!partner1Name.trim() || !partner2Name.trim())) return 'Please enter both names.';
    if (currentStep === 2 && (!weddingDate || !mainVenue.trim())) return 'Please add the wedding date and venue.';
    if (currentStep === 3 && events.some((e) => !e.title.trim() || !e.date)) return 'Every ceremony needs a title and a date.';
    return '';
  };

  const handleNext = () => {
    const problem = missing();
    setStepError(problem);
    if (problem) return;
    if (currentStep === 1) {
      fillHashtag();
      track('wedding_started');
    }
    syncState();
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      triggerCinematicGeneration();
    }
  };

  const handleBack = () => {
    syncState();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const triggerCinematicGeneration = () => {
    syncState();
    track('wedding_completed', selectedTemplateId);
    setIsGenerating(true);

    const steps = [
      'Orchestrating typography tokens...',
      'Arranging dynamic multi-day event timelines...',
      'Harmonizing royal color palettes & sacred motifs...',
      'Compiling animated video invitation scenes...',
      'Your royal invitation is ready!',
    ];

    let index = 0;
    setGenerationStepText(steps[0]);
    setGenerationProgress(1 / steps.length);

    const interval = setInterval(() => {
      index++;
      if (index < steps.length) {
        setGenerationStepText(steps[index]);
        setGenerationProgress((index + 1) / steps.length);
      } else {
        clearInterval(interval);
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#B38B45', '#C9A45C', '#6E1727', '#E5CE9F'],
          });
        } catch {}
        setIsGenerating(false);
        setCurrentView('invite-preview');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="min-w-0">
        {/* Top Breadcrumb & Step Indicator */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8F6D31] uppercase tracking-wider mb-2.5">
            <span>Part {currentStep} of 5</span>
            <span className="truncate ml-2 text-right">
              {currentStep === 1 && 'Couple Details'}
              {currentStep === 2 && 'Schedule & Venue'}
              {currentStep === 3 && 'Ceremonies & Events'}
              {currentStep === 4 && 'Curated Visuals'}
              {currentStep === 5 && 'Design System'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-[#E8E2D8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B38B45] transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container (its first child is the active step, animated on change) */}
        <div className="bg-white rounded-2xl p-5 sm:p-10 border border-[#E8E2D8] shadow-sm">
          <div ref={formRef}>
          {/* STEP 1: Couple Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                  The Couple
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#191614]">
                  Who is getting married?
                </h2>
                <p className="text-xs sm:text-sm text-[#6B655E] mt-1">
                  Enter both partner names as you would like them to appear on the invitation crest.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                    Partner 1 (Bride / Groom) *
                  </label>
                  <input
                    type="text"
                    value={partner1Name}
                    onChange={(e) => setPartner1Name(e.target.value)}
                    placeholder="Bride’s full name"
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                    Partner 2 (Groom / Bride) *
                  </label>
                  <input
                    type="text"
                    value={partner2Name}
                    onChange={(e) => setPartner2Name(e.target.value)}
                    placeholder="Groom’s full name"
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <input
                  type="text"
                  value={parents1}
                  onChange={(e) => setParents1(e.target.value)}
                  placeholder="Parents' line (optional), e.g. Daughter of …"
                  aria-label="Partner 1 parents"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-xs focus:outline-none focus:border-[#B38B45]"
                />
                <input
                  type="text"
                  value={parents2}
                  onChange={(e) => setParents2(e.target.value)}
                  placeholder="Parents' line (optional)"
                  aria-label="Partner 2 parents"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-xs focus:outline-none focus:border-[#B38B45]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                  Wedding Hashtag
                </label>
                <input
                  type="text"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="e.g. #YourNamesWedding"
                  className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#191614]">
                    Welcome Blessing Message
                  </label>
                  <button
                    type="button"
                    onClick={showBlessingExample}
                    className="text-xs text-[#8F6D31] hover:text-[#191614] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Show a blessing example</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Share a heartfelt welcome to your friends and family..."
                  className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Wedding Schedule & Main Venue */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                  Main Date &amp; Location
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#191614]">
                  When &amp; where is the auspicious day?
                </h2>
                <p className="text-xs sm:text-sm text-[#6B655E] mt-1">
                  This serves as the primary wedding anchor for the countdown clock and map directions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                    Wedding Date *
                  </label>
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                    Muhurat / Time *
                  </label>
                  <input
                    type="time"
                    value={weddingTime}
                    onChange={(e) => setWeddingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                    Main Venue Name *
                  </label>
                  <input
                    type="text"
                    value={mainVenue}
                    onChange={(e) => setMainVenue(e.target.value)}
                    placeholder="Venue name"
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                    City &amp; State / Country
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City, state"
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                  Venue Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, area, landmark (used for map directions)"
                  className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#191614] mb-1.5">
                  General Dress Code
                </label>
                <input
                  type="text"
                  value={dressCodeOverall}
                  onChange={(e) => setDressCodeOverall(e.target.value)}
                  placeholder="e.g. Indian formal"
                  className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#B38B45]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Multi-Day Events Builder */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                    Multi-Day Schedule
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif text-[#191614]">
                    Ceremonies &amp; Gatherings
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6B655E] mt-1">
                    Tap to add each celebration, then rename or remove anything. Every event flows into the
                    website, the RSVP form and the video.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {EVENT_PRESETS.map((p) => (
                  <button
                    key={p[0]}
                    type="button"
                    onClick={() => addEvent(p)}
                    className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#B38B45]" />
                    {p[0]}
                  </button>
                ))}
              </div>

              <div className="space-y-4 pt-2">
                {events.map((evt, idx) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31]">
                        Ceremony #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEvent(evt.id)}
                        className="text-[#8E867C] hover:text-rose-600 transition-colors cursor-pointer p-1"
                        title="Remove event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#191614] mb-1">
                          Ceremony Title
                        </label>
                        <input
                          type="text"
                          value={evt.title}
                          onChange={(e) => updateEvent(evt.id, { title: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#191614] mb-1">
                          Date &amp; Time
                        </label>
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={evt.date}
                            onChange={(e) => updateEvent(evt.id, { date: e.target.value })}
                            className="w-full px-2.5 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                          />
                          <input
                            type="time"
                            value={evt.startTime}
                            onChange={(e) => updateEvent(evt.id, { startTime: e.target.value })}
                            className="w-full px-2.5 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#191614] mb-1">
                          Venue &amp; Courtyard
                        </label>
                        <input
                          type="text"
                          value={evt.venue}
                          onChange={(e) => updateEvent(evt.id, { venue: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#191614] mb-1">
                          Dress Code / Palette
                        </label>
                        <input
                          type="text"
                          value={evt.dressCode || ''}
                          onChange={(e) => updateEvent(evt.id, { dressCode: e.target.value })}
                          placeholder="e.g. Saffron Yellow, Lime Green, Silk Sarees"
                          className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-3">
                      <input
                        type="text"
                        value={evt.address}
                        onChange={(e) => updateEvent(evt.id, { address: e.target.value, mapUrl: undefined })}
                        placeholder="Address (for directions)"
                        aria-label="Event address"
                        className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                      />
                      <input
                        type="time"
                        value={evt.endTime || ''}
                        onChange={(e) => updateEvent(evt.id, { endTime: e.target.value || undefined })}
                        aria-label="End time"
                        title="End time (optional)"
                        className="w-full px-2.5 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={evt.description}
                      onChange={(e) => updateEvent(evt.id, { description: e.target.value })}
                      placeholder="A line for guests: what to expect"
                      aria-label="Event description"
                      className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Photos & Visuals */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                  Visuals &amp; Story
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#191614]">
                  Portraits &amp; Memories
                </h2>
                <p className="text-xs sm:text-sm text-[#6B655E] mt-1">
                  High-resolution photography gives your invitation website and video its cinematic
                  character.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
                {[
                  { label: 'Couple portrait', hint: 'Shown in the hero and the video.', url: couplePhotoUrl, set: setCouplePhotoUrl },
                  { label: 'Cover / venue backdrop', hint: 'Used behind the cinematic hero and video scenes.', url: coverPhotoUrl, set: setCoverPhotoUrl },
                ].map((p) => (
                  <label key={p.label} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8] space-y-2 cursor-pointer hover:border-[#B38B45] block">
                    <span className="text-xs font-semibold text-[#191614] flex items-center justify-between">
                      {p.label}
                      <span className="text-[#8F6D31] flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Change</span>
                    </span>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden border border-[#E8E2D8]">
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] text-[#6B655E] block">{p.hint}</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files, ([url]) => p.set(url))} />
                  </label>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#191614]">Gallery ({gallery.length}/6)</span>
                  {gallery.length < 6 && (
                    <label className="text-xs font-semibold text-[#8F6D31] hover:text-[#191614] cursor-pointer flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) =>
                          pickPhoto(e.target.files, (urls) =>
                            setGallery((g) => [...g, ...urls.map((url, i) => ({ id: `gal-${Date.now()}-${i}`, url }))].slice(0, 6)),
                          )
                        }
                      />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {gallery.map((ph) => (
                    <div key={ph.id} className="relative aspect-square rounded-lg overflow-hidden border border-[#E8E2D8] group">
                      <img src={ph.url} alt={ph.caption || ''} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGallery((g) => g.filter((x) => x.id !== ph.id))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white cursor-pointer"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#8E867C] mt-2">Photos are resized on your device before upload so guests&rsquo; pages load fast on mobile data.</p>
              </div>
              {photoError && <p role="alert" className="text-xs text-rose-700">{photoError}</p>}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#191614]">Your story (optional)</span>
                  {story.length < 4 && (
                    <button
                      type="button"
                      onClick={() =>
                        setStory((s) => [
                          ...s,
                          { id: `story-${Date.now()}`, year: '', title: s.length ? '' : 'How we met', description: '' },
                        ])
                      }
                      className="text-xs font-semibold text-[#8F6D31] hover:text-[#191614] cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add a chapter
                    </button>
                  )}
                </div>
                {!story.length && (
                  <p className="text-[11px] text-[#8E867C]">How you met, the proposal… Skip it and the story section stays hidden.</p>
                )}
                {story.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8] space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={c.year}
                        onChange={(e) => updateChapter(c.id, { year: e.target.value })}
                        placeholder="Year"
                        aria-label="Year"
                        className="w-20 px-2.5 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                      />
                      <input
                        value={c.title}
                        onChange={(e) => updateChapter(c.id, { title: e.target.value })}
                        placeholder="Title, e.g. The proposal"
                        aria-label="Chapter title"
                        className="flex-1 min-w-0 px-2.5 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setStory((s) => s.filter((x) => x.id !== c.id))}
                        className="text-[#8E867C] hover:text-rose-600 cursor-pointer p-1"
                        aria-label="Remove chapter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={c.description}
                      onChange={(e) => updateChapter(c.id, { description: e.target.value })}
                      placeholder="A few lines your guests will love."
                      rows={2}
                      className="w-full px-2.5 py-2 bg-white border border-[#E8E2D8] rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Style Selection & Auto-Generation */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block mb-1">
                  Design System
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#191614]">
                  Choose Your Visual Suite
                </h2>
                <p className="text-xs sm:text-sm text-[#6B655E] mt-1">
                  Select a template suite. You can switch anytime without losing any of your wedding
                  details.
                </p>
              </div>

              {/* Featured designs, rendered live with the couple's names */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-2">
                {[
                  // Keep the active template visible even if it came from deep in the catalog.
                  ...allTemplates.filter((t) => t.id === selectedTemplateId && allTemplates.indexOf(t) >= 12),
                  ...allTemplates.slice(0, 12),
                ].map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => selectTemplate(tpl.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectTemplate(tpl.id))}
                      className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#B38B45] ring-2 ring-[#B38B45]/30 bg-[#FAF8F5]'
                          : 'border-[#E8E2D8] hover:border-[#B38B45] bg-white'
                      }`}
                    >
                      <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 relative bg-[#191614]">
                        <TemplateThumbnail template={tpl} weddingData={preview} />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#B38B45] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-serif font-semibold text-[#191614] truncate">
                        {tpl.name}
                      </h4>
                      <p className="text-[10px] text-[#6B655E] capitalize truncate">
                        {tpl.culture.replace('_', ' ')} · {tpl.style}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          </div>

          {stepError && (
            <p role="alert" className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {stepError}
            </p>
          )}

          {/* Navigation Buttons */}
          <div className="pt-6 sm:pt-8 mt-6 border-t border-[#E8E2D8] flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 sm:px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#191614] bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentView('landing')}
                className="px-3 py-2 text-xs font-semibold text-[#8E867C] hover:text-[#191614] cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-6 sm:px-7 py-3 text-xs font-semibold uppercase tracking-wider text-white bg-[#191614] hover:bg-[#B38B45] rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>{currentStep === 5 ? 'Generate My Invitation' : 'Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live preview: the invitation rebuilding itself as the couple types */}
      <aside className="hidden lg:block sticky top-24">
        <p className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8F6D31]">
          <span>Live preview</span>
          <span className="font-normal normal-case tracking-normal text-[#8E867C]">{activeTemplate.name}</span>
        </p>
        <div className="rounded-[36px] border border-[#3A332C] bg-[#15120F] p-2 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.6)]">
          <div className="h-[640px] overflow-y-auto overscroll-contain rounded-[28px]">
            <InvitationSite weddingData={preview} design={design} />
          </div>
        </div>
      </aside>
      </div>

      {/* Cinematic Generation Overlay Modal */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] rounded-2xl max-w-md w-full p-6 sm:p-8 text-center border border-[#B38B45]/40 shadow-2xl space-y-4 sm:space-y-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FAF8F5] border-2 border-[#B38B45] flex items-center justify-center mx-auto text-[#B38B45] animate-pulse">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-[#8F6D31] block mb-1">
                Schema Engine at Work
              </span>
              <h3 className="text-xl sm:text-2xl font-serif text-[#191614]">Crafting Timeless Elegance</h3>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#6B655E] h-8 flex items-center justify-center">
              {generationStepText}
            </p>
            <div className="w-full bg-[#E8E2D8] h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#B38B45] rounded-full transition-[width] duration-500 ease-out" style={{ width: `${generationProgress * 100}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
