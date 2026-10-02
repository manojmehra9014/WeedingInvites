// Run: npx tsx src/data/templatesCatalog.check.ts
// Guards the catalog against duplicates, contradictions and unreadable palettes.
import assert from 'node:assert/strict';
import { register } from 'node:module';

// Vite turns image imports into URLs; plain Node can't, so stub them.
register(
  'data:text/javascript,' +
    encodeURIComponent(
      `export async function load(u, c, next) {
        if (/\\.(jpe?g|png|webp)$/.test(u)) return { format: 'module', source: 'export default ' + JSON.stringify(u), shortCircuit: true };
        return next(u, c);
      }`,
    ),
);

const { generateCatalog, designSignature } = await import('./templatesCatalog');
const { isDarkColor } = await import('../utils/design');
const all = generateCatalog();

const dupes = (key: (t: (typeof all)[number]) => string) => {
  const seen = new Map<string, string>();
  const out: string[] = [];
  for (const t of all) {
    const k = key(t);
    if (seen.has(k)) out.push(`${seen.get(k)} = ${t.id}`);
    else seen.set(k, t.id);
  }
  return out;
};

assert.ok(all.length >= 1900, `catalog has ${all.length} templates; marketing copy promises 1,900+`);
assert.deepEqual(dupes((t) => t.id), [], 'duplicate ids');
assert.deepEqual(dupes((t) => t.slug), [], 'duplicate slugs');
assert.deepEqual(dupes((t) => t.name), [], 'duplicate names');
assert.deepEqual(dupes(designSignature), [], 'visually identical templates');
assert.deepEqual(dupes((t) => t.tagline), [], 'duplicate taglines');
// Names fall back to "Place Suffix · Palette" only when a culture outgrows its name grid.
assert.deepEqual(all.filter((t) => /^tpl-g\d+$/.test(t.id) && t.name.includes(' · ')).map((t) => t.name), [], 'name grid exhausted');

const RITES = { nikah: 'muslim', anand_karaj: 'punjabi', church_wedding: 'christian' } as const;
for (const t of all) {
  for (const [occasion, culture] of Object.entries(RITES))
    assert.ok(!t.occasions.includes(occasion as never) || t.culture === culture, `${t.id}: ${occasion} template tagged ${t.culture}`);
  if (t.style === 'dark_luxury') assert.ok(isDarkColor(t.theme.background), `${t.id}: dark_luxury on a light background`);
}

// WCAG contrast: body text ≥ 4.5, headings (primary, or secondary on dark themes) ≥ 3.
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
for (const t of all) {
  const { text, background, primary, secondary } = t.theme;
  assert.ok(contrast(text, background) >= 4.5, `${t.id}: body text contrast ${contrast(text, background).toFixed(2)}`);
  const heading = isDarkColor(background) ? secondary : primary;
  assert.ok(contrast(heading, background) >= 3, `${t.id}: heading contrast ${contrast(heading, background).toFixed(2)}`);
}

// Every filter the catalog offers must return something.
const QUICK_PILLS = [
  { culture: 'royal_fusion', style: 'royal' },
  { occasion: 'nikah', culture: 'muslim' },
  { culture: 'hindu', style: 'traditional' },
  { culture: 'south_indian' },
  { occasion: 'anand_karaj', culture: 'punjabi' },
  { style: 'pastel' },
  { culture: 'modern_minimal', style: 'minimal' },
  { occasion: 'haldi' },
];
for (const p of QUICK_PILLS) {
  const hits = all.filter(
    (t) =>
      (!p.culture || t.culture === p.culture) &&
      (!p.style || t.style === p.style) &&
      (!('occasion' in p) || t.occasions.includes(p.occasion as never)),
  );
  assert.ok(hits.length > 0, `quick filter ${JSON.stringify(p)} is empty`);
}

// The first screenful should not show the same palette or layout+font twice in a row.
const generated = all.filter((t) => /^tpl-g\d+$/.test(t.id));
const firstGenerated = generated.slice(0, 64);
for (let i = 1; i < firstGenerated.length; i++) {
  const [a, b] = [firstGenerated[i - 1], firstGenerated[i]];
  assert.ok(a.theme.primary !== b.theme.primary || a.layout !== b.layout, `${a.id} and ${b.id} sit side by side and look alike`);
}

const byLayout: Record<string, number> = {};
for (const t of all) byLayout[t.layout] = (byLayout[t.layout] ?? 0) + 1;
console.log(`catalog ok: ${all.length} unique templates ·`, JSON.stringify(byLayout));
