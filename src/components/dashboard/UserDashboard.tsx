import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SITE } from '../../../site.config';
import qrcode from 'qrcode-generator';
import { WeddingData, GuestRSVP } from '../../types/wedding';
import { AppView } from '../../hooks/useWeddingState';
import {
  CheckCircle2, XCircle, Download, Search, Trash2, QrCode, ArrowLeft, Sparkles, Phone,
  Copy, FileText, X, Printer, RefreshCw, Lock, Globe, ExternalLink, Gift,
} from 'lucide-react';
import { entitlements, inr, limit, PLANS, REFERRAL_DISCOUNT_INR, REFERRER_CREDIT_INR } from '../../data/pricing';
import { fetchRsvps, inviteUrl, referralUrl, removeRsvp, RsvpPage, setOwnerEmail } from '../../utils/api';
import { reconcilePayments } from '../../utils/payments';
import { GuestManager } from './GuestManager';
import { formatDate, resolveDesign } from '../../utils/design';
import { TemplateDefinition } from '../../types/template';
import { ShareAssets } from './ShareAssets';
import { track } from '../../utils/analytics';

interface UserDashboardProps {
  weddingData: WeddingData;
  activeTemplate: TemplateDefinition;
  updateWeddingData: (updates: Partial<WeddingData>) => void;
  deleteRSVP: (id: string) => void;
  setCurrentView: (view: AppView) => void;
  onOpenCheckout?: (plan?: 'digital_classic' | 'royal_suite') => void;
  publish: () => Promise<WeddingData>;
  syncError?: string;
}

// Guests type these fields: a leading = + - @ would run as a formula when the caterer opens the CSV in Excel.
const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

const MEAL_LABEL: Record<GuestRSVP['mealPreference'], string> = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-veg',
  jain: 'Jain',
  vegan: 'Vegan',
  any: 'No preference',
};

export const UserDashboard: React.FC<UserDashboardProps> = ({
  weddingData,
  activeTemplate,
  updateWeddingData,
  deleteRSVP,
  setCurrentView,
  onOpenCheckout,
  publish,
  syncError,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [server, setServer] = useState<RsvpPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLive = !!weddingData.editKey;
  const design = useMemo(() => resolveDesign(activeTemplate, weddingData.customDesign), [activeTemplate, weddingData.customDesign]);
  const slug = weddingData.customSlug;

  // RSVPs only exist on the server, so there are none until the invitation is published.
  const load = useCallback(async () => {
    if (!weddingData.editKey) return;
    setLoading(true);
    try {
      const page = await fetchRsvps(slug, weddingData.editKey);
      setServer(page);
      setError('');
      // The server is the source of truth for what was paid.
      if (page.plan !== weddingData.plan) updateWeddingData({ plan: page.plan, paidAt: page.paidAt, amountPaidInr: page.amountInr });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, weddingData.editKey]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // A payment confirmed after its checkout window closed (UPI QR approved on the phone) lands here.
  useEffect(() => {
    if (weddingData.editKey) reconcilePayments(slug).then((r) => void (r.paymentId && load()), () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, weddingData.editKey]);

  const [accountEmail, setAccountEmail] = useState('');
  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setOwnerEmail(slug, weddingData.editKey!, accountEmail);
      setAccountEmail('');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const rsvps = isLive ? (server?.rsvps ?? []) : [];
  const hiddenCount = isLive ? (server?.hiddenCount ?? 0) : 0;
  const plan = weddingData.plan ?? 'free';

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this response?')) return;
    if (!isLive) return deleteRSVP(id);
    await removeRsvp(slug, weddingData.editKey!, id).catch((e: Error) => setError(e.message));
    load();
  };

  const hasDetails = !!(weddingData.partner1.name && weddingData.partner2.name && weddingData.weddingDate);
  const handlePublish = async () => {
    if (!hasDetails) return setCurrentView('onboarding'); // nothing of theirs to publish yet
    setError('');
    try {
      await publish();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const attending = rsvps.filter((r) => r.attending);
  const totalAttendingGuests = attending.reduce((acc, r) => acc + r.guestsCount, 0);
  const mealCounts = useMemo(() => {
    const counts = { vegetarian: 0, non_vegetarian: 0, jain: 0, vegan: 0 };
    rsvps.forEach((r) => {
      if (r.attending && r.mealPreference in counts) counts[r.mealPreference as keyof typeof counts] += r.guestsCount;
    });
    return counts;
  }, [rsvps]);

  const filteredRSVPs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rsvps.filter((r) => {
      if (q && !r.guestName.toLowerCase().includes(q) && !r.phone.includes(q) && !r.email.toLowerCase().includes(q)) return false;
      if (mealFilter === 'declined') return !r.attending;
      if (mealFilter !== 'all' && (!r.attending || r.mealPreference !== mealFilter)) return false;
      return true;
    });
  }, [rsvps, searchTerm, mealFilter]);

  const exportCSV = () => {
    const eventTitle = (id: string) => weddingData.events.find((e) => e.id === id)?.title ?? id;
    const headers = ['Guest Name', 'Attending', 'Guest Count', 'Meal Preference', 'Events', 'Phone', 'Email', 'Dietary Restrictions', 'Message', 'Submitted At'];
    const rows = rsvps.map((r) =>
      [r.guestName, r.attending ? 'Yes' : 'No', r.guestsCount, r.attending ? MEAL_LABEL[r.mealPreference] : '', r.eventsAttending.map(eventTitle).join('; '), r.phone, r.email, r.dietaryRestrictions, r.message, r.submittedAt].map(csvCell).join(','),
    );
    // BOM so Excel reads names in Hindi/Tamil etc. as UTF-8.
    const blob = new Blob(['﻿' + [headers.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-rsvps.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text).catch(() => window.prompt('Copy this:', text));
    setCopied(what);
    setTimeout(() => setCopied(''), 2000);
  };

  const qr = useMemo(() => {
    if (!isLive) return null;
    const q = qrcode(0, 'M');
    q.addData(inviteUrl(slug));
    q.make();
    return { svg: q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }), png: q.createDataURL(10, 4) };
  }, [isLive, slug]);

  const sellerName = SITE.business.legalName;
  const gstin = SITE.business.gstin;
  const paidPlanName = plan !== 'free' ? PLANS[plan].name : '';
  const amountPaid = weddingData.amountPaidInr ?? (plan !== 'free' ? PLANS[plan].priceInr : 0);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Top Banner */}
      <div className="bg-white border-b border-[#E8E2D8] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => setCurrentView('landing')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8F6D31] hover:text-[#191614] mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </button>
              <h1 data-split className="text-3xl sm:text-4xl font-serif text-[#191614]">
                Share &amp; RSVP Hub
              </h1>
              <p className="text-xs sm:text-sm text-[#6B655E] mt-1">
                {weddingData.partner1.name && weddingData.partner2.name
                  ? `${weddingData.partner1.name} & ${weddingData.partner2.name} · ${formatDate(weddingData.weddingDate)}`
                  : 'Add your names and date in “Add details” to get started.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQRModal(true)}
                disabled={!isLive}
                className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#191614] bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <QrCode className="w-4 h-4 text-[#B38B45]" />
                <span>QR Code</span>
              </button>
              <button
                onClick={exportCSV}
                disabled={!rsvps.length}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#191614] hover:bg-[#B38B45] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6 sm:space-y-8">
        {(error || syncError) && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error || `Your latest edits haven't reached the live site yet: ${syncError}`}
          </div>
        )}

        {/* Publish status: the one thing that must happen before anything can be shared */}
        {isLive ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Live · edits update automatically</span>
                <p className="text-sm font-mono text-[#191614] truncate">{inviteUrl(slug)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => (copy(inviteUrl(slug), 'main'), track('wedding_shared', 'copy'))} className="px-3 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg cursor-pointer flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> {copied === 'main' ? 'Copied!' : 'Copy'}
              </button>
              <a href={inviteUrl(slug)} target="_blank" rel="noopener" className="px-3 py-2 text-xs font-semibold bg-[#191614] text-white hover:bg-[#B38B45] rounded-lg flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Open as guest
              </a>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#191614] text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-[#C9A45C] shrink-0" />
              <div>
                <h2 className="text-lg font-serif">Your invitation isn&rsquo;t live yet</h2>
                <p className="text-xs text-white/70">
                  Publish to get your guest link, WhatsApp sharing, a scannable QR code and real RSVPs. Free to publish; upgrade any time.
                </p>
              </div>
            </div>
            <button onClick={handlePublish} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider bg-[#B38B45] hover:bg-[#C9A45C] text-[#191614] rounded-xl cursor-pointer shrink-0">
              {hasDetails ? 'Publish my invitation' : 'Add your details'}
            </button>
          </div>
        )}

        {/* Plan Status Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E8E2D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8EC] border border-[#E8D9B8] flex items-center justify-center text-[#B38B45] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31]">Your plan</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFE8DD] text-[#191614]">
                  {plan === 'free' ? 'Free' : PLANS[plan].name}
                </span>
              </div>
              <p className="text-xs text-[#6B655E] mt-0.5">
                {plan === 'royal_suite'
                  ? 'Unlimited RSVPs, video download, every share image, wax-seal envelope, no branding.'
                  : plan === 'digital_classic'
                    ? `Up to ${limit(entitlements('digital_classic').visibleRsvps)} visible RSVPs, every share image, no branding. Upgrade for the video download and wax-seal envelope.`
                    : `Live invitation with the first ${limit(entitlements('free').visibleRsvps)} RSVPs and a small ${SITE.name} credit. Upgrade to see every reply.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {plan !== 'free' && (
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="px-3 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#B38B45]" />
                <span>Receipt</span>
              </button>
            )}
            {onOpenCheckout && plan !== 'royal_suite' && (
              <button
                onClick={() => onOpenCheckout('royal_suite')}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#191614] hover:bg-[#B38B45] rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C9A45C]" />
                <span>{plan === 'free' ? `Upgrade from ${inr(PLANS.digital_classic.priceInr)}` : 'Upgrade to Royal'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Account: the couple's email recovers edit access on any device (the edit key lives only in this browser). */}
        {isLive && server && (
          server.ownerEmail ? (
            <p className="px-4 py-3 rounded-2xl bg-white border border-[#E8E2D8] text-xs text-[#554C44]">
              Your account: <strong className="text-[#191614]">{server.ownerEmail}</strong>. Sign in with it on any device to edit your wedding.
            </p>
          ) : (
            <form onSubmit={saveAccount} className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#E8D9B8] flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <h2 className="font-serif text-lg text-[#191614]">Save your wedding to your email</h2>
                <p className="text-xs text-[#6B655E]">Right now only this browser can edit it. Add your email to sign in from any phone or laptop.</p>
              </div>
              <input type="email" required value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} placeholder="you@example.com" aria-label="Account email" className="px-3 py-2.5 text-sm border border-[#E8E2D8] rounded-lg md:w-64" />
              <button className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#191614] hover:bg-[#B38B45] text-white rounded-lg cursor-pointer">Save email</button>
            </form>
          )
        )}

        {isLive && <ShareAssets weddingData={weddingData} design={design} onUpgrade={onOpenCheckout} />}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            ['Confirmed guests', totalAttendingGuests, `${attending.length} accepted · ${rsvps.length - attending.length} declined`],
            ['Vegetarian', mealCounts.vegetarian + mealCounts.jain + mealCounts.vegan, `Jain ${mealCounts.jain} · Vegan ${mealCounts.vegan}`],
            ['Non-vegetarian', mealCounts.non_vegetarian, 'Seats'],
            ['Responses', server?.total ?? rsvps.length, isLive ? (hiddenCount ? `${hiddenCount} locked` : 'All visible') : 'Publish to collect'],
          ].map(([label, value, sub]) => (
            <div key={label as string} className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E8E2D8] shadow-sm">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#8E867C] block mb-1">{label}</span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#191614] tabular-nums">{value}</div>
              <span className="text-[10px] sm:text-xs text-[#8E867C] block mt-1 truncate">{sub}</span>
            </div>
          ))}
        </div>

        {isLive ? (
          <GuestManager weddingData={weddingData} onUpgrade={onOpenCheckout} />
        ) : (
          <div className="p-5 rounded-2xl bg-white border border-[#E8E2D8] text-xs text-[#6B655E]">
            <strong className="block font-serif text-base text-[#191614]">Guest list &amp; sending</strong>
            Publish first. Then add your guests and send every family their own invitation on WhatsApp, see who opened it, and remind those who haven&rsquo;t replied.
          </div>
        )}

        {/* Referral: couples who came through this wedding save money; this couple earns credit */}
        {isLive && server && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#F4EFE6] border border-[#E8DEC8] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Gift className="w-6 h-6 text-[#B38B45] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-serif text-lg text-[#191614]">Know another couple getting married?</h3>
                <p className="text-xs text-[#5A5147] mt-0.5">
                  Share your link: they get ₹{REFERRAL_DISCOUNT_INR} off, and you earn ₹{REFERRER_CREDIT_INR} credit towards your plan for each couple who upgrades.
                </p>
                <p className="text-xs text-[#191614] mt-2 font-semibold">
                  {server.referrals} joined · {server.paidReferrals} upgraded · ₹{Math.max(0, server.creditInr)} credit available
                  {server.referred && <span className="font-normal text-[#6B655E]"> · you have a friend discount too</span>}
                </p>
              </div>
            </div>
            <button onClick={() => copy(referralUrl(slug), 'ref')} className="px-4 py-2.5 text-xs font-semibold bg-[#191614] hover:bg-[#B38B45] text-white rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0">
              <Copy className="w-3.5 h-3.5" /> {copied === 'ref' ? 'Copied!' : 'Copy my referral link'}
            </button>
          </div>
        )}

        {/* Shortcuts */}
        <div className="p-4 rounded-2xl bg-[#F4EFE6] border border-[#E8DEC8] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-[#5A5147] text-center sm:text-left">
            Website, video and RSVPs share the same details. Edit them once and everything updates.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={() => setCurrentView('onboarding')} className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white border border-[#DCD2C2] hover:border-[#191614] rounded-lg text-[#191614] font-medium cursor-pointer">
              Edit details
            </button>
            <button onClick={() => setCurrentView('invite-preview')} className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white border border-[#DCD2C2] hover:border-[#191614] rounded-lg text-[#191614] font-medium cursor-pointer">
              Website
            </button>
            <button onClick={() => setCurrentView('video-maker')} className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#191614] hover:bg-[#B38B45] text-white rounded-lg font-medium cursor-pointer">
              Video
            </button>
          </div>
        </div>

        {/* RSVP paywall: replies are never lost, only locked */}
        {hiddenCount > 0 && (
          <div className="p-5 rounded-2xl border-2 border-[#B38B45] bg-[#FFF8EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-[#8F6D31] shrink-0" />
              <div>
                <h3 className="font-serif text-lg text-[#191614]">
                  {hiddenCount} more {hiddenCount === 1 ? 'guest has' : 'guests have'} replied
                </h3>
                <p className="text-xs text-[#6B655E]">
                  Your plan shows the first {entitlements(plan).visibleRsvps}. Every reply is saved; upgrade to see names, meals and messages.
                </p>
              </div>
            </div>
            {onOpenCheckout && (
              <button
                onClick={() => onOpenCheckout(plan === 'free' && hiddenCount + entitlements('free').visibleRsvps <= entitlements('digital_classic').visibleRsvps ? 'digital_classic' : 'royal_suite')}
                className="px-5 py-3 text-xs font-semibold uppercase tracking-wider bg-[#191614] hover:bg-[#B38B45] text-white rounded-xl cursor-pointer shrink-0"
              >
                Unlock all replies
              </button>
            )}
          </div>
        )}

        {/* Guest Responses */}
        <div className="bg-white rounded-2xl border border-[#E8E2D8] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E8E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-serif font-semibold text-[#191614] flex items-center gap-2">
              Guest replies ({filteredRSVPs.length})
              {!isLive && <span className="text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFE8DD] text-[#8F6D31]">Sample</span>}
              {isLive && (
                <button onClick={load} title="Refresh" className="p-1 text-[#8E867C] hover:text-[#191614] cursor-pointer">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </h2>

            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search guest or phone..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg focus:outline-none focus:border-[#B38B45]"
                />
              </div>
              <select
                value={mealFilter}
                onChange={(e) => setMealFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg text-[#191614] focus:outline-none focus:border-[#B38B45]"
              >
                <option value="all">Everyone</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="jain">Jain</option>
                <option value="vegan">Vegan</option>
                <option value="non_vegetarian">Non-Vegetarian</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          {filteredRSVPs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E867C]">
              {rsvps.length ? 'No replies match your search.' : isLive ? 'No replies yet. Share your link on WhatsApp to start collecting RSVPs.' : 'No replies yet.'}
            </div>
          ) : (
            <div className="divide-y divide-[#E8E2D8]">
              {filteredRSVPs.map((rsvp) => (
                <div key={rsvp.id} className="p-4 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1.6fr_auto] sm:items-center text-xs">
                  <div>
                    <h4 className="font-serif font-bold text-[#191614] text-sm">{rsvp.guestName}</h4>
                    {rsvp.attending ? (
                      <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Attending · {rsvp.guestsCount} {rsvp.guestsCount === 1 ? 'guest' : 'guests'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-rose-700 font-medium inline-flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Declined
                      </span>
                    )}
                  </div>
                  <span className="text-[#6B655E]">{rsvp.attending ? MEAL_LABEL[rsvp.mealPreference] : '—'}</span>
                  <span className="text-[#6B655E] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#B38B45] shrink-0" />
                    <span className="truncate">{rsvp.phone}</span>
                  </span>
                  <span className="text-[#6B655E] italic line-clamp-2" title={rsvp.message}>
                    {rsvp.message ? `“${rsvp.message}”` : ''}
                  </span>
                  <button onClick={() => handleDelete(rsvp.id)} className="justify-self-end text-[#8E867C] hover:text-rose-600 p-1.5 cursor-pointer" title="Remove response">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && qr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-[#E8E2D8] shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8F6D31] block">Scan to open the invitation</span>
            <h3 className="text-xl font-serif text-[#191614]">
              {weddingData.partner1.shortName} &amp; {weddingData.partner2.shortName}
            </h3>
            <div className="p-3 bg-white rounded-2xl border border-[#E8E2D8] mx-auto w-52 [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: qr.svg }} />
            <p className="text-xs text-[#6B655E] max-w-xs mx-auto">Print it on your wedding cards or place it at the welcome desk.</p>
            <div className="flex gap-2">
              <a href={qr.png} download={`${slug}-qr.gif`} className="flex-1 py-2.5 bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] text-[#191614] rounded-xl text-xs font-semibold uppercase tracking-wider">
                Download
              </a>
              <button onClick={() => setShowQRModal(false)} className="flex-1 py-2.5 bg-[#191614] hover:bg-[#B38B45] text-white rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment receipt. It becomes a tax invoice only when the business has configured its real GSTIN. */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-left border border-[#E8E2D8] shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-[#E8E2D8]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8F6D31]">{gstin ? 'Tax invoice' : 'Payment receipt'}</span>
                <h3 className="text-lg font-serif font-bold text-[#191614]">{sellerName}</h3>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="p-1 text-[#8E867C] hover:text-[#191614] rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="text-xs space-y-2 text-[#4A453F]">
              {[
                ['Receipt no.', weddingData.invoiceId || '—'],
                ['Date', weddingData.paidAt ? new Date(weddingData.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
                ['Billed to', `${weddingData.partner1.name} & ${weddingData.partner2.name}`],
                ...(gstin ? [['GSTIN', gstin]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-[#8E867C]">{k}</dt>
                  <dd className="font-mono text-right">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D8] text-xs space-y-2">
              <div className="flex justify-between text-[#6B655E]">
                <span>{paidPlanName} (one-time, per wedding)</span>
                <span className="font-mono">₹{amountPaid.toFixed(2)}</span>
              </div>
              {gstin && (
                <div className="flex justify-between text-[#6B655E]">
                  <span>Includes GST @18%</span>
                  <span className="font-mono">₹{(amountPaid - amountPaid / 1.18).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#191614] pt-2 border-t border-[#E8E2D8] text-sm">
                <span>Total paid</span>
                <span className="font-mono">₹{amountPaid.toFixed(2)}</span>
              </div>
              {weddingData.invoiceId?.startsWith('DEMO') && <p className="text-amber-700">Demo checkout: nothing was charged.</p>}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => window.print()} className="flex-1 py-2.5 bg-[#FAF8F5] border border-[#E8E2D8] hover:border-[#191614] text-[#191614] rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button onClick={() => setShowInvoiceModal(false)} className="flex-1 py-2.5 bg-[#191614] hover:bg-[#B38B45] text-white rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
