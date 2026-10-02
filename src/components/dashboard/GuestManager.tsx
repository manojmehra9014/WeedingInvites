import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { track } from '../../utils/analytics';
import { BookUser, CheckCircle2, Copy, Eye, Lock, Mail, MessageCircle, Plus, Send, SkipForward, SlidersHorizontal, Trash2, Users, X } from 'lucide-react';
import { WeddingData, WeddingEvent } from '../../types/wedding';
import { emailGuests, fetchGuests, Guest, GuestDraft, guestLink, GuestPage, GuestStatus, markGuestsSent, saveGuests } from '../../utils/api';
import { formatDate } from '../../utils/design';
import { CLASSIC, entitlements, inr } from '../../data/pricing';
import { inviteMessage, parseGuestLines, whatsappUrl } from '../../utils/guests';

const STATUS: Record<GuestStatus, { label: string; cls: string }> = {
  not_sent: { label: 'Not sent', cls: 'bg-[#F2ECE3] text-[#6B655E]' },
  sent: { label: 'Sent', cls: 'bg-sky-50 text-sky-800' },
  opened: { label: 'Opened', cls: 'bg-amber-50 text-amber-800' },
  accepted: { label: 'Coming', cls: 'bg-emerald-50 text-emerald-800' },
  declined: { label: 'Declined', cls: 'bg-rose-50 text-rose-800' },
};
const replied = (g: Guest) => g.status === 'accepted' || g.status === 'declined';

type Filter = 'all' | 'not_sent' | 'waiting' | 'replied';
type Queue = { mode: 'invite' | 'remind'; ids: string[]; index: number } | null;

// Android Chrome's Contact Picker; elsewhere the button is hidden.
type ContactsApi = { select(props: string[], opts: { multiple: boolean }): Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]> };
const contactsApi = (navigator as Navigator & { contacts?: ContactsApi }).contacts;

/**
 * The couple's guest list: every guest gets a private link, so the couple sees who was sent the invite,
 * who opened it, and who replied, and can remind exactly the ones who haven't.
 */
export const GuestManager: React.FC<{
  weddingData: WeddingData;
  onUpgrade?: (plan: 'digital_classic' | 'royal_suite') => void;
}> = ({ weddingData, onUpgrade }) => {
  const slug = weddingData.customSlug;
  const key = weddingData.editKey!;
  const [page, setPage] = useState<GuestPage | null>(null);
  const [paste, setPaste] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [queue, setQueue] = useState<Queue>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => fetchGuests(slug, key).then(setPage, (e: Error) => setError(e.message)), [slug, key]);
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // opens and replies arrive while the couple watches
    return () => clearInterval(t);
  }, [load]);

  const guests = page?.guests ?? [];
  const byId = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const ctx = {
    couple: `${weddingData.partner1.shortName} & ${weddingData.partner2.shortName}`,
    dateText: formatDate(weddingData.weddingDate),
    place: [weddingData.mainVenue, weddingData.city].filter(Boolean).join(', '),
  };

  const run = async (fn: () => Promise<GuestPage>) => {
    setBusy(true);
    setError('');
    try {
      const next = await fn();
      setPage(next);
      return next;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = (list: GuestDraft[]) => run(() => saveGuests(slug, key, list));
  // Every save sends the whole list, so it must carry each guest's personal settings too.
  const current: GuestDraft[] = guests.map(({ id, name, phone, email, seats, events, note }) => ({ id, name, phone, email, seats, events, note }));
  const [editing, setEditing] = useState<string | null>(null);
  const titlesOf = (ids?: string[]) => (ids ?? []).map((id) => weddingData.events.find((e) => e.id === id)?.title).filter((t): t is string => !!t);
  const personalise = async (id: string, patch: Pick<GuestDraft, 'seats' | 'events' | 'note'>) => {
    if (await save(current.map((g) => (g.id === id ? { ...g, ...patch } : g)))) setEditing(null);
  };

  const addPasted = async () => {
    const fresh = parseGuestLines(paste);
    if (!fresh.length) return setError('Add one guest per line: name, phone, email.');
    if (await save([...current, ...fresh])) {
      setPaste('');
      setShowAdd(false);
      setNote(`Added ${fresh.length} ${fresh.length === 1 ? 'guest' : 'guests'}.`);
    }
  };

  const pickContacts = async () => {
    try {
      const picked = await contactsApi!.select(['name', 'tel', 'email'], { multiple: true });
      const fresh = picked
        .map((c) => ({ name: c.name?.[0] ?? '', phone: c.tel?.[0] ?? '', email: c.email?.[0] ?? '' }))
        .filter((c) => c.name);
      if (fresh.length) await save([...current, ...fresh]);
    } catch {
      // Picker dismissed.
    }
  };

  const remove = (id: string) => window.confirm('Remove this guest?') && save(current.filter((g) => g.id !== id));

  const copyLink = async (g: Guest) => {
    const link = guestLink(slug, g.token);
    await navigator.clipboard.writeText(link).catch(() => window.prompt('Copy this link:', link));
    if (!g.invitedAt) run(() => markGuestsSent(slug, key, [g.id], 'link'));
    setNote(`Copied ${g.name}'s personal link.`);
  };

  // One tap per guest: WhatsApp opens with their personal message; we mark them sent and move on.
  const sendWhatsApp = (g: Guest, reminder: boolean) => {
    const personal = { seats: g.seats, events: titlesOf(g.events) };
    window.open(whatsappUrl(g.phone, inviteMessage(g.name, guestLink(slug, g.token), ctx, reminder, personal)), '_blank');
    track('wedding_shared', reminder ? 'reminder' : 'guest_whatsapp');
    run(() => markGuestsSent(slug, key, [g.id], 'whatsapp', reminder));
  };

  const startQueue = (mode: 'invite' | 'remind') => {
    const ids = guests.filter((g) => (mode === 'invite' ? g.status === 'not_sent' : !replied(g) && g.status !== 'not_sent')).map((g) => g.id);
    if (!ids.length) return setNote(mode === 'invite' ? 'Everyone has been sent their invitation.' : 'Nobody is waiting on a reply.');
    setQueue({ mode, ids, index: 0 });
  };
  const queued = queue ? byId.get(queue.ids[queue.index]) : undefined;
  const advance = () => setQueue((q) => (q && q.index + 1 < q.ids.length ? { ...q, index: q.index + 1 } : null));

  const sendEmails = async (reminder: boolean) => {
    const ids = guests.filter((g) => g.email && (reminder ? !replied(g) && g.status !== 'not_sent' : g.status === 'not_sent')).map((g) => g.id);
    if (!ids.length) return setNote('No guests with an email address are waiting for this.');
    if (!window.confirm(`Email ${ids.length} ${ids.length === 1 ? 'guest' : 'guests'} their personal invitation${reminder ? ' reminder' : ''}?`)) return;
    const res = await run(() => emailGuests(slug, key, ids, reminder));
    if (res) setNote(`Emailed ${res.sent ?? 0} ${res.failed ? `(${res.failed} failed)` : ''}.`);
  };

  const count = (f: (g: Guest) => boolean) => guests.filter(f).length;
  const funnel = [
    ['On the list', guests.length],
    ['Invited', count((g) => g.status !== 'not_sent')],
    ['Opened', count((g) => g.status === 'opened' || replied(g))],
    ['Coming', count((g) => g.status === 'accepted')],
    ['Declined', count((g) => g.status === 'declined')],
    ['No reply yet', count((g) => g.status === 'sent' || g.status === 'opened')],
  ] as const;

  const seatsReserved = guests.reduce((n, g) => n + (g.seats ?? 0), 0);
  const seatsConfirmed = guests.reduce((n, g) => n + (g.status === 'accepted' ? g.partySize ?? 0 : 0), 0);

  const visible = guests.filter((g) =>
    filter === 'all' ? true : filter === 'not_sent' ? g.status === 'not_sent' : filter === 'waiting' ? g.status === 'sent' || g.status === 'opened' : replied(g),
  );
  const limit = page?.limit ?? 0;
  const nearLimit = page && page.plan !== 'royal_suite' && guests.length >= limit * 0.8;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2D8] shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-[#E8E2D8] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Guest list &amp; sending
          </span>
          <h2 className="text-lg sm:text-xl font-serif text-[#191614] mt-0.5">Send every family their own invitation</h2>
          <p className="text-xs text-[#6B655E] mt-1">
            Each guest gets a private link that greets them by name, so you can see who opened it and who still needs a reminder.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={() => setShowAdd(!showAdd)} className="px-3.5 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg cursor-pointer flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[#B38B45]" /> Add guests
          </button>
          <button onClick={() => startQueue('invite')} disabled={!guests.length || busy} className="px-3.5 py-2 text-xs font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-40">
            <Send className="w-3.5 h-3.5" /> Send invitations
          </button>
          <button onClick={() => startQueue('remind')} disabled={!guests.length || busy} className="px-3.5 py-2 text-xs font-semibold bg-[#191614] hover:bg-[#B38B45] text-white rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-40">
            <MessageCircle className="w-3.5 h-3.5" /> Remind non-repliers
          </button>
        </div>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-[#E8E2D8] text-center">
        {funnel.map(([label, n]) => (
          <div key={label} className="p-3 border-r last:border-r-0 border-[#F2ECE3]">
            <div className="text-xl font-serif font-bold text-[#191614] tabular-nums">{n}</div>
            <div className="text-[10px] uppercase tracking-wider text-[#8E867C]">{label}</div>
          </div>
        ))}
      </div>

      {seatsReserved > 0 && (
        <p className="px-5 sm:px-6 py-2 text-[11px] text-[#6B655E] border-b border-[#E8E2D8] bg-[#FAF8F5]">
          Seats: <strong className="text-[#191614]">{seatsConfirmed}</strong> confirmed of <strong className="text-[#191614]">{seatsReserved}</strong> reserved
        </p>
      )}

      <div className="p-5 sm:p-6 space-y-4">
        {(error || note) && (
          <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-xs flex justify-between gap-3 ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            <span>{error || note}</span>
            <button onClick={() => (setError(''), setNote(''))} aria-label="Dismiss" className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Plan limit, with the upgrade at the moment it matters */}
        {page && (nearLimit || /holds \d+ guests/.test(error)) && (
          <div className="rounded-xl border-2 border-[#B38B45] bg-[#FFF8EC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#4A453F] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#8F6D31] shrink-0" />
              {guests.length} of {limit} guests on your {page.plan === 'free' ? 'free' : 'Classic'} plan.
              {page.plan === 'free' ? ` Classic holds ${entitlements('digital_classic').guestList.toLocaleString('en-IN')} guests plus email invitations; Royal is unlimited.` : ' Royal is unlimited.'}
            </p>
            {onUpgrade && (
              <button onClick={() => onUpgrade(page.plan === 'free' ? 'digital_classic' : 'royal_suite')} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#191614] hover:bg-[#B38B45] text-white rounded-lg cursor-pointer shrink-0">
                Upgrade
              </button>
            )}
          </div>
        )}

        {showAdd && (
          <div className="rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] p-4 space-y-3">
            <label className="block text-xs font-semibold text-[#191614]">
              Paste your list: one guest per line (name, phone, email). Columns copied from Excel or Google Sheets work too.
            </label>
            <textarea
              rows={5}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={'One guest per line: name, phone, email\nGuest or family name, 98765 43210, guest@email.com\nAnother guest, +91 98111 22233'}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E8E2D8] rounded-lg font-mono focus:outline-none focus:border-[#B38B45]"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={addPasted} disabled={busy || !paste.trim()} className="px-4 py-2 text-xs font-semibold bg-[#191614] hover:bg-[#B38B45] text-white rounded-lg cursor-pointer disabled:opacity-40">
                Add {parseGuestLines(paste).length || ''} guests
              </button>
              {contactsApi && (
                <button onClick={pickContacts} className="px-4 py-2 text-xs font-semibold bg-white border border-[#E8E2D8] hover:border-[#191614] rounded-lg cursor-pointer flex items-center gap-1.5">
                  <BookUser className="w-3.5 h-3.5" /> Pick from phone contacts
                </button>
              )}
              <span className="text-[11px] text-[#8E867C]">10-digit Indian numbers get +91 automatically.</span>
            </div>
          </div>
        )}

        {/* One-tap WhatsApp queue: free bulk sending without the WhatsApp Business API */}
        {queue && queued && (
          <div className="rounded-2xl border-2 border-[#25D366] bg-[#F1FBF4] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-emerald-900">
              <span className="font-semibold uppercase tracking-wider">
                {queue.mode === 'invite' ? 'Sending invitations' : 'Sending reminders'} · {queue.index + 1} of {queue.ids.length}
              </span>
              <button onClick={() => setQueue(null)} className="underline cursor-pointer">Stop</button>
            </div>
            <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
              <div className="h-full bg-[#25D366]" style={{ width: `${((queue.index + 1) / queue.ids.length) * 100}%` }} />
            </div>
            <p className="font-serif text-2xl text-[#191614]">{queued.name}</p>
            <p className="text-xs text-[#6B655E]">{queued.phone ? `+${queued.phone}` : 'No phone number: WhatsApp will ask you to pick the chat.'}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  sendWhatsApp(queued, queue.mode === 'remind');
                  advance();
                }}
                className="px-5 py-3 text-sm font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl cursor-pointer flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Open WhatsApp for {queued.name.split(' ')[0]}
              </button>
              <button onClick={advance} className="px-4 py-3 text-xs font-semibold bg-white border border-[#E8E2D8] rounded-xl cursor-pointer flex items-center gap-1.5">
                <SkipForward className="w-3.5 h-3.5" /> Skip
              </button>
            </div>
            <p className="text-[11px] text-[#6B655E]">Tap send in WhatsApp, come back here, and the next guest is ready.</p>
          </div>
        )}

        {/* Email: shown when the server can send it; upsell when the plan can't */}
        {page?.emailConfigured && guests.some((g) => g.email) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Mail className="w-4 h-4 text-[#B38B45]" />
            {page.email ? (
              <>
                <button onClick={() => sendEmails(false)} disabled={busy} className="px-3 py-1.5 font-semibold bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg cursor-pointer disabled:opacity-40">
                  Email invitations to guests not yet sent
                </button>
                <button onClick={() => sendEmails(true)} disabled={busy} className="px-3 py-1.5 font-semibold bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg cursor-pointer disabled:opacity-40">
                  Email reminders
                </button>
              </>
            ) : (
              <span className="text-[#6B655E]">
                Email invitations to {count((g) => !!g.email)} guests are part of the paid plans.{' '}
                {onUpgrade && <button onClick={() => onUpgrade('digital_classic')} className="underline font-semibold text-[#191614] cursor-pointer">Upgrade from {inr(CLASSIC.priceInr)}</button>}
              </span>
            )}
          </div>
        )}

        {/* List */}
        {guests.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {([['all', 'Everyone'], ['not_sent', 'Not sent'], ['waiting', 'No reply yet'], ['replied', 'Replied']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setFilter(id)} className={`px-3 py-1 rounded-full text-xs cursor-pointer ${filter === id ? 'bg-[#191614] text-white' : 'bg-[#F4EFE6] text-[#554C44]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-[#F2ECE3] border-y border-[#F2ECE3]">
              {visible.map((g) => (
                <li key={g.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-serif text-sm font-semibold text-[#191614] truncate">{g.name}</p>
                    <p className="text-[#8E867C] truncate">{[g.phone && `+${g.phone}`, g.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                    {(g.seats || g.events?.length || g.note) && (
                      <p className="text-[#8F6D31] truncate">
                        {[g.seats && `${g.seats} ${g.seats === 1 ? 'seat' : 'seats'}`, g.events?.length && titlesOf(g.events).join(', '), g.note && `“${g.note}”`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS[g.status].cls}`}>
                    {STATUS[g.status].label}
                    {g.status === 'accepted' && g.partySize ? ` · ${g.partySize}` : ''}
                  </span>
                  {g.openedAt && !replied(g) && <Eye className="w-3.5 h-3.5 text-amber-600" aria-label="Opened" />}
                  {replied(g) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-label="Replied" />}
                  <div className="flex items-center gap-1 ml-auto">
                    {!replied(g) && (
                      <button onClick={() => sendWhatsApp(g, g.status !== 'not_sent')} title={g.status === 'not_sent' ? 'Send on WhatsApp' : 'Remind on WhatsApp'} className="p-1.5 rounded-lg text-[#25D366] hover:bg-emerald-50 cursor-pointer">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setEditing(editing === g.id ? null : g.id)} title="Personalise" aria-expanded={editing === g.id} className="p-1.5 rounded-lg text-[#8F6D31] hover:bg-[#FAF8F5] cursor-pointer">
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={() => copyLink(g)} title="Copy personal link" className="p-1.5 rounded-lg text-[#6B655E] hover:bg-[#FAF8F5] cursor-pointer">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(g.id)} title="Remove guest" className="p-1.5 rounded-lg text-[#8E867C] hover:text-rose-600 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {editing === g.id && (
                    <GuestSettings guest={g} events={weddingData.events} busy={busy} onCancel={() => setEditing(null)} onSave={(patch) => personalise(g.id, patch)} />
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          page && (
            <p className="text-center text-xs text-[#8E867C] py-6">
              No guests yet. Add your list and send each family a personal invitation, or share your main link in groups.
            </p>
          )
        )}
      </div>
    </div>
  );
};

/** Seats, events and a personal line for one guest: what their link and WhatsApp message will say. */
const GuestSettings: React.FC<{
  guest: Guest;
  events: WeddingEvent[];
  busy: boolean;
  onSave: (patch: Pick<GuestDraft, 'seats' | 'events' | 'note'>) => void;
  onCancel: () => void;
}> = ({ guest, events, busy, onSave, onCancel }) => {
  const [seats, setSeats] = useState(guest.seats ? String(guest.seats) : '');
  // No selection = every event; ticking some limits the invitation to those.
  const [picked, setPicked] = useState<string[]>(guest.events ?? []);
  const [note, setNote] = useState(guest.note ?? '');
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ seats: Number(seats) || undefined, events: picked.length && picked.length < events.length ? picked : undefined, note: note.trim() || undefined });
      }}
      className="basis-full rounded-xl border border-[#E8E2D8] bg-[#FAF8F5] p-4 space-y-3"
    >
      <div className="grid sm:grid-cols-[8rem_1fr] gap-3">
        <label className="block">
          <span className="block text-[11px] font-semibold text-[#191614] mb-1">Seats reserved</span>
          <input type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="Any" className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-lg" />
        </label>
        <label className="block">
          <span className="block text-[11px] font-semibold text-[#191614] mb-1">Personal note (shown under “Dear {guest.name},”)</span>
          <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Can’t wait to dance with you at the Sangeet!" className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-lg" />
        </label>
      </div>
      {events.length > 1 && (
        <fieldset>
          <legend className="text-[11px] font-semibold text-[#191614] mb-1">Invited to {picked.length ? 'only these' : 'every event'}</legend>
          <div className="flex flex-wrap gap-1.5">
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                aria-pressed={picked.includes(ev.id)}
                onClick={() => toggle(ev.id)}
                className={`px-2.5 py-1 rounded-full border cursor-pointer ${picked.includes(ev.id) ? 'bg-[#191614] text-white border-[#191614]' : 'bg-white border-[#E8E2D8] text-[#554C44]'}`}
              >
                {ev.title}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex gap-2">
        <button disabled={busy} className="px-4 py-2 font-semibold bg-[#191614] hover:bg-[#B38B45] text-white rounded-lg cursor-pointer disabled:opacity-40">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 font-semibold bg-white border border-[#E8E2D8] rounded-lg cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};
