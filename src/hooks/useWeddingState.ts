import { useState, useEffect, useRef } from 'react';
import { fetchOwnWedding, publishWedding } from '../utils/api';
import { WeddingData, GuestRSVP, CustomDesignSettings } from '../types/wedding';
import { EMPTY_WEDDING } from '../data/emptyWedding';
import { BASE_TEMPLATES, generateCatalog } from '../data/templatesCatalog';

const LOCAL_STORAGE_KEY = 'weddingverse_app_state_v1';

export type AppView = 
  | 'landing' 
  | 'catalog' 
  | 'onboarding' 
  | 'invite-preview' 
  | 'video-maker' 
  | 'dashboard'
  | 'admin'
  | 'legal'
  | 'account';

const VIEWS: AppView[] = ['landing', 'catalog', 'onboarding', 'invite-preview', 'video-maker', 'dashboard', 'admin', 'legal', 'account'];

function viewFromHash(): AppView {
  const view = window.location.hash.replace(/^#\/?/, '').split('/')[0] as AppView;
  return VIEWS.includes(view) ? view : 'landing';
}

export function useWeddingState() {
  const [weddingData, setWeddingData] = useState<WeddingData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const data: WeddingData = JSON.parse(saved);
        // Drafts from before the app started empty still hold the old demo couple: start those fresh.
        const demo = data.partner1?.name === 'Ananya Verma' && data.partner2?.name === 'Rahul Sharma' && !data.editKey;
        if (!demo) return { ...EMPTY_WEDDING, ...data };
      }
    } catch {
      // Fallback on storage errors
    }
    return EMPTY_WEDDING;
  });

  // The view lives in the URL hash (#/catalog) so Back/Forward, refresh and deep links work.
  const [currentView, setView] = useState<AppView>(viewFromHash);
  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const setCurrentView = (view: AppView) => {
    window.location.hash = view === 'landing' ? '/' : `/${view}`;
  };
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(weddingData.selectedTemplateId || 'tpl-royal-maroon');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [allTemplates] = useState(() => generateCatalog());

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(weddingData));
    } catch {
      // Ignore storage quota
    }
  }, [weddingData]);

  // Keep selected template id aligned
  useEffect(() => {
    if (weddingData.selectedTemplateId !== selectedTemplateId) {
      setSelectedTemplateId(weddingData.selectedTemplateId);
    }
  }, [weddingData.selectedTemplateId]);

  const updateWeddingData = (updates: Partial<WeddingData>) => {
    setWeddingData(prev => ({ ...prev, ...updates }));
  };

  // Publishing claims a guest link (/invite/<slug>) on the server; after that every edit goes live.
  const latest = useRef(weddingData);
  latest.current = weddingData;
  const publish = async (): Promise<WeddingData> => {
    const res: { slug: string; plan: WeddingData['plan']; editKey?: string } = await publishWedding(latest.current);
    const next: WeddingData = {
      ...latest.current,
      customSlug: res.slug,
      plan: res.plan,
      published: true,
      editKey: res.editKey ?? latest.current.editKey,
    };
    latest.current = next;
    setWeddingData(next);
    return next;
  };

  // After signing in on this device: load the wedding from the server, with the key issued for this device.
  const openWedding = async (slug: string, editKey: string) => {
    const own = await fetchOwnWedding(slug, editKey);
    const next: WeddingData = {
      ...EMPTY_WEDDING,
      ...own.data,
      customSlug: slug,
      editKey,
      plan: own.plan,
      published: true,
      paidAt: own.paidAt,
      amountPaidInr: own.amountInr,
    };
    latest.current = next;
    setWeddingData(next);
  };

  // Live updates: once published, changes reach guests about a second after the couple stops typing.
  const [syncError, setSyncError] = useState('');
  useEffect(() => {
    if (!weddingData.editKey) return;
    const t = setTimeout(() => {
      publishWedding(weddingData).then(() => setSyncError(''), (e: Error) => setSyncError(e.message));
    }, 1200);
    return () => clearTimeout(t);
  }, [weddingData]);

  // A new template starts from its own look: visual overrides from the previous one would
  // otherwise leak across (e.g. a layout override making every template look identical).
  const selectTemplate = (templateId: string, design?: CustomDesignSettings) => {
    setSelectedTemplateId(templateId);
    setWeddingData(prev => {
      if (prev.selectedTemplateId === templateId && !design) return prev;
      return {
        ...prev,
        selectedTemplateId: templateId,
        customDesign: {
          personalizedGuestName: prev.customDesign?.personalizedGuestName,
          showWaxSealEnvelope: prev.customDesign?.showWaxSealEnvelope,
          ...design,
        },
      };
    });
  };

  const submitRSVP = (rsvp: Omit<GuestRSVP, 'id' | 'submittedAt'>) => {
    const newRSVP: GuestRSVP = {
      ...rsvp,
      id: `rsvp-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    setWeddingData(prev => ({
      ...prev,
      rsvps: [newRSVP, ...prev.rsvps],
    }));
    return newRSVP;
  };

  const deleteRSVP = (id: string) => {
    setWeddingData(prev => ({
      ...prev,
      rsvps: prev.rsvps.filter(r => r.id !== id),
    }));
  };

  const activeTemplate = allTemplates.find(t => t.id === selectedTemplateId) || BASE_TEMPLATES[0];

  return {
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
  };
}
