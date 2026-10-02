import React, { useEffect, useState } from 'react';
import { AdminStats, fetchAdminStats, inviteUrl } from '../../utils/api';

const KEY = 'wv_admin_key';
// Main funnel, in order. Started/shared count browsers; published/RSVP/paid count weddings.
const STEPS: [string, string][] = [
  ['wedding_started', 'Wedding started'],
  ['wedding_published', 'Wedding published'],
  ['asset_generated', 'Image generated'],
  ['asset_downloaded', 'Image downloaded'],
  ['wedding_shared', 'Wedding shared'],
  ['rsvp_received', 'RSVP received'],
  ['payment_completed', 'Plan purchased'],
];
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const read = () => {
  try {
    return sessionStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
};

/** The owner's view of the business: growth, money, and whether invitations are actually being used. */
export const AdminDashboard: React.FC = () => {
  const [key, setKey] = useState(read);
  const [input, setInput] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!key) return;
    fetchAdminStats(key).then(
      (s) => {
        setStats(s);
        setError('');
        try {
          sessionStorage.setItem(KEY, key); // this tab only; closes with it
        } catch {
          // ignore
        }
      },
      (e: Error) => {
        setError(e.message);
        setStats(null);
      },
    );
  }, [key]);

  if (!stats) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setKey(input.trim());
          }}
          className="w-full max-w-sm bg-white border border-[#E8E2D8] rounded-2xl p-6 space-y-3 shadow-sm"
        >
          <h1 className="font-serif text-2xl text-[#191614]">Owner dashboard</h1>
          <p className="text-xs text-[#6B655E]">Enter the ADMIN_KEY configured on your server.</p>
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="current-password" className="w-full px-3 py-2 text-sm border border-[#E8E2D8] rounded-lg" />
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <button className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#191614] text-white rounded-lg cursor-pointer">Open</button>
        </form>
      </div>
    );
  }

  const s = stats;
  const kpis: [string, string, string][] = [
    ['Revenue (real payments)', inr(s.revenueInr), `${inr(s.revenue30dInr)} in the last 30 days`],
    ['Paying couples', String(s.paidCouples), `${pct(s.conversion)} of ${s.couples} couples`],
    ['Average paid order', inr(s.arpuInr), `${s.byPlan.digital_classic} Classic · ${s.byPlan.royal_suite} Royal`],
    ['New couples this week', String(s.newThisWeek), `${s.couples} published in total`],
    ['Guests invited', String(s.guestsInvited), `${s.guestsListed} on guest lists`],
    ['Personal links opened', String(s.invitesOpened), s.guestsInvited ? `${pct(s.invitesOpened / s.guestsInvited)} open rate` : '—'],
    ['RSVPs collected', String(s.rsvps), 'across all weddings'],
    ['Couples from referrals', String(s.referredCouples), s.couples ? `${pct(s.referredCouples / s.couples)} of all couples` : '—'],
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-[#191614]">Business overview</h1>
        <button onClick={() => (setStats(null), setKey(''), sessionStorage.removeItem(KEY))} className="text-xs underline text-[#6B655E] cursor-pointer">
          Lock
        </button>
      </div>
      {s.demoPayments > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {s.demoPayments} demo payments are counted as paid couples but not as revenue. Set Razorpay keys to take real money.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(([label, value, sub]) => (
          <div key={label} className="p-4 rounded-2xl bg-white border border-[#E8E2D8]">
            <div className="text-[10px] uppercase tracking-wider text-[#8E867C]">{label}</div>
            <div className="text-2xl font-serif font-bold text-[#191614] tabular-nums mt-1">{value}</div>
            <div className="text-[11px] text-[#8E867C] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
        <h2 className="font-serif text-lg text-[#191614] mb-3">Funnel</h2>
        {(() => {
          const by = Object.fromEntries((s.funnel ?? []).map((e) => [e.name, e]));
          const first = by[STEPS[0][0]]?.people || Math.max(1, ...STEPS.map(([n]) => by[n]?.people ?? 0));
          const others = (s.funnel ?? []).filter((e) => !STEPS.some(([n]) => n === e.name)).sort((a, b) => b.people - a.people);
          return (
            <>
              <table className="w-full text-xs">
                <tbody>
                  {STEPS.map(([name, label], i) => {
                    const n = by[name]?.people ?? 0;
                    const prev = i ? (by[STEPS[i - 1][0]]?.people ?? 0) : 0;
                    return (
                      <tr key={name} className="border-t border-[#F2ECE3] first:border-0">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{label}</td>
                        <td className="pr-3 text-right tabular-nums font-semibold">{n.toLocaleString('en-IN')}</td>
                        <td className="w-full pr-3">
                          <div className="h-2 rounded bg-[#F2ECE3]">
                            <div className="h-2 rounded bg-[#B38B45]" style={{ width: `${Math.min(100, (n / first) * 100)}%` }} />
                          </div>
                        </td>
                        <td className="text-right tabular-nums text-[#8E867C] whitespace-nowrap">{i && prev ? `${pct(n / prev)} of previous` : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {others.length > 0 && (
                <p className="mt-3 text-[11px] text-[#8E867C]">
                  {others.map((e) => `${e.name.replace(/_/g, ' ')}: ${e.people}${e.top[0] ? ` (top: ${e.top[0].detail})` : ''}`).join(' · ')}
                </p>
              )}
            </>
          );
        })()}
      </section>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6 items-start">
        <section className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
          <h2 className="font-serif text-lg text-[#191614] mb-3">Top referrers</h2>
          {s.topReferrers.length ? (
            <table className="w-full text-xs">
              <thead className="text-[#8E867C] text-left">
                <tr><th className="py-1">Wedding</th><th>Joined</th><th>Paid</th></tr>
              </thead>
              <tbody>
                {s.topReferrers.map((r) => (
                  <tr key={r.slug} className="border-t border-[#F2ECE3]">
                    <td className="py-1.5 font-mono">{r.slug}</td>
                    <td>{r.referrals}</td>
                    <td>{r.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-[#8E867C]">No referrals yet.</p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-[#E8E2D8] p-5 overflow-x-auto">
          <h2 className="font-serif text-lg text-[#191614] mb-3">Latest couples</h2>
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="text-[#8E867C] text-left">
              <tr><th className="py-1 pr-3">Couple</th><th className="pr-3">Wedding</th><th className="pr-3">Plan</th><th className="pr-3">Paid</th><th className="pr-3">Invited / opened</th><th className="pr-3">RSVPs</th><th>Via</th></tr>
            </thead>
            <tbody>
              {s.recent.map((r) => (
                <tr key={r.slug} className="border-t border-[#F2ECE3]">
                  <td className="py-1.5 pr-3">
                    <a href={inviteUrl(r.slug)} target="_blank" rel="noopener" className="underline">{r.names}</a>
                  </td>
                  <td className="pr-3">{r.weddingDate}</td>
                  <td className="pr-3">{r.plan === 'free' ? 'Free' : r.plan === 'digital_classic' ? 'Classic' : 'Royal'}</td>
                  <td className="pr-3">{r.paymentId?.startsWith('demo') ? 'demo' : r.amountInr ? inr(r.amountInr) : '—'}</td>
                  <td className="pr-3">{r.invited} / {r.opens}</td>
                  <td className="pr-3">{r.rsvps}</td>
                  <td className="font-mono">{r.referredBy ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
