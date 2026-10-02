// Product funnel events. Anonymous: a random per-browser id and one short detail (template id, format,
// plan), never names, phones or emails. The server counts them for the owner dashboard (#/admin).
export const FUNNEL_EVENTS = [
  'template_viewed',
  'template_tried',
  'wedding_started',
  'wedding_completed',
  'wedding_published', // server-side
  'wedding_shared',
  'asset_previewed',
  'asset_generated',
  'asset_downloaded',
  'asset_shared',
  'rsvp_received', // server-side
  'checkout_started',
  'payment_completed', // server-side
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export const isFunnelEvent = (v: unknown): v is FunnelEvent => FUNNEL_EVENTS.includes(v as FunnelEvent);

let memorySid = '';
function sid() {
  const fresh = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  try {
    let s = localStorage.getItem('wv_sid');
    if (!s) localStorage.setItem('wv_sid', (s = fresh()));
    return s;
  } catch {
    return (memorySid ||= fresh()); // private mode: counted per tab
  }
}

/** Fire-and-forget; analytics never blocks or breaks the product. */
export function track(name: FunnelEvent, detail = '') {
  const body = JSON.stringify({ name, sid: sid(), detail });
  try {
    if (navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // fall through to fetch
  }
  fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}
