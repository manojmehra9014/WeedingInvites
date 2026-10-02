import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PlanTier } from '../src/data/pricing';

/** A person on the couple's guest list. `token` makes their private, trackable link. */
export interface Guest {
  id: string;
  token: string;
  name: string;
  phone: string;
  email: string;
  invitedAt?: string;
  invitedVia?: 'whatsapp' | 'email' | 'link';
  remindedAt?: string;
  /** Seats reserved for this guest's party; caps their RSVP. Unset = they choose. */
  seats?: number;
  /** Event ids this guest is invited to. Unset = every event. */
  events?: string[];
  /** A line from the couple, shown under "Dear <name>,". */
  note?: string;
}

/** One published wedding. `data` is the couple's WeddingData (minus RSVPs and billing fields). */
export interface WeddingDoc {
  slug: string;
  editKeyHash: string;
  plan: PlanTier;
  paymentId?: string;
  amountInr?: number;
  paidAt?: string;
  /** Every Razorpay payment already applied, so a retried verify or a webhook never counts one twice. */
  paymentIds?: string[];
  /** Orders created but not yet confirmed paid: checked again later (a UPI QR paid after the tab closed). */
  pendingOrders?: string[];
  /** The couple's account: signing in with this email (one-time code) restores edit access on any device. */
  ownerEmail?: string;
  /** Edit keys issued at sign-in on other devices (hashes, newest last); the original stays in editKeyHash. */
  extraKeyHashes?: string[];
  data: Record<string, unknown>;
  rsvps: Record<string, unknown>[];
  guests: Guest[];
  /** First-open events from personal links: `{ token, at }`. */
  opens: { token: string; at: string }[];
  /** Slug of the couple whose invitation brought this couple here. */
  referredBy?: string;
  referrals?: number;
  paidReferrals?: number;
  /** Referral credit already used at checkout, in rupees. */
  creditSpentInr?: number;
  createdAt: string;
  updatedAt: string;
}

/** Light row for the owner dashboard: never includes photos, guest details or RSVP contents. */
export interface WeddingSummary {
  slug: string;
  names: string;
  weddingDate: string;
  plan: PlanTier;
  amountInr: number;
  paymentId?: string;
  paidAt?: string;
  createdAt: string;
  referredBy?: string;
  rsvps: number;
  guests: number;
  invited: number;
  opens: number;
}

export interface Store {
  get(slug: string): Promise<WeddingDoc | null>;
  /** Create a wedding. */
  put(doc: WeddingDoc): Promise<void>;
  /** Overwrite only these top-level fields, so a couple's edit never clobbers an RSVP that arrived meanwhile. */
  patch(slug: string, fields: Partial<Omit<WeddingDoc, 'slug' | 'rsvps' | 'opens'>>): Promise<void>;
  /** Atomic append, so two guests acting at once never overwrite each other. Newest first. */
  append(slug: string, field: 'rsvps' | 'opens', item: Record<string, unknown>): Promise<void>;
  deleteRsvp(slug: string, id: string): Promise<void>;
  summaries(): Promise<WeddingSummary[]>;
  /** Weddings whose account email is `email` (already lower-cased). */
  byOwner(email: string): Promise<WeddingDoc[]>;
  /** One funnel event: `sid` is an anonymous browser id or a wedding slug, `detail` a short label. */
  track(name: string, sid: string, detail: string): Promise<void>;
  /** Per event: distinct ids, total count, and the most common details. */
  eventCounts(): Promise<EventCount[]>;
  /** Small server-owned records (e.g. the uptime log), one JSON value per key. */
  getMeta<T>(key: string): Promise<T | null>;
  setMeta(key: string, value: unknown): Promise<void>;
}

export interface EventCount {
  name: string;
  people: number;
  total: number;
  top: { detail: string; n: number }[];
}

// Docs published before guest lists existed.
const withDefaults = (doc: WeddingDoc): WeddingDoc => ({ ...doc, guests: doc.guests ?? [], opens: doc.opens ?? [] });

function summarize(d: WeddingDoc): WeddingSummary {
  const p = (k: string) => ((d.data[k] as { name?: string } | undefined)?.name ?? '').split(' ')[0];
  return {
    slug: d.slug,
    names: `${p('partner1')} & ${p('partner2')}`,
    weddingDate: String(d.data.weddingDate ?? ''),
    plan: d.plan,
    amountInr: d.amountInr ?? 0,
    paymentId: d.paymentId,
    paidAt: d.paidAt,
    createdAt: d.createdAt,
    referredBy: d.referredBy,
    rsvps: d.rsvps.length,
    guests: d.guests.length,
    invited: d.guests.filter((g) => g.invitedAt).length,
    opens: d.opens.length,
  };
}

// ponytail: whole-file JSON store, fine for a single process and a few hundred weddings; set DATABASE_URL for anything shared.
function fileStore(dir: string): Store {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'weddings.json');
  let all: Record<string, WeddingDoc> = {};
  try {
    all = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    // First run: no file yet.
  }
  const save = () => {
    writeFileSync(`${file}.tmp`, JSON.stringify(all));
    renameSync(`${file}.tmp`, file); // a crash mid-write never leaves a half-written file
  };
  // ponytail: one counter per anonymous id kept forever; use DATABASE_URL (events table) beyond a hobby scale.
  const eventsFile = path.join(dir, 'events.json');
  let events: Record<string, { sids: Record<string, number>; details: Record<string, number> }> = {};
  try {
    events = JSON.parse(readFileSync(eventsFile, 'utf8'));
  } catch {
    // First run.
  }
  const saveEvents = () => {
    writeFileSync(`${eventsFile}.tmp`, JSON.stringify(events));
    renameSync(`${eventsFile}.tmp`, eventsFile);
  };
  const metaFile = path.join(dir, 'meta.json');
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  } catch {
    // First run.
  }
  return {
    async get(slug) {
      return all[slug] ? withDefaults(structuredClone(all[slug])) : null;
    },
    async put(doc) {
      all[doc.slug] = structuredClone(doc);
      save();
    },
    async patch(slug, fields) {
      if (all[slug]) Object.assign(all[slug], structuredClone(fields));
      save();
    },
    async append(slug, field, item) {
      const doc = all[slug];
      if (doc) (doc[field] as unknown[]) = [item, ...(doc[field] ?? [])];
      save();
    },
    async deleteRsvp(slug, id) {
      if (all[slug]) all[slug].rsvps = all[slug].rsvps.filter((r) => r.id !== id);
      save();
    },
    async summaries() {
      return Object.values(all).map((d) => summarize(withDefaults(d)));
    },
    async byOwner(email) {
      return Object.values(all).filter((d) => d.ownerEmail === email).map((d) => withDefaults(structuredClone(d)));
    },
    async track(name, sid, detail) {
      const e = (events[name] ??= { sids: {}, details: {} });
      e.sids[sid] = (e.sids[sid] ?? 0) + 1;
      if (detail) e.details[detail] = (e.details[detail] ?? 0) + 1;
      saveEvents();
    },
    async eventCounts() {
      return Object.entries(events).map(([name, e]) => ({
        name,
        people: Object.keys(e.sids).length,
        total: Object.values(e.sids).reduce((a, n) => a + n, 0),
        top: topDetails(Object.entries(e.details).map(([detail, n]) => ({ detail, n }))),
      }));
    },
    async getMeta<T>(key: string) {
      return (structuredClone(meta[key]) as T) ?? null;
    },
    async setMeta(key, value) {
      meta[key] = structuredClone(value);
      writeFileSync(`${metaFile}.tmp`, JSON.stringify(meta));
      renameSync(`${metaFile}.tmp`, metaFile);
    },
  };
}

const topDetails = (rows: { detail: string; n: number }[]) => rows.sort((a, b) => b.n - a.n).slice(0, 5);

async function postgresStore(url: string): Promise<Store> {
  const { default: pg } = await import('pg');
  // Hosted databases (Neon etc.) get verified TLS; plain connections only for localhost or an explicit sslmode=disable.
  const plain = /localhost|127\.0\.0\.1|sslmode=disable/.test(url);
  const pool = new pg.Pool({ connectionString: url, ssl: plain ? false : { rejectUnauthorized: true } });
  await pool.query('CREATE TABLE IF NOT EXISTS weddings (slug text PRIMARY KEY, doc jsonb NOT NULL)');
  await pool.query("CREATE TABLE IF NOT EXISTS events (name text NOT NULL, sid text NOT NULL, detail text NOT NULL DEFAULT '', at timestamptz NOT NULL DEFAULT now())");
  await pool.query('CREATE TABLE IF NOT EXISTS meta (key text PRIMARY KEY, value jsonb NOT NULL)');
  return {
    async get(slug) {
      const { rows } = await pool.query('SELECT doc FROM weddings WHERE slug = $1', [slug]);
      return rows[0] ? withDefaults(rows[0].doc) : null;
    },
    async put(doc) {
      await pool.query(
        'INSERT INTO weddings (slug, doc) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET doc = EXCLUDED.doc',
        [doc.slug, doc],
      );
    },
    async patch(slug, fields) {
      await pool.query('UPDATE weddings SET doc = doc || $2::jsonb WHERE slug = $1', [slug, JSON.stringify(fields)]);
    },
    async append(slug, field, item) {
      await pool.query(
        `UPDATE weddings SET doc = jsonb_set(doc, ARRAY[$3::text], $2::jsonb || COALESCE(doc->$3, '[]'::jsonb)) WHERE slug = $1`,
        [slug, JSON.stringify([item]), field],
      );
    },
    async deleteRsvp(slug, id) {
      await pool.query(
        `UPDATE weddings SET doc = jsonb_set(doc, '{rsvps}',
           COALESCE((SELECT jsonb_agg(r) FROM jsonb_array_elements(doc->'rsvps') r WHERE r->>'id' <> $2), '[]'::jsonb))
         WHERE slug = $1`,
        [slug, id],
      );
    },
    // ponytail: full table scan per dashboard load; add a summary table or materialized view past ~10k weddings.
    async summaries() {
      const { rows } = await pool.query(`
        SELECT slug,
          split_part(doc->'data'->'partner1'->>'name', ' ', 1) || ' & ' || split_part(doc->'data'->'partner2'->>'name', ' ', 1) AS names,
          COALESCE(doc->'data'->>'weddingDate', '') AS "weddingDate",
          doc->>'plan' AS plan,
          COALESCE((doc->>'amountInr')::numeric, 0)::float AS "amountInr",
          doc->>'paymentId' AS "paymentId", doc->>'paidAt' AS "paidAt", doc->>'createdAt' AS "createdAt",
          doc->>'referredBy' AS "referredBy",
          jsonb_array_length(COALESCE(doc->'rsvps', '[]')) AS rsvps,
          jsonb_array_length(COALESCE(doc->'guests', '[]')) AS guests,
          (SELECT count(*) FROM jsonb_array_elements(COALESCE(doc->'guests', '[]')) g WHERE g ? 'invitedAt')::int AS invited,
          jsonb_array_length(COALESCE(doc->'opens', '[]')) AS opens
        FROM weddings`);
      return rows.map((r) => ({ ...r, paymentId: r.paymentId ?? undefined, paidAt: r.paidAt ?? undefined, referredBy: r.referredBy ?? undefined }));
    },
    async byOwner(email) {
      const { rows } = await pool.query("SELECT doc FROM weddings WHERE doc->>'ownerEmail' = $1", [email]);
      return rows.map((r) => withDefaults(r.doc));
    },
    async track(name, sid, detail) {
      await pool.query('INSERT INTO events (name, sid, detail) VALUES ($1, $2, $3)', [name, sid, detail]);
    },
    async eventCounts() {
      const counts = await pool.query('SELECT name, count(DISTINCT sid)::int AS people, count(*)::int AS total FROM events GROUP BY name');
      const details = await pool.query("SELECT name, detail, count(*)::int AS n FROM events WHERE detail <> '' GROUP BY name, detail");
      return counts.rows.map((r) => ({ ...r, top: topDetails(details.rows.filter((d) => d.name === r.name).map(({ detail, n }) => ({ detail, n }))) }));
    },
    async getMeta<T>(key: string) {
      const { rows } = await pool.query('SELECT value FROM meta WHERE key = $1', [key]);
      return (rows[0]?.value as T) ?? null;
    },
    async setMeta(key, value) {
      await pool.query('INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, JSON.stringify(value)]);
    },
  };
}

export const openStore = (): Promise<Store> =>
  process.env.DATABASE_URL
    ? postgresStore(process.env.DATABASE_URL)
    : Promise.resolve(fileStore(process.env.DATA_DIR || path.resolve(import.meta.dirname, '../data')));
