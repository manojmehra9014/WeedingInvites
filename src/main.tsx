import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {captureReferral, guestSlugFromPath} from './utils/api';
import './index.css';

// Guests arrive on /invite/<slug> and only download the invitation; everyone else gets the app (hash-routed).
const guestSlug = guestSlugFromPath();
captureReferral();
const Root = guestSlug
  ? lazy(() => import('./components/templates/GuestInvite').then((m) => ({default: () => <m.GuestInvite slug={guestSlug} />})))
  : lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </StrictMode>,
);
