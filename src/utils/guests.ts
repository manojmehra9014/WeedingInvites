import type { GuestDraft } from './api';

/**
 * Turns whatever the couple pastes (a column from Excel, a CSV, a WhatsApp-copied list) into guests.
 * One guest per line; cells split on tab, comma or semicolon. The cell with "@" is the email, a cell of
 * phone characters with 8+ digits is the phone, and everything else is the name.
 */
export function parseGuestLines(text: string): GuestDraft[] {
  const out: GuestDraft[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/[\t,;]/).map((c) => c.trim()).filter(Boolean);
    if (!cells.length || /^(name|guest|guest name)$/i.test(cells[0])) continue; // empty or header row
    let email = '';
    let phone = '';
    let seats = 0;
    const name: string[] = [];
    for (const c of cells) {
      if (!email && c.includes('@')) email = c;
      else if (!seats && /^\d{1,2}$/.test(c) && +c >= 1 && +c <= 20) seats = +c; // "Sharma Family, 98765 43210, 4" = 4 seats
      else if (!phone && /^[+\d\s().-]+$/.test(c) && c.replace(/\D/g, '').length >= 8) phone = c;
      else name.push(c);
    }
    const n = name.join(' ');
    if (!n) continue;
    out.push({ name: n, phone, email, ...(seats ? { seats } : {}) });
  }
  return out;
}

export interface InviteContext {
  couple: string;
  dateText: string;
  place: string;
}

/** What the couple set for this guest: seats reserved and, if not every event, which ones (by title). */
export interface InvitePersonal {
  seats?: number;
  events?: string[];
}

/** The WhatsApp text each guest receives; their private link goes last so WhatsApp shows its preview card. */
export function inviteMessage(guestName: string, link: string, c: InviteContext, reminder = false, p: InvitePersonal = {}) {
  if (reminder)
    return `Dear ${guestName}, a gentle reminder 🙏\n\nWe'd love to know if you can join us for ${c.couple}'s wedding on ${c.dateText}. It takes a minute to reply:\n${link}`;
  const lines = [
    `📅 ${c.dateText}`,
    c.place && `📍 ${c.place}`,
    p.events?.length && `🎉 You're invited to: ${p.events.join(', ')}`,
    p.seats && `💺 ${p.seats} ${p.seats === 1 ? 'seat' : 'seats'} reserved for you`,
  ].filter(Boolean);
  return `✨ Dear ${guestName},\n\nWith joy in our hearts, we invite you to celebrate the wedding of ${c.couple}.\n\n${lines.join('\n')}\n\nYour personal invitation & RSVP:\n${link}\n\nWith love and blessings 🙏`;
}

export const whatsappUrl = (phone: string, text: string) =>
  phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
