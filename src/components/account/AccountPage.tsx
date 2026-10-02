import React, { useEffect, useState } from 'react';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { SITE } from '../../../site.config';
import { WeddingData } from '../../types/wedding';
import { AppView } from '../../hooks/useWeddingState';
import { fetchAppConfig, requestLoginCode, SignedInWedding, verifyLoginCode } from '../../utils/api';
import { formatDate } from '../../utils/design';

/**
 * Sign in with the email linked to a wedding (one-time code, no password) to edit it on this device.
 * The email is linked automatically when the couple pays, or from the dashboard.
 */
export const AccountPage: React.FC<{
  weddingData: WeddingData;
  openWedding: (slug: string, editKey: string) => Promise<void>;
  setCurrentView: (view: AppView) => void;
}> = ({ weddingData, openWedding, setCurrentView }) => {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [step, setStep] = useState<'email' | 'code' | 'choose'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [weddings, setWeddings] = useState<SignedInWedding[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppConfig().then((c) => setAvailable(c.accounts), () => setAvailable(false));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const open = (w: SignedInWedding) =>
    run(async () => {
      // An unpublished draft on this device would be replaced; published ones are safe on the server.
      const draft = !weddingData.editKey && (weddingData.partner1.name || weddingData.partner2.name);
      if (draft && w.slug !== weddingData.customSlug && !window.confirm('This device has an unpublished draft. Open your saved wedding instead? The draft will be replaced.')) return;
      await openWedding(w.slug, w.editKey);
      setCurrentView('dashboard');
    });

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const r = await requestLoginCode(email);
      setDevCode(r.devCode ?? '');
      setStep('code');
    });
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const r = await verifyLoginCode(email, code);
      if (!r.weddings.length) return setError('No wedding is linked to this email yet.');
      if (r.weddings.length === 1) return open(r.weddings[0]);
      setWeddings(r.weddings);
      setStep('choose');
    });
  };

  const input = 'w-full px-3.5 py-3 text-sm bg-white border border-[#E8E2D8] rounded-xl focus:outline-none focus:border-[#B38B45]';
  const button = 'w-full py-3 text-xs font-semibold uppercase tracking-wider text-white bg-[#191614] hover:bg-[#B38B45] rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E2D8] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="space-y-1">
          <ShieldCheck className="w-7 h-7 text-[#B38B45]" />
          <h1 className="font-serif text-3xl text-[#191614]">Sign in to your wedding</h1>
          <p className="text-xs text-[#6B655E]">
            Use the email linked to your wedding: the one you paid with, or the one you saved on your dashboard. We’ll send a 6-digit code. No password.
          </p>
        </div>

        {weddingData.editKey && (
          <p className="rounded-xl bg-[#F4EFE6] p-3 text-xs text-[#554C44]">
            This device already has {weddingData.partner1.name} &amp; {weddingData.partner2.name}.{' '}
            <button onClick={() => setCurrentView('dashboard')} className="underline font-semibold cursor-pointer">Open dashboard</button>
          </p>
        )}

        {available === false ? (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Email sign-in isn’t switched on for this site yet. Contact {SITE.business.email || 'the site owner'} with your invitation link to recover access.
          </p>
        ) : step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-3">
            <label className="block">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#8E867C] mb-1.5">Email</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
            </label>
            <button disabled={busy || available === null} className={button}>
              <Mail className="w-4 h-4" /> {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </form>
        ) : step === 'code' ? (
          <form onSubmit={verify} className="space-y-3">
            <p className="text-xs text-[#554C44]">
              If <strong>{email}</strong> is linked to a wedding, a code is on its way. It works for 10 minutes.
            </p>
            {devCode && <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900">Test server, no email provider: your code is <strong>{devCode}</strong></p>}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              aria-label="6-digit code"
              className={`${input} text-center text-2xl tracking-[0.5em] font-semibold`}
            />
            <button disabled={busy || code.length !== 6} className={button}>
              {busy ? 'Checking…' : 'Sign in'} <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => (setStep('email'), setCode(''), setError(''))} className="w-full text-xs underline text-[#6B655E] cursor-pointer">
              Use a different email or resend
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[#554C44]">Which wedding would you like to open?</p>
            {weddings.map((w) => (
              <button key={w.slug} onClick={() => open(w)} disabled={busy} className="w-full text-left p-3 rounded-xl border border-[#E8E2D8] hover:border-[#191614] cursor-pointer">
                <span className="block font-serif text-lg text-[#191614]">{w.names}</span>
                <span className="text-xs text-[#8E867C]">{w.weddingDate ? formatDate(w.weddingDate) : ''} · /invite/{w.slug}</span>
              </button>
            ))}
          </div>
        )}

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      </div>
    </div>
  );
};
