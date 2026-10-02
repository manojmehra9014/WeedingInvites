import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SITE } from '../../../site.config';
import { gsap, prefersReducedMotion } from '../../utils/gsap';
import confetti from 'canvas-confetti';
import { Calendar, CheckCircle2, Clock, ExternalLink, MapPin, Send, Sparkles } from 'lucide-react';
import { GuestPersonalization, GuestRSVP, WeddingData, WeddingEvent } from '../../types/wedding';
import { LayoutType } from '../../types/template';
import { ResolvedDesign, designVars, formatDate, formatTime, joinParts, parseLocalDate, timeUntil } from '../../utils/design';
import { DividerOrnament, DynamicArchRenderer, DynamicMotifRenderer } from '../common/Motifs';

type SectionType = 'welcome' | 'events' | 'story' | 'gallery' | 'venue' | 'rsvp';

// The layout decides composition: which hero, which section variants, and in what order.
const SECTION_ORDER: Record<LayoutType, SectionType[]> = {
  royal_arch: ['welcome', 'events', 'story', 'gallery', 'venue', 'rsvp'],
  cinematic: ['welcome', 'story', 'events', 'gallery', 'venue', 'rsvp'],
  editorial: ['welcome', 'story', 'gallery', 'events', 'venue', 'rsvp'],
  modern_split: ['events', 'welcome', 'story', 'gallery', 'venue', 'rsvp'],
};

type NewRSVP = Omit<GuestRSVP, 'id' | 'submittedAt'>;

interface InvitationSiteProps {
  weddingData: WeddingData;
  design: ResolvedDesign;
  guestName?: string;
  /** Buttons rendered in the site's sticky header (music, share, …). */
  headerActions?: React.ReactNode;
  /** Omit for read-only previews: the form still shows its thank-you state. A rejected promise shows its message. */
  onSubmitRSVP?: (rsvp: NewRSVP) => unknown;
  /** Free plan: a small "Made with WeddingVerse" credit linking guests to the maker. */
  branding?: boolean;
  /** Shown under the RSVP thank-you: the moment a guest is most open to "make your own". */
  afterRsvp?: React.ReactNode;
  /** Render only header, hero and welcome note (thumbnails): no maps, forms or galleries. */
  heroOnly?: boolean;
  /** Opened through a guest's personal link: greeting, reserved seats, their previous reply. */
  guest?: GuestPersonalization;
}

interface Props {
  data: WeddingData;
  design: ResolvedDesign;
}

export const InvitationSite: React.FC<InvitationSiteProps> = ({
  weddingData,
  design,
  guestName,
  headerActions,
  onSubmitRSVP,
  heroOnly,
  branding,
  afterRsvp,
  guest,
}) => {
  const { layout, theme, motif } = design;
  const props = { data: weddingData, design };

  const sections: Record<SectionType, React.ReactNode> = {
    welcome: <Welcome {...props} />,
    events: <Events {...props} />,
    story: <Story {...props} />,
    gallery: <Gallery {...props} />,
    venue: <Venue {...props} />,
    rsvp: <Rsvp {...props} onSubmit={onSubmitRSVP} initialName={guestName} after={afterRsvp} guest={guest} />,
  };

  const visible = SECTION_ORDER[layout].filter(
    (s) =>
      !(s === 'story' && !weddingData.story?.length) &&
      !(s === 'gallery' && !weddingData.gallery?.length) &&
      !(s === 'events' && !weddingData.events?.length),
  );

  return (
    <>
      <div
        data-reveal-scope
        className="@container relative min-h-full bg-inv-bg font-sans text-inv-text selection:bg-inv-secondary/25"
        style={designVars(design)}
      >
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-inv-border bg-inv-bg/90 px-4 py-2.5 backdrop-blur-md @3xl:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <DynamicMotifRenderer motif={motif} color={theme.secondary} className="h-5 w-5 shrink-0" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.25em] text-inv-secondary @md:text-[11px]">
              {weddingData.hashtag || `${weddingData.partner1.shortName} & ${weddingData.partner2.shortName}`}
            </span>
          </div>
          {headerActions && <div className="flex shrink-0 items-center gap-1.5">{headerActions}</div>}
        </header>

        {guestName && (
          <div className="flex items-center justify-center gap-2 border-b border-inv-secondary/25 bg-inv-secondary/10 px-4 py-2.5 text-center font-serif text-sm text-inv-heading">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-inv-secondary" />
            <span>
              Prepared with love for <strong>{guestName}</strong>
            </span>
          </div>
        )}

        <Hero {...props} />
        {guest && !heroOnly && <PersonalGreeting {...props} guest={guest} />}
        {heroOnly && (
          <div className={layout === 'editorial' ? 'border-t border-inv-text/15' : 'border-y border-inv-border bg-inv-surface'}>
            <Welcome {...props} />
          </div>
        )}

        {!heroOnly && visible.map((s, i) => (
          <div
            key={s}
            className={
              layout === 'editorial'
                ? 'border-t border-inv-text/15'
                : i % 2 === 0
                  ? 'border-y border-inv-border bg-inv-surface'
                  : ''
            }
          >
            {sections[s]}
          </div>
        ))}

        {!heroOnly && <footer className="space-y-4 border-t border-inv-border px-5 py-14 text-center">
          <DynamicMotifRenderer motif={motif} color={theme.secondary} className="mx-auto h-8 w-8" />
          <p className="font-serif text-3xl text-inv-heading">
            {weddingData.partner1.shortName} <span className="italic text-inv-secondary">&amp;</span>{' '}
            {weddingData.partner2.shortName}
          </p>
          <p className="mx-auto max-w-lg font-serif text-base italic leading-relaxed text-inv-muted">
            &ldquo;{weddingData.closingMessage}&rdquo;
          </p>
          {branding && (
            <a
              href={`${window.location.origin}/?ref=${weddingData.customSlug}`}
              target="_blank"
              rel="noopener"
              className="inline-block pt-2 text-[10px] uppercase tracking-[0.3em] text-inv-muted/70 hover:text-inv-heading"
            >
              Made with {SITE.name} · Create yours free
            </a>
          )}
        </footer>}
      </div>
    </>
  );
};

/* ───────────────────────────── primitives ───────────────────────────── */

// IntersectionObserver (not ScrollTrigger) because the site often scrolls inside a device frame,
// and IO respects any clipping scroll container without extra configuration.
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className,
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const tween = gsap.fromTo(el, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 1.1, delay, paused: true });
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        tween.play();
        io.disconnect();
      },
      { rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tween.revert();
    };
  }, [delay]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

/** Slow cinematic push-in on hero photography. */
const KenBurns: React.FC<{ src: string }> = ({ src }) => {
  const ref = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const tween = gsap.fromTo(ref.current, { scale: 1.14 }, { scale: 1, duration: 9, ease: 'power2.out' });
    return () => {
      tween.revert();
    };
  }, [src]);
  return <img ref={ref} src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />;
};

const Section: React.FC<{ id?: string; children: React.ReactNode; narrow?: boolean }> = ({ id, children, narrow }) => (
  <section id={id} className="scroll-mt-16 px-5 py-16 @3xl:px-10 @3xl:py-24">
    <div className={`mx-auto ${narrow ? 'max-w-xl' : 'max-w-4xl'}`}>{children}</div>
  </section>
);

const SectionHeading: React.FC<{ eyebrow: string; title: string; design: ResolvedDesign }> = ({
  eyebrow,
  title,
  design,
}) =>
  design.layout === 'editorial' ? (
    <div className="mb-10 flex items-baseline justify-between gap-4 @3xl:mb-14">
      <h2 className="font-serif text-4xl leading-none tracking-tight text-inv-heading @3xl:text-6xl">{title}</h2>
      <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.3em] text-inv-muted @md:inline">{eyebrow}</span>
    </div>
  ) : (
    <Reveal className="mb-10 text-center @3xl:mb-14">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-inv-secondary">{eyebrow}</p>
      <h2 className="font-serif text-3xl leading-tight text-inv-heading @3xl:text-5xl">{title}</h2>
      <DividerOrnament color={design.theme.secondary} className="mt-5" />
    </Reveal>
  );

function useCountdown(date: string, time: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return timeUntil(parseLocalDate(date, time), now);
}

const Countdown: React.FC<{ data: WeddingData; variant: 'tiles' | 'inverse' | 'rule'; className?: string }> = ({
  data,
  variant,
  className = '',
}) => {
  const t = useCountdown(data.weddingDate, data.weddingTime);
  const units = [
    ['Days', t.days],
    ['Hours', t.hours],
    ['Mins', t.minutes],
    ['Secs', t.seconds],
  ] as const;

  if (variant === 'rule') {
    return (
      <div className={`grid grid-cols-4 divide-x divide-inv-text/15 border-y border-inv-text/15 ${className}`}>
        {units.map(([label, v]) => (
          <div key={label} className="py-3 text-center">
            <div className="font-serif text-2xl tabular-nums text-inv-heading @3xl:text-3xl">{v}</div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-inv-muted">{label}</div>
          </div>
        ))}
      </div>
    );
  }

  const inverse = variant === 'inverse';
  return (
    <div className={`mx-auto grid max-w-sm grid-cols-4 gap-2 ${className}`}>
      {units.map(([label, v]) => (
        <div
          key={label}
          className={`rounded-xl border p-2.5 text-center @3xl:p-3 ${
            inverse ? 'border-white/20 bg-white/10 backdrop-blur-sm' : 'border-inv-border bg-inv-surface'
          }`}
        >
          <div
            className={`font-serif text-2xl font-semibold tabular-nums @3xl:text-3xl ${inverse ? 'text-white' : 'text-inv-heading'}`}
          >
            {v}
          </div>
          <div className={`text-[9px] uppercase tracking-[0.2em] ${inverse ? 'text-white/60' : 'text-inv-muted'}`}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

const celebrate = (design: ResolvedDesign) => {
  try {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: [design.theme.secondary, design.theme.primary, '#F3C969'],
    });
  } catch {
    // Confetti is decoration only.
  }
};

/* ──────────────────────────────── hero ──────────────────────────────── */

const Hero: React.FC<Props> = (props) => {
  switch (props.design.layout) {
    case 'cinematic':
      return <CinematicHero {...props} />;
    case 'editorial':
      return <EditorialHero {...props} />;
    case 'modern_split':
      return <SplitHero {...props} />;
    default:
      return <RoyalHero {...props} />;
  }
};

const RoyalHero: React.FC<Props> = ({ data, design }) => (
  <section className="relative overflow-hidden px-5 pb-16 pt-10 text-center @3xl:pb-24 @3xl:pt-16">
    {design.arch !== 'none' && (
      <div className="mx-auto mb-4 max-w-xs opacity-60 @3xl:max-w-md">
        <DynamicArchRenderer archStyle={design.arch} color={design.theme.secondary} />
      </div>
    )}
    <Reveal>
      <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-inv-secondary">With the blessings of our families</p>
      <h1 className="font-serif text-4xl leading-[1.08] text-inv-heading @md:text-5xl @3xl:text-7xl">
        {data.partner1.name}
        <span className="my-2 block font-serif text-2xl italic text-inv-secondary @3xl:text-4xl">&amp;</span>
        {data.partner2.name}
      </h1>
      <div className="mt-4 space-y-0.5 text-xs text-inv-muted @3xl:text-sm">
        {data.partner1.parents && <p>{data.partner1.parents}</p>}
        {data.partner2.parents && <p>{data.partner2.parents}</p>}
      </div>
      <DividerOrnament color={design.theme.secondary} className="my-8" />
    </Reveal>

    {data.couplePhotoUrl && (
      <Reveal delay={0.15} className="relative mx-auto w-full max-w-[16rem] @3xl:max-w-sm">
        <div className="aspect-[4/5] overflow-hidden rounded-t-full border-4 border-inv-secondary shadow-2xl">
          <img src={data.couplePhotoUrl} alt={`${data.partner1.name} and ${data.partner2.name}`} className="h-full w-full object-cover" />
        </div>
        <div className="pointer-events-none absolute inset-2 rounded-t-full border border-white/50" />
      </Reveal>
    )}

    <Reveal delay={0.25} className="mt-8 space-y-2">
      <p className="font-serif text-2xl font-semibold text-inv-heading @3xl:text-3xl">
        {joinParts([formatDate(data.weddingDate), formatTime(data.weddingTime)], ' · ')}
      </p>
      <p className="flex items-center justify-center gap-1.5 text-sm text-inv-muted">
        <MapPin className="h-4 w-4 shrink-0 text-inv-secondary" />
        {joinParts([data.mainVenue, data.city], ', ')}
      </p>
    </Reveal>

    <Countdown data={data} variant="tiles" className="mt-8" />
    <button
      onClick={() => celebrate(design)}
      className="mx-auto mt-5 flex cursor-pointer items-center gap-1.5 rounded-full border border-inv-border bg-inv-surface px-4 py-2 font-serif text-sm text-inv-heading shadow-sm transition-transform hover:scale-105"
    >
      <Sparkles className="h-3.5 w-3.5 text-inv-secondary" />
      Shower petals
    </button>
  </section>
);

const CinematicHero: React.FC<Props> = ({ data }) => (
  <>
    <section className="relative flex min-h-[36rem] items-end overflow-hidden text-white @3xl:min-h-[44rem]">
      {data.coverPhotoUrl || data.couplePhotoUrl ? <KenBurns src={data.coverPhotoUrl || data.couplePhotoUrl} /> : <div className="absolute inset-0 bg-inv-primary" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="relative w-full px-6 pb-12 @3xl:px-14 @3xl:pb-16">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.35em] text-inv-secondary">
            Save the date · {formatDate(data.weddingDate, 'short')}
          </p>
          <h1 className="mt-4 font-serif text-6xl leading-[0.95] @3xl:text-8xl">
            {data.partner1.shortName}
            <span className="mx-3 italic text-inv-secondary">&amp;</span>
            {data.partner2.shortName}
          </h1>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-inv-secondary" />
              {formatDate(data.weddingDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-inv-secondary" />
              {joinParts([data.mainVenue, data.city], ', ')}
            </span>
          </div>
        </Reveal>
      </div>
    </section>
    <div className="bg-inv-primary px-5 py-8 text-white">
      <p className="mb-4 text-center text-[10px] uppercase tracking-[0.3em] text-white/60">Counting down to forever</p>
      <Countdown data={data} variant="inverse" />
    </div>
  </>
);

const EditorialHero: React.FC<Props> = ({ data }) => (
  <section className="px-5 pb-14 pt-8 @3xl:px-14 @3xl:pt-12">
    <div className="flex items-center justify-between border-y border-inv-text/70 py-2 text-[10px] uppercase tracking-[0.3em]">
      <span>The Wedding Issue</span>
      <span className="hidden @md:inline">{data.city}</span>
      <span>{data.weddingDate.slice(0, 4)}</span>
    </div>
    <Reveal>
      <h1 className="mt-8 font-serif text-[clamp(2.75rem,12cqi,8.5rem)] leading-[0.9] tracking-tight text-inv-heading">
        {data.partner1.name}
        <br />
        <span className="italic text-inv-secondary">&amp;</span> {data.partner2.name}
      </h1>
    </Reveal>
    <div className={`mt-10 grid items-end gap-8 ${data.couplePhotoUrl ? '@3xl:grid-cols-[1fr_2fr]' : ''}`}>
      <dl className="divide-y divide-inv-text/15 border-y border-inv-text/15 text-sm">
        {[
          ['When', joinParts([formatDate(data.weddingDate), formatTime(data.weddingTime)], ', ')],
          ['Where', joinParts([data.mainVenue, data.city], ', ')],
          ...(data.dressCodeOverall ? [['Attire', data.dressCodeOverall]] : []),
        ].map(([k, v]) => (
          <div key={k} className="grid grid-cols-[5rem_1fr] gap-3 py-3">
            <dt className="text-[10px] uppercase tracking-[0.25em] text-inv-muted">{k}</dt>
            <dd className="font-serif text-base leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
      {data.couplePhotoUrl && <Reveal delay={0.1}>
        <figure>
          <img src={data.couplePhotoUrl} alt={`${data.partner1.name} and ${data.partner2.name}`} className="aspect-[16/10] w-full object-cover" />
          <figcaption className="mt-2 text-[10px] uppercase tracking-[0.25em] text-inv-muted">
            {data.partner1.shortName} &amp; {data.partner2.shortName}, photographed for this issue
          </figcaption>
        </figure>
      </Reveal>}
    </div>
    <Countdown data={data} variant="rule" className="mt-10" />
  </section>
);

const SplitHero: React.FC<Props> = ({ data, design }) => (
  <section className="grid @3xl:min-h-[40rem] @3xl:grid-cols-2">
    <div className={`relative @3xl:order-last @3xl:min-h-0 ${data.couplePhotoUrl ? 'min-h-[22rem]' : 'flex min-h-[10rem] items-center justify-center bg-inv-primary'}`}>
      {data.couplePhotoUrl ? (
        <img src={data.couplePhotoUrl} alt={`${data.partner1.name} and ${data.partner2.name}`} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <DynamicMotifRenderer motif={design.motif} color={design.theme.secondary} className="h-24 w-24 opacity-80" />
      )}
    </div>
    <div className="flex flex-col justify-center bg-inv-surface px-6 py-12 @3xl:px-14">
      <Reveal>
        <DynamicMotifRenderer motif={design.motif} color={design.theme.secondary} className="mb-6 h-10 w-10" />
        <p className="text-[11px] uppercase tracking-[0.3em] text-inv-secondary">We&rsquo;re getting married</p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.02] text-inv-heading @3xl:text-6xl">
          {data.partner1.shortName}
          <br />
          <span className="italic text-inv-secondary">&amp;</span> {data.partner2.shortName}
        </h1>
        <p className="mt-5 text-sm text-inv-muted">
          {joinParts([formatDate(data.weddingDate), formatTime(data.weddingTime)], ' · ')}
          <br />
          {joinParts([data.mainVenue, data.city], ', ')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#rsvp-form" className="rounded-full bg-inv-cta px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-inv-on-cta">
            RSVP
          </a>
          <a href="#events" className="rounded-full border border-inv-text/25 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em]">
            Schedule
          </a>
        </div>
      </Reveal>
      <Countdown data={data} variant="rule" className="mt-10" />
    </div>
  </section>
);

/* ────────────────────────────── sections ────────────────────────────── */

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "Dear Rao Family," — what makes a personal link feel made for that guest. */
const PersonalGreeting: React.FC<Props & { guest: GuestPersonalization }> = ({ data, guest }) => {
  const { reply, seats } = guest;
  const events = data.events.map((e) => e.title).filter(Boolean);
  const toRsvp = () => document.getElementById('rsvp-form')?.scrollIntoView({ behavior: 'smooth' });
  return (
    <section aria-label="Your personal invitation" className="border-b border-inv-border bg-inv-secondary/10 px-5 py-12 text-center @3xl:py-16">
      <Reveal className="mx-auto max-w-xl space-y-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-inv-secondary">Your personal invitation</p>
        <h2 className="font-serif text-4xl text-inv-heading @3xl:text-5xl">Dear {guest.name},</h2>
        <p className="font-serif text-lg italic leading-relaxed text-inv-text/80 @3xl:text-xl">
          {guest.note || `${data.partner1.shortName} & ${data.partner2.shortName} can’t wait to celebrate with you.`}
        </p>
        <div className="space-y-1 text-sm text-inv-muted">
          {seats && <p>We’ve reserved {plural(seats, 'seat')} in your honour.</p>}
          {events.length > 0 && <p>Your celebrations: {events.join(' · ')}</p>}
        </div>
        {reply && (
          <p className="text-sm font-semibold text-inv-heading">
            {reply.attending ? `You’re coming · ${plural(reply.guestsCount, 'seat')}. We can’t wait!` : 'You’ve let us know you can’t make it. You’ll be missed.'}
          </p>
        )}
        <button
          onClick={toRsvp}
          className={`cursor-pointer rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] ${reply ? 'border border-inv-border text-inv-heading' : 'bg-inv-cta text-inv-on-cta shadow-md'}`}
        >
          {reply ? 'Change your reply' : 'RSVP now'}
        </button>
      </Reveal>
    </section>
  );
};

const Welcome: React.FC<Props> = ({ data, design }) =>
  design.layout === 'editorial' ? (
    <Section>
      <Reveal className="grid gap-6 @3xl:grid-cols-[1fr_2fr]">
        <p className="text-[10px] uppercase tracking-[0.3em] text-inv-muted">A note from the couple</p>
        <p className="font-serif text-2xl leading-snug first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-inv-secondary @3xl:text-3xl">
          {data.welcomeMessage}
        </p>
      </Reveal>
    </Section>
  ) : (
    <Section narrow>
      <Reveal className="space-y-5 text-center">
        <DynamicMotifRenderer motif={design.motif} color={design.theme.secondary} className="mx-auto h-9 w-9" />
        <h2 className="font-serif text-3xl text-inv-heading @3xl:text-4xl">A sacred journey begins</h2>
        <p className="font-serif text-lg italic leading-relaxed text-inv-text/80 @3xl:text-xl">
          &ldquo;{data.welcomeMessage}&rdquo;
        </p>
      </Reveal>
    </Section>
  );

function calendarUrl(event: WeddingEvent, data: WeddingData) {
  const day = event.date.replace(/-/g, '');
  const start = `${day}T${event.startTime.replace(':', '')}00`;
  const end = `${day}T${(event.endTime || '23:00').replace(':', '')}00`;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.title} · ${data.partner1.name} & ${data.partner2.name}`,
    dates: `${start}/${end}`,
    details: `${event.description}${event.dressCode ? `\nDress code: ${event.dressCode}` : ''}`,
    location: `${event.venue}, ${event.address}, ${event.city}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// Couple-entered links reach every guest: only http(s) may become an href.
const mapUrl = (venue: string, city: string, explicit?: string) =>
  explicit && /^https?:\/\//i.test(explicit) ? explicit : `https://maps.google.com/?q=${encodeURIComponent(`${venue}, ${city}`)}`;

const EventLinks: React.FC<{ event: WeddingEvent; data: WeddingData }> = ({ event, data }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11px] font-semibold uppercase tracking-wider">
    <a href={calendarUrl(event, data)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-inv-heading hover:underline">
      <Calendar className="h-3 w-3 text-inv-secondary" /> Add to calendar
    </a>
    <a href={mapUrl(event.venue, event.city, event.mapUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-inv-heading hover:underline">
      <ExternalLink className="h-3 w-3 text-inv-secondary" /> Directions
    </a>
  </div>
);

const EventMeta: React.FC<{ event: WeddingEvent }> = ({ event }) => (
  <div className="space-y-1 text-xs text-inv-muted">
    <p className="flex items-center gap-1.5">
      <Clock className="h-3.5 w-3.5 shrink-0 text-inv-secondary" />
      {formatTime(event.startTime)}
      {event.endTime ? ` – ${formatTime(event.endTime)}` : ' onwards'}
    </p>
    <p className="flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-inv-secondary" />
      {event.venue}
    </p>
    {event.dressCode && <p className="italic">Dress code · {event.dressCode}</p>}
  </div>
);

const Events: React.FC<Props> = ({ data, design }) => {
  const events = [...data.events].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const heading = <SectionHeading eyebrow="Ceremonies & celebrations" title="The Itinerary" design={design} />;

  if (design.layout === 'cinematic') {
    return (
      <Section id="events">
        {heading}
        <ol className="relative ml-2 space-y-10 border-l border-inv-secondary/40 @3xl:mx-auto @3xl:max-w-2xl">
          {events.map((ev) => (
            <Reveal key={ev.id} className="relative pl-8">
              <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-inv-bg bg-inv-secondary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-inv-secondary">
                {formatDate(ev.date, 'short')}
              </p>
              <h3 className="mt-1 font-serif text-2xl text-inv-heading @3xl:text-3xl">{ev.title}</h3>
              <p className="my-2 max-w-xl text-sm leading-relaxed text-inv-text/80">{ev.description}</p>
              <EventMeta event={ev} />
              <EventLinks event={ev} data={data} />
            </Reveal>
          ))}
        </ol>
      </Section>
    );
  }

  if (design.layout === 'editorial') {
    return (
      <Section id="events">
        {heading}
        <ol className="divide-y divide-inv-text/15 border-y border-inv-text/15">
          {events.map((ev, i) => (
            <Reveal key={ev.id} className="grid gap-3 py-7 @2xl:grid-cols-[4rem_1fr_14rem] @2xl:gap-6">
              <span className="font-serif text-4xl italic leading-none text-inv-secondary">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-serif text-2xl text-inv-heading">{ev.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-inv-text/80">{ev.description}</p>
                <EventLinks event={ev} data={data} />
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-inv-muted">{formatDate(ev.date)}</p>
                <EventMeta event={ev} />
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>
    );
  }

  if (design.layout === 'modern_split') {
    return (
      <Section id="events">
        {heading}
        <div className="grid gap-4 @xl:grid-cols-2">
          {events.map((ev) => {
            const d = parseLocalDate(ev.date);
            return (
              <Reveal key={ev.id} className="flex gap-4 rounded-2xl border border-inv-border bg-inv-bg p-5">
                <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-inv-cta text-inv-on-cta">
                  <span className="font-serif text-2xl leading-none">{d.getDate()}</span>
                  <span className="text-[9px] uppercase tracking-widest">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                </div>
                <div className="min-w-0 space-y-2">
                  <h3 className="font-serif text-xl text-inv-heading">{ev.title}</h3>
                  <EventMeta event={ev} />
                  <EventLinks event={ev} data={data} />
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>
    );
  }

  return (
    <Section id="events">
      {heading}
      <div className="space-y-5">
        {events.map((ev) => (
          <Reveal key={ev.id} className="relative overflow-hidden rounded-2xl border border-inv-border bg-inv-bg p-6 transition-shadow hover:shadow-lg @3xl:p-8">
            <span className="absolute inset-y-0 left-0 w-1.5 bg-inv-secondary" />
            <div className="flex flex-col gap-4 @2xl:flex-row @2xl:justify-between">
              <div className="space-y-2">
                {ev.eventType !== 'custom' && (
                  <span className="inline-block rounded bg-inv-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {ev.eventType.replace('_', ' ')}
                  </span>
                )}
                <h3 className="font-serif text-2xl text-inv-heading">{ev.title}</h3>
                <p className="max-w-xl text-sm leading-relaxed text-inv-text/80">{ev.description}</p>
              </div>
              <div className="shrink-0 space-y-1 border-t border-inv-border pt-3 @2xl:border-0 @2xl:pt-0 @2xl:text-right">
                <p className="font-serif text-lg text-inv-heading">{formatDate(ev.date, 'short')}</p>
                <EventMeta event={ev} />
                <EventLinks event={ev} data={data} />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
};

const Story: React.FC<Props> = ({ data, design }) => {
  const heading = <SectionHeading eyebrow="Our journey" title="The Chapters of Us" design={design} />;

  if (design.layout === 'editorial') {
    return (
      <Section>
        {heading}
        <div className="grid gap-8 @2xl:grid-cols-3">
          {data.story.map((c) => (
            <Reveal key={c.id}>
              <p className="font-serif text-5xl italic text-inv-secondary">{c.year}</p>
              <h3 className="mt-3 font-serif text-xl text-inv-heading">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-inv-text/80">{c.description}</p>
            </Reveal>
          ))}
        </div>
      </Section>
    );
  }

  return (
    <Section>
      {heading}
      <ol className="mx-auto max-w-2xl space-y-6">
        {data.story.map((c) => (
          <Reveal key={c.id} className="grid grid-cols-[4.5rem_1fr] gap-4">
            <span className="pt-1 text-right font-serif text-2xl text-inv-secondary">{c.year}</span>
            <div className="border-l border-inv-secondary/40 pb-2 pl-5">
              <h3 className="font-serif text-xl text-inv-heading">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-inv-text/80">{c.description}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
};

const Gallery: React.FC<Props> = ({ data, design }) => (
  <Section>
    <SectionHeading eyebrow="Moments" title="Our Gallery" design={design} />
    <div className="columns-2 gap-3 @3xl:columns-3 [&>*]:mb-3">
      {data.gallery.map((ph) => (
        <Reveal key={ph.id}>
          <figure className={`group relative overflow-hidden ${design.layout === 'editorial' ? '' : 'rounded-2xl'}`}>
            <img src={ph.url} alt={ph.caption || ''} loading="lazy" className="w-full transition-transform duration-700 group-hover:scale-105" />
            {ph.caption && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {ph.caption}
              </figcaption>
            )}
          </figure>
        </Reveal>
      ))}
    </div>
  </Section>
);

const Venue: React.FC<Props> = ({ data, design }) => {
  const query = encodeURIComponent(joinParts([data.mainVenue, data.city], ', '));
  return (
    <Section>
      <SectionHeading eyebrow="Getting there" title="The Destination" design={design} />
      <Reveal className="grid overflow-hidden rounded-2xl border border-inv-border bg-inv-bg @2xl:grid-cols-2">
        <div className="space-y-3 p-6 @3xl:p-8">
          <h3 className="font-serif text-2xl text-inv-heading">{data.mainVenue}</h3>
          <p className="text-sm text-inv-text/80">{data.address}</p>
          <p className="text-xs text-inv-muted">{joinParts([data.city, data.country], ', ')}</p>
          <a
            href={mapUrl(data.mainVenue, data.city, data.mapUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-inv-cta px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-inv-on-cta"
          >
            <MapPin className="h-4 w-4" /> Get directions
          </a>
        </div>
        <iframe
          title={`Map of ${data.mainVenue}`}
          src={`https://maps.google.com/maps?q=${query}&output=embed`}
          loading="lazy"
          className="h-56 w-full border-0 @2xl:h-full"
        />
      </Reveal>
    </Section>
  );
};

const MEALS = [
  { id: 'vegetarian', label: 'Veg' },
  { id: 'jain', label: 'Jain' },
  { id: 'non_vegetarian', label: 'Non-veg' },
  { id: 'vegan', label: 'Vegan' },
] as const;

const inputClass =
  'w-full rounded-xl border border-inv-border bg-inv-bg px-3.5 py-2.5 text-sm text-inv-text placeholder:text-inv-muted/60 focus:border-inv-secondary focus:outline-none';
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-inv-muted';

const Rsvp: React.FC<Props & { onSubmit?: (rsvp: NewRSVP) => unknown; initialName?: string; after?: React.ReactNode; guest?: GuestPersonalization }> = ({
  data,
  design,
  onSubmit,
  initialName,
  after,
  guest,
}) => {
  // A personal link starts from the guest's last reply (or the seats the couple reserved), so changing it is one tap.
  const reply = guest?.reply;
  const maxSeats = guest?.seats ?? 6;
  const [name, setName] = useState(initialName ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [attending, setAttending] = useState(reply?.attending ?? true);
  const [guests, setGuests] = useState(Math.min(maxSeats, reply?.guestsCount || guest?.seats || 1));
  const [meal, setMeal] = useState<NewRSVP['mealPreference']>(reply?.mealPreference && reply.mealPreference !== 'any' ? reply.mealPreference : 'vegetarian');
  const [eventIds, setEventIds] = useState(() => (reply?.eventsAttending?.length ? reply.eventsAttending : data.events.map((e) => e.id)));
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const toggleEvent = (id: string) =>
    setEventIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await onSubmit?.({
        guestName: name.trim(),
        email,
        phone,
        attending,
        guestsCount: attending ? guests : 0,
        eventsAttending: attending ? eventIds : [],
        mealPreference: attending ? meal : 'any',
        message,
      });
      setDone(true);
      if (attending) celebrate(design);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Section id="rsvp-form" narrow>
      <SectionHeading eyebrow="Be our cherished guest" title="Kindly Reply" design={design} />
      {done ? (
        <div className="space-y-4 rounded-2xl border border-inv-secondary bg-inv-secondary/10 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-inv-secondary" />
          <h3 className="font-serif text-2xl text-inv-heading">Thank you, {name}!</h3>
          <p className="text-sm leading-relaxed text-inv-text/80">
            {attending
              ? `We've saved ${guests} ${guests === 1 ? 'seat' : 'seats'} for you. See you ${data.city ? `in ${data.city}` : 'there'}!`
              : 'We will miss you dearly and are grateful for your blessings.'}
          </p>
          <button onClick={() => setDone(false)} className="cursor-pointer text-xs font-medium text-inv-heading underline">
            Submit another response
          </button>
          {after}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-inv-border bg-inv-surface p-5 shadow-sm @3xl:p-8">
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setAttending(v)}
                aria-pressed={attending === v}
                className={`cursor-pointer rounded-xl border px-3 py-3 font-serif text-base transition-colors ${
                  attending === v ? 'border-inv-cta bg-inv-cta text-inv-on-cta' : 'border-inv-border text-inv-text/80'
                }`}
              >
                {v ? 'Joyfully accepts' : 'Regretfully declines'}
              </button>
            ))}
          </div>

          <label className="block">
            <span className={labelClass}>Full name *</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name or family name" className={inputClass} />
          </label>

          <div className="grid gap-4 @md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>{guest?.hasPhone ? 'Phone / WhatsApp (optional, we have it)' : 'Phone / WhatsApp *'}</span>
              <input required={!guest?.hasPhone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
            </label>
          </div>

          {attending && (
            <>
              <label className="block">
                <span className={labelClass}>Number of guests</span>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={inputClass}>
                  {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'guest' : 'guests'}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className={labelClass}>Celebrations you&rsquo;ll attend</legend>
                <div className="flex flex-wrap gap-2">
                  {data.events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => toggleEvent(ev.id)}
                      aria-pressed={eventIds.includes(ev.id)}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        eventIds.includes(ev.id)
                          ? 'border-inv-secondary bg-inv-secondary/15 font-semibold text-inv-heading'
                          : 'border-inv-border text-inv-muted'
                      }`}
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={labelClass}>Meal preference</legend>
                <div className="grid grid-cols-4 gap-2">
                  {MEALS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMeal(m.id)}
                      aria-pressed={meal === m.id}
                      className={`cursor-pointer rounded-lg border py-2 text-xs transition-colors ${
                        meal === m.id ? 'border-inv-secondary bg-inv-secondary/15 font-semibold text-inv-heading' : 'border-inv-border text-inv-muted'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <label className="block">
            <span className={labelClass}>Blessings &amp; notes</span>
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Warm wishes, arrival times, anything we should know…" className={inputClass} />
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-inv-cta py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-inv-on-cta shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send RSVP'}
          </button>
        </form>
      )}
    </Section>
  );
};
