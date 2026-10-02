// Invitation emails via Resend's HTTP API (free tier: 3,000/month). No SDK: one fetch.
// Enabled only when RESEND_API_KEY and EMAIL_FROM are set; otherwise couples use WhatsApp.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const emailEnabled = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendInviteEmail(opts: {
  to: string;
  guestName: string;
  couple: string;
  dateText: string;
  place: string;
  url: string;
  reminder?: boolean;
}) {
  const { to, guestName, couple, dateText, place, url, reminder } = opts;
  const subject = reminder ? `Reminder: kindly RSVP for ${couple}'s wedding` : `You're invited: ${couple}'s wedding`;
  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:32px;background:#FAF8F5;color:#191614;text-align:center">
  <p style="letter-spacing:3px;font-size:11px;color:#8F6D31;text-transform:uppercase">${reminder ? 'A gentle reminder' : 'Wedding invitation'}</p>
  <h1 style="font-weight:normal;font-size:30px;margin:8px 0">${esc(couple)}</h1>
  <p style="font-size:15px">Dear ${esc(guestName)},</p>
  <p style="font-size:15px;line-height:1.6">${reminder ? 'We would love to know if you can join us.' : 'With joy in our hearts, we invite you to celebrate our wedding.'}<br>${esc(dateText)} · ${esc(place)}</p>
  <a href="${esc(url)}" style="display:inline-block;margin-top:16px;padding:14px 28px;background:#191614;color:#fff;text-decoration:none;border-radius:999px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px">OPEN INVITATION &amp; RSVP</a>
</div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
}

/** Sign-in code for the couple's account. */
export async function sendLoginCode(to: string, code: string, brand: string) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:32px;background:#FAF8F5;color:#191614;text-align:center">
  <p style="font-size:14px">Your ${esc(brand)} sign-in code:</p>
  <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:12px 0">${esc(code)}</p>
  <p style="font-size:12px;color:#6B655E">It works for 10 minutes. If you didn't ask for it, ignore this email.</p>
</div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: `${code} is your ${brand} sign-in code`, html }),
  });
  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
}
