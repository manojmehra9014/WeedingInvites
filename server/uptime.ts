import type { Store } from './store';

// Uptime log behind /api/health. Each server start is a "run"; the gap between one run's last sign of life
// and the next run's start is downtime (sleeping on a free host, a crash, a deploy).
// A clean stop (SIGTERM: Render spin-down or redeploy) is exact. After a hard kill we only know the last
// heartbeat, so that downtime is marked approximate. Heartbeats are hourly so they don't keep a free
// serverless database (Neon) awake all day.

interface Run {
  start: string;
  lastSeen: string;
  stop?: 'clean' | 'crash';
}

export interface Ping {
  at: string;
  ok: boolean;
  ms: number;
  error?: string;
}

const KEY = 'uptime';
const KEEP = 30;
const HEARTBEAT_MS = 60 * 60_000;
const PING_MS = 4 * 60_000;

const startedAt = new Date();
let runs: Run[] = [];
let run: Run = { start: startedAt.toISOString(), lastSeen: startedAt.toISOString() };
let store: Store | null = null;
let keepAwakeUrl: string | null = null;
let lastPing: Ping | null = null;

const save = () => store?.setMeta(KEY, runs).catch((err) => console.warn(`[uptime] could not save: ${err.message}`));
const touch = () => (run.lastSeen = new Date().toISOString());

export async function startUptime(s: Store) {
  store = s;
  const old = await s.getMeta<Run[]>(KEY).catch(() => null);
  runs = [run, ...(Array.isArray(old) ? old : [])].slice(0, KEEP);
  await save();
  setInterval(() => (touch(), save()), HEARTBEAT_MS).unref();

  const stop = (how: Run['stop'], code: number) => async () => {
    touch();
    run.stop = how;
    await Promise.race([save(), new Promise((r) => setTimeout(r, 3000))]);
    process.exit(code);
  };
  process.once('SIGTERM', stop('clean', 0));
  process.once('SIGINT', stop('clean', 0));
  process.once('uncaughtException', (err) => (console.error(err), stop('crash', 1)()));
}

// Free hosts (Render) put the service to sleep after a few idle minutes, and the next guest then waits
// up to a minute. Pinging our own public URL goes through the host's proxy, so it counts as traffic.
// Render sets RENDER_EXTERNAL_URL; elsewhere set KEEP_AWAKE_URL. KEEP_AWAKE=0 turns it off.
export function keepAwake() {
  const base = process.env.KEEP_AWAKE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.KEEP_AWAKE === '0') return;
  keepAwakeUrl = `${base.replace(/\/+$/, '')}/api/health`;
  const ping = async () => {
    const t = Date.now();
    try {
      const res = await fetch(keepAwakeUrl!, { signal: AbortSignal.timeout(10_000) });
      lastPing = { at: new Date().toISOString(), ok: res.ok, ms: Date.now() - t, ...(res.ok ? {} : { error: `HTTP ${res.status}` }) };
    } catch (err) {
      lastPing = { at: new Date().toISOString(), ok: false, ms: Date.now() - t, error: (err as Error).message };
      console.warn(`keep-awake ping failed: ${lastPing.error}`);
    }
  };
  setInterval(ping, PING_MS).unref();
  console.log(`keep-awake: pinging ${keepAwakeUrl} every ${PING_MS / 60_000} min`);
}

export function uptimeReport() {
  const now = new Date();
  touch();
  const history = runs.map((r, i) => {
    const prev = runs[i + 1];
    const down = prev ? Math.max(0, Date.parse(r.start) - Date.parse(prev.lastSeen)) / 1000 : null;
    return {
      start: r.start,
      end: r === run ? null : r.lastSeen,
      upSeconds: Math.round((Date.parse(r.lastSeen) - Date.parse(r.start)) / 1000),
      howItEnded: r === run ? 'running' : (r.stop ?? 'unknown (killed, slept or crashed)'),
      downtimeBeforeSeconds: down === null ? null : Math.round(down),
      downtimeIsApproximate: !!prev && prev.stop !== 'clean',
    };
  });
  const downs = history.flatMap((h) => (h.downtimeBeforeSeconds === null ? [] : [h.downtimeBeforeSeconds]));
  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round((now.getTime() - startedAt.getTime()) / 1000),
    restartsRecorded: history.length - 1,
    totalDowntimeSeconds: downs.reduce((a, n) => a + n, 0),
    keepAwake: keepAwakeUrl ? { url: keepAwakeUrl, everyMinutes: PING_MS / 60_000, lastPing } : null,
    history,
  };
}
