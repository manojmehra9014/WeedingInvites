import React, { useEffect, useMemo, useState } from 'react';
import { Music, Volume2 } from 'lucide-react';
import { BASE_TEMPLATES, generateCatalog } from '../../data/templatesCatalog';
import { entitlements, REFERRAL_DISCOUNT_INR } from '../../data/pricing';
import { fetchPublicWedding, markSeen, NewRSVP, PublicWedding, sendRsvp } from '../../utils/api';
import { resolveDesign } from '../../utils/design';
import { weddingAudio } from '../../utils/audioEngine';
import { InvitationSite } from './InvitationSite';
import { WaxSealEnvelope } from './WaxSealEnvelope';

/** What a guest sees at /invite/<slug>: the couple's live invitation, nothing of the app around it. */
export const GuestInvite: React.FC<{ slug: string }> = ({ slug }) => {
  const [wedding, setWedding] = useState<PublicWedding | null>(null);
  const [error, setError] = useState('');
  const [sealed, setSealed] = useState(true);
  const [playing, setPlaying] = useState(false);
  const params = new URLSearchParams(window.location.search);
  // `g` = a guest's private token from the couple's guest list (tracks opened/replied); `guest` = a plain name link.
  const token = params.get('g');
  const guestName = wedding?.guestName || params.get('guest')?.slice(0, 80) || '';

  useEffect(() => {
    fetchPublicWedding(slug, token).then((w) => {
      setWedding(w);
      if (token && w.guestName) markSeen(slug, token);
    }, (e: Error) => setError(e.message));
  }, [slug, token]);

  const design = useMemo(() => {
    if (!wedding) return null;
    const id = wedding.data.selectedTemplateId;
    const template = BASE_TEMPLATES.find((t) => t.id === id) ?? generateCatalog().find((t) => t.id === id) ?? BASE_TEMPLATES[0];
    return resolveDesign(template, wedding.data.customDesign);
  }, [wedding]);

  useEffect(() => {
    if (wedding) document.title = `${wedding.data.partner1.name} & ${wedding.data.partner2.name} · Wedding Invitation`;
  }, [wedding]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF8F5] p-6 text-center">
        <h1 className="font-serif text-3xl text-[#191614]">Invitation not found</h1>
        <p className="max-w-sm text-sm text-[#6B655E]">{error} Please check the link with the couple.</p>
      </main>
    );
  }
  if (!wedding || !design) {
    return <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] font-serif text-lg text-[#8F6D31]">Opening your invitation…</main>;
  }

  const { data, plan } = wedding;
  const showEnvelope = sealed && plan === 'royal_suite' && data.customDesign?.showWaxSealEnvelope !== false;
  const toggleMusic = () => setPlaying(weddingAudio.toggle());

  return (
    <main className="min-h-screen" style={{ background: design.theme.background }}>
      {showEnvelope ? (
        <WaxSealEnvelope
          weddingData={data}
          design={design}
          guestName={guestName}
          onOpen={() => {
            setSealed(false);
            weddingAudio.play();
            setPlaying(true);
          }}
        />
      ) : (
        <InvitationSite
          weddingData={data}
          design={design}
          guestName={guestName}
          guest={wedding.guest ?? undefined}
          branding={entitlements(plan).branding}
          onSubmitRSVP={async (rsvp: NewRSVP) => {
            await sendRsvp(slug, { ...rsvp, guestToken: wedding.guestName ? token ?? undefined : undefined });
            // The greeting shows their reply; reload it so a changed answer appears there too.
            if (wedding.guest) fetchPublicWedding(slug, token).then(setWedding, () => {});
          }}
          afterRsvp={
            entitlements(plan).branding && (
              <a
                href={`/?ref=${slug}`}
                className="mt-4 block rounded-xl border border-inv-border bg-inv-surface p-4 text-left text-xs text-inv-text/80 hover:border-inv-secondary"
              >
                <strong className="block font-serif text-base text-inv-heading">Planning a celebration of your own?</strong>
                Make an invitation like this free, with WhatsApp sharing and RSVPs. You&rsquo;ll get ₹{REFERRAL_DISCOUNT_INR} off any upgrade.
              </a>
            )
          }
          headerActions={
            <button
              onClick={toggleMusic}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-inv-border px-2.5 py-1.5 text-[10px] font-semibold text-inv-heading"
              aria-label={playing ? 'Mute music' : 'Play music'}
            >
              {playing ? <Volume2 className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
            </button>
          }
        />
      )}
    </main>
  );
};
