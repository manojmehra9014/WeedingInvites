/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hasCoupleNames, withPlaceholders } from './data/emptyWedding';
import { useWeddingState } from './hooks/useWeddingState';
import { TopNav } from './components/layout/TopNav';
import { Footer } from './components/layout/Footer';
import { JourneyBar } from './components/layout/JourneyBar';
import { useGsapReveal } from './hooks/useGsapReveal';
import { gsap, prefersReducedMotion } from './utils/gsap';

// Landing Sections
import { HeroSection } from './components/landing/HeroSection';
import { DualOutputSection } from './components/landing/DualOutputSection';
import { WorkflowSection } from './components/landing/WorkflowSection';
import { CulturalShowcase } from './components/landing/CulturalShowcase';
import { FeaturesBento } from './components/landing/FeaturesBento';
import { SocialProofPricing } from './components/landing/SocialProofPricing';
import { TemplateReel } from './components/landing/TemplateReel';
import { CeremonyMarquee } from './components/landing/CeremonyMarquee';

// Application Feature Views
import { TemplateCatalogView } from './components/catalog/TemplateCatalogView';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { InvitationRenderer } from './components/templates/InvitationRenderer';
import { VideoMaker } from './components/video/VideoMaker';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { CheckoutModal } from './components/common/CheckoutModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AccountPage } from './components/account/AccountPage';
import { LegalPage } from './components/legal/LegalPage';

export default function App() {
  const {
    weddingData,
    currentView,
    setCurrentView,
    selectedTemplateId,
    selectTemplate,
    activeTemplate,
    allTemplates,
    previewDevice,
    setPreviewDevice,
    updateWeddingData,
    submitRSVP,
    deleteRSVP,
    publish,
    openWedding,
    syncError,
  } = useWeddingState();

  // Previews show neutral placeholders for anything the couple hasn't entered yet; real data is never altered.
  const previewData = useMemo(() => withPlaceholders(weddingData, activeTemplate), [weddingData, activeTemplate]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutDefaultPlan, setCheckoutDefaultPlan] = useState<'digital_classic' | 'royal_suite'>('royal_suite');

  const openCheckout = (plan: 'digital_classic' | 'royal_suite' = 'royal_suite') => {
    setCheckoutDefaultPlan(plan);
    setIsCheckoutOpen(true);
  };

  const mainRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Every view change: jump to top, then let the new page rise in.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!mainRef.current || prefersReducedMotion()) return;
    // Opacity only: a transform on <main> would break ScrollTrigger pinning inside it.
    const tween = gsap.fromTo(mainRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' });
    return () => {
      tween.kill();
    };
  }, [currentView]);

  // Landing-page reading progress: a gold hairline scrubbed to scroll position.
  useLayoutEffect(() => {
    if (currentView !== 'landing' || !progressRef.current) return;
    const tween = gsap.fromTo(
      progressRef.current,
      { scaleX: 0 },
      { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [currentView]);

  // One declarative motion scope for every view (see useGsapReveal for the attribute vocabulary).
  useGsapReveal(mainRef, [currentView]);

  const isStudio = currentView === 'invite-preview' || currentView === 'video-maker';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#191614] flex flex-col font-sans">
      {currentView === 'landing' && (
        <div ref={progressRef} className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-gradient-to-r from-[#8F6D31] via-[#E5CE9F] to-[#B38B45]" />
      )}

      {/* Studio views (preview/video) bring their own toolbars */}
      {!isStudio && (
        <TopNav 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          onOpenCheckout={openCheckout}
        />
      )}

      <JourneyBar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1">
        {currentView === 'landing' && (
          <>
            <HeroSection
              weddingData={previewData}
              allTemplates={allTemplates}
              setCurrentView={setCurrentView}
            />
            <CeremonyMarquee />
            <TemplateReel
              weddingData={previewData}
              allTemplates={allTemplates}
              selectTemplate={selectTemplate}
              setCurrentView={setCurrentView}
            />
            <DualOutputSection
              weddingData={previewData}
              activeTemplate={activeTemplate}
              setCurrentView={setCurrentView}
            />
            <WorkflowSection setCurrentView={setCurrentView} />
            <CulturalShowcase
              setCurrentView={setCurrentView}
              selectTemplate={selectTemplate}
            />
            <FeaturesBento setCurrentView={setCurrentView} />
            <SocialProofPricing 
              setCurrentView={setCurrentView} 
              onOpenCheckout={openCheckout}
            />
          </>
        )}

        {currentView === 'catalog' && (
          <TemplateCatalogView
            weddingData={previewData}
            allTemplates={allTemplates}
            selectedTemplateId={selectedTemplateId}
            selectTemplate={selectTemplate}
            setCurrentView={setCurrentView}
            onOpenCheckout={openCheckout}
          />
        )}

        {currentView === 'onboarding' && (
          <OnboardingWizard
            weddingData={weddingData}
            updateWeddingData={updateWeddingData}
            allTemplates={allTemplates}
            selectedTemplateId={selectedTemplateId}
            selectTemplate={selectTemplate}
            setCurrentView={setCurrentView}
          />
        )}

        {currentView === 'invite-preview' && (
          <InvitationRenderer
            weddingData={previewData}
            updateWeddingData={updateWeddingData}
            activeTemplate={activeTemplate}
            submitRSVP={submitRSVP}
            setCurrentView={setCurrentView}
            previewDevice={previewDevice}
            setPreviewDevice={setPreviewDevice}
            onOpenCheckout={openCheckout}
            publish={publish}
          />
        )}

        {currentView === 'video-maker' && (
          <VideoMaker
            weddingData={previewData}
            hasDetails={hasCoupleNames(weddingData) && !!weddingData.weddingDate}
            activeTemplate={activeTemplate}
            setCurrentView={setCurrentView}
            onOpenCheckout={openCheckout}
          />
        )}

        {currentView === 'dashboard' && (
          <UserDashboard
            weddingData={weddingData}
            activeTemplate={activeTemplate}
            updateWeddingData={updateWeddingData}
            deleteRSVP={deleteRSVP}
            setCurrentView={setCurrentView}
            onOpenCheckout={openCheckout}
            publish={publish}
            syncError={syncError}
          />
        )}
        {currentView === 'admin' && <AdminDashboard />}
        {currentView === 'legal' && <LegalPage />}
        {currentView === 'account' && <AccountPage weddingData={weddingData} openWedding={openWedding} setCurrentView={setCurrentView} />}
      </main>

      {/* Footer (On Landing and Catalog) */}
      {(currentView === 'landing' || currentView === 'catalog' || currentView === 'legal') && (
        <Footer setCurrentView={setCurrentView} />
      )}

      {/* Checkout & Upgrade Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        defaultPlan={checkoutDefaultPlan}
        ensurePublished={() => (weddingData.editKey ? Promise.resolve(weddingData) : publish())}
        onSuccess={(plan, invoiceId, amountPaidInr) => {
          updateWeddingData({
            // Never downgrade a Royal couple who also bought Classic (the server applies the same rule).
            plan: weddingData.plan === 'royal_suite' ? 'royal_suite' : plan,
            invoiceId,
            amountPaidInr,
            paidAt: new Date().toISOString(),
          });
          // The modal stays open on its receipt; its "Continue" button closes it.
        }}
        coupleNames={`${weddingData.partner1.name} & ${weddingData.partner2.name}`}
      />
    </div>
  );
}
