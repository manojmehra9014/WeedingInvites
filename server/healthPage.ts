import type { uptimeReport } from './uptime';

// The /api/health page a browser sees. Same data as the JSON (add ?format=json), refreshed every 30 s.

type Health = ReturnType<typeof uptimeReport> & {
  status: string;
  app: string;
  version: string | null;
  node: string;
  storage: string;
  payments: string;
  email: boolean;
  memoryMb: number;
  database?: { ok: boolean; ms: number; error?: string };
};

const esc = (v: unknown) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function duration(seconds: number | null) {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`].filter(Boolean).join(' ');
}

// Rendered in UTC; the inline script swaps in the viewer's local time.
const time = (iso: string | null | undefined) =>
  iso ? `<time datetime="${esc(iso)}">${esc(iso.replace('T', ' ').slice(0, 16))} UTC</time>` : '—';

const ENDED: Record<string, string> = { running: 'Still running', clean: 'Stopped cleanly (sleep / deploy)', crash: 'Crashed' };

export function healthPage(h: Health) {
  const ok = h.status === 'ok';
  const ping = h.keepAwake?.lastPing;
  const rows: [string, string][] = [
    ['Up since', time(h.startedAt)],
    ['Uptime', duration(h.uptimeSeconds)],
    ['Restarts recorded', String(h.restartsRecorded)],
    ['Downtime (recorded)', duration(h.totalDowntimeSeconds)],
    ['Database', h.database ? (h.database.ok ? `${esc(h.storage)} · OK · ${h.database.ms} ms` : `<b class="bad">${esc(h.storage)} · ${esc(h.database.error)}</b>`) : esc(h.storage)],
    [
      'Keep-awake',
      !h.keepAwake
        ? 'Off (no RENDER_EXTERNAL_URL / KEEP_AWAKE_URL)'
        : !ping
          ? `Every ${h.keepAwake.everyMinutes} min · first ping pending`
          : `Every ${h.keepAwake.everyMinutes} min · last ${time(ping.at)} · ${ping.ok ? `OK · ${ping.ms} ms` : `<b class="bad">${esc(ping.error)}</b>`}`,
    ],
    ['Payments', esc(h.payments)],
    ['Email', h.email ? 'On' : 'Off'],
    ['Version', `${esc(h.version ?? 'local')} · Node ${esc(h.node)} · ${h.memoryMb} MB`],
  ];
  const history = h.history
    .map(
      (r) => `<tr>
        <td>${time(r.start)}</td>
        <td>${r.end ? time(r.end) : '<span class="good">running</span>'}</td>
        <td>${duration(r.upSeconds)}</td>
        <td>${esc(ENDED[r.howItEnded] ?? r.howItEnded)}</td>
        <td class="${r.downtimeBeforeSeconds ? 'down' : ''}">${r.downtimeBeforeSeconds === null ? '—' : `${r.downtimeIsApproximate ? '≤ ' : ''}${duration(r.downtimeBeforeSeconds)}`}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="30"><meta name="robots" content="noindex">
<title>Server status</title>
<style>
  :root { --bg:#FAF8F5; --card:#fff; --ink:#191614; --muted:#6B655E; --line:#EFE8DC; --gold:#B38B45; --good:#2F7D4F; --bad:#B3261E; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg:#141210; --card:#1D1A17; --ink:#F3EEE6; --muted:#A79E93; --line:#2E2924; --gold:#D4AF6A; --good:#6FCF97; --bad:#FF8A80; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
  main { max-width:860px; margin:0 auto; padding:32px 16px 48px; }
  h1 { font:600 26px/1.2 Georgia,serif; margin:0 0 4px; }
  h2 { font-size:13px; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); margin:32px 0 10px; }
  .sub { color:var(--muted); margin:0 0 20px; font-size:13px; }
  .pill { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:999px; font-weight:600; font-size:14px; border:1px solid var(--line); background:var(--card); }
  .dot { width:9px; height:9px; border-radius:50%; background:${ok ? 'var(--good)' : 'var(--bad)'}; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
  dl { display:grid; grid-template-columns:minmax(0,160px) minmax(0,1fr); margin:0; }
  dt, dd { margin:0; padding:10px 16px; border-top:1px solid var(--line); overflow-wrap:anywhere; }
  dt { color:var(--muted); }
  dl > :nth-child(-n+2) { border-top:0; }
  .scroll { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:13px; white-space:nowrap; }
  th, td { text-align:left; padding:9px 14px; border-top:1px solid var(--line); }
  th { color:var(--muted); font-weight:500; border-top:0; }
  .good { color:var(--good); font-weight:600; } .bad { color:var(--bad); } .down { color:var(--bad); font-weight:600; }
  .note { color:var(--muted); font-size:12px; margin-top:10px; }
  a { color:var(--gold); }
</style></head>
<body><main>
  <h1>${esc(h.app)} · server status</h1>
  <p class="sub">Refreshes every 30 s · <a href="?format=json">raw JSON</a></p>
  <span class="pill"><span class="dot"></span>${ok ? 'All systems running' : 'Degraded: database unreachable'}</span>

  <h2>Now</h2>
  <div class="card"><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>

  <h2>Runs &amp; downtime</h2>
  <div class="card scroll"><table>
    <thead><tr><th>Started</th><th>Stopped</th><th>Up for</th><th>How it ended</th><th>Down before this start</th></tr></thead>
    <tbody>${history}</tbody>
  </table></div>
  <p class="note">Downtime is the gap between a run's last sign of life and the next start: sleeping, a deploy or a crash.
  "≤" means the server was killed without notice, so only its last hourly heartbeat is known.
  While the server is down this page can't load either: use an outside monitor (UptimeRobot) for alerts.</p>
</main>
<script>
  for (const t of document.querySelectorAll('time')) {
    const d = new Date(t.dateTime);
    if (!isNaN(d)) t.textContent = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
</script>
</body></html>`;
}
