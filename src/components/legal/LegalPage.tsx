import React, { useEffect } from 'react';
import { PLANS } from '../../data/pricing';
import { SITE } from '../../../site.config';

// The pages Razorpay reviews before activating live payments: Contact, Terms, Privacy, Refund, Delivery.
// Every statement here describes what the code actually does. Business details come from site.config.ts
// and are never invented; empty ones are simply left out.
const BUSINESS = SITE.business.legalName || SITE.name;
const { email: EMAIL, phone: PHONE, address: ADDRESS } = SITE.business;
const UPDATED = SITE.policiesUpdated;

export const LEGAL_SECTIONS = [
  ['contact', 'Contact us'],
  ['terms', 'Terms & Conditions'],
  ['privacy', 'Privacy Policy'],
  ['refund', 'Cancellation & Refund Policy'],
  ['delivery', 'Shipping & Delivery Policy'],
] as const;

const plans = Object.values(PLANS).map((p) => `${p.name} (₹${p.priceInr})`).join(' and ');
const mail = EMAIL ? <a className="text-[#8F6D31] underline" href={`mailto:${EMAIL}`}>{EMAIL}</a> : 'the contact details above';

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 space-y-3 border-t border-[#E8E2D8] pt-10">
    <h2 className="font-serif text-3xl text-[#191614]">{title}</h2>
    <div className="space-y-3 text-[15px] leading-relaxed text-[#4A443E] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{children}</div>
  </section>
);

export const LegalPage: React.FC = () => {
  // #/legal/refund scrolls to that section.
  useEffect(() => {
    const go = () => document.getElementById(window.location.hash.split('/')[2] ?? '')?.scrollIntoView();
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-14 sm:px-6">
      <header className="space-y-4">
        <h1 className="font-serif text-5xl text-[#191614]">Policies</h1>
        <p className="text-sm text-[#6B655E]">Last updated {UPDATED}. {BUSINESS} operates this website.</p>
        <nav className="flex flex-wrap gap-2 text-sm">
          {LEGAL_SECTIONS.map(([id, label]) => (
            <a key={id} href={`#/legal/${id}`} className="rounded-full border border-[#E8E2D8] bg-white px-3 py-1 hover:border-[#B38B45]">{label}</a>
          ))}
        </nav>
      </header>

      <Section id="contact" title="Contact us">
        <ul>
          <li>Business: {BUSINESS}</li>
          {EMAIL && <li>Email: {mail}</li>}
          {PHONE && <li>Phone: <a className="text-[#8F6D31] underline" href={`tel:${PHONE.replace(/\s/g, '')}`}>{PHONE}</a></li>}
          {ADDRESS && <li>Address: {ADDRESS}</li>}
        </ul>
        <p>We reply to support, payment and data requests within 2 working days.</p>
      </Section>

      <Section id="terms" title="Terms & Conditions">
        <p>By using this website you agree to these terms. They are governed by the laws of India.</p>
        <ul>
          <li><b>The service.</b> You design a wedding invitation website and animated video in your browser, publish it at a link on this site, share it with guests, and collect their RSVPs.</li>
          <li><b>No account.</b> Your draft is saved in your browser. When you publish, we give that browser a private edit key. Anyone holding the key can edit the invitation and read RSVPs, and if you clear your browser data without it you may lose edit access. Keep your device secure.</li>
          <li><b>Your content.</b> You own the names, text, photos and guest details you enter. You confirm you have the right to use them and to invite the people on your guest list. You give us permission to store and display them only to run the service.</li>
          <li><b>Acceptable use.</b> Do not publish unlawful, hateful or misleading content, impersonate others, or send messages to people who have not agreed to hear from you. We may take down an invitation that breaks these rules.</li>
          <li><b>Paid plans.</b> {plans} are one-time payments for one wedding, with no subscription or automatic renewal. Prices are in Indian Rupees and are shown before you pay. Payments are processed by Razorpay.</li>
          <li><b>Availability.</b> We work to keep invitations online but do not guarantee uninterrupted service. Our total liability for any claim is limited to the amount you paid us.</li>
          <li><b>Changes.</b> We may update these terms; the date above shows the latest version.</li>
        </ul>
      </Section>

      <Section id="privacy" title="Privacy Policy">
        <p>What we collect and why:</p>
        <ul>
          <li><b>Couple's details</b>: names, dates, venues, photos, story and design choices you enter. Stored in your browser, and on our server once you publish, to show your invitation to guests.</li>
          <li><b>Guest list</b>: names, phone numbers and email addresses you add. Used only to create each guest's personal link, and to email invitations when you ask us to.</li>
          <li><b>RSVPs</b>: what guests submit in the reply form: name, phone, optional email, attendance, headcount, events, meal preference and any message. Visible only to the couple holding the edit key.</li>
          <li><b>Link opens</b>: when a guest opens their personal link, we record that it was opened and when, so the couple sees who has seen the invitation.</li>
          <li><b>Payments</b>: card, UPI and bank details are entered only in Razorpay's window and never reach our servers. We keep the plan bought, the amount, the payment ID and the date, and the email address you gave Razorpay, which becomes your account email.</li>
          <li><b>Account email</b>: the email you pay with or save on your dashboard. Used only to send you sign-in codes so you can edit your wedding on another device.</li>
          <li><b>Usage events</b>: anonymous steps such as "started a wedding", "downloaded an image" or "opened checkout", tied to a random ID stored in your browser (not a cookie) and never to your name, phone or email. We use the counts to improve the product.</li>
          <li><b>Technical data</b>: IP addresses are used briefly in memory to limit abuse (rate limiting) and are not stored.</li>
        </ul>
        <p>We do not sell personal data or use it for advertising. We share it only with the providers that run the service: our hosting and database provider, Razorpay (payments) and, if email invitations are used, our email delivery provider. We do not use tracking cookies.</p>
        <p>Published invitations and their RSVPs are kept until you ask us to delete them. To access, correct or delete your data, or your guests' data, write to {mail} from the couple's contact, quoting your invitation link. Guests may ask the same about their own RSVP.</p>
      </Section>

      <Section id="refund" title="Cancellation & Refund Policy">
        <ul>
          <li><b>Try before you pay.</b> The free plan lets you design, preview and publish your invitation, preview the video and collect RSVPs before buying anything, so you can check the product fully first.</li>
          <li><b>All sales are final.</b> Paid plans are digital and unlock instantly, so payments are non-refundable and cannot be cancelled once the plan is unlocked, including for change of mind or unused features.</li>
          <li><b>Payment errors.</b> If you were charged twice for the same plan, or charged and the plan was not unlocked, write to {mail} with your invitation link and Razorpay payment ID. We will unlock the plan or return the wrongly charged amount through Razorpay to the original payment method, usually within 5–7 working days.</li>
          <li>Plans are one-time purchases, so there is no subscription to cancel.</li>
        </ul>
      </Section>

      <Section id="delivery" title="Shipping & Delivery Policy">
        <p>{BUSINESS} sells a digital service only. Nothing is shipped. Your plan is unlocked on your invitation immediately after a successful payment, and you get an on-screen receipt. If the plan does not unlock within a few minutes, write to {mail} with your payment ID and we will activate it (see Payment errors above).</p>
      </Section>
    </div>
  );
};
