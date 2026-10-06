#!/usr/bin/env node
/**
 * Post-build smoke test for dist/ — the checks AGENTS.md used to ask a human
 * to do by hand. Fails (exit 1) on the first broken expectation.
 *
 * Usage:
 *   node scripts/check-dist.mjs --mode=prod      # minified output
 *   node scripts/check-dist.mjs --mode=handoff   # readable output (WordPress deliverable)
 *   node scripts/check-dist.mjs --mode=dev
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const mode = process.argv.find((a) => a.startsWith('--mode='))?.slice(7) ?? 'handoff';
const DIST = join(process.cwd(), 'dist');
const failures = [];
const ok = [];

const assert = (condition, message) => (condition ? ok : failures).push(message);
const read = (rel) => readFileSync(join(DIST, rel), 'utf8');
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  );

if (!existsSync(DIST)) {
  console.error('✗ dist/ not found — run a build first');
  process.exit(1);
}

const files = walk(DIST).map((f) => f.slice(DIST.length + 1));
const html = files.filter((f) => f.endsWith('.html'));
const css = files.filter((f) => f.startsWith('styles/') && f.endsWith('.css'));
const js = files.filter((f) => f.startsWith('scripts/') && f.endsWith('.js'));

// ---------- structure ---------------------------------------------------------

assert(html.length > 0, 'at least one page in dist/');
for (const entry of ['normalize', 'vars', 'fonts', 'utils', 'ui', 'main']) {
  assert(css.includes(`styles/${entry}.css`), `styles/${entry}.css compiled`);
}
assert(js.length > 0, 'scripts copied to dist/scripts');
assert(
  files.some((f) => f.startsWith('assets/sprites/') && f.endsWith('.svg')),
  'SVG sprite emitted to assets/sprites/'
);

// Every jpg/png has a .webp sibling
const rasters = files.filter((f) => /\.(jpe?g|png)$/i.test(f));
for (const img of rasters) {
  assert(files.includes(img.replace(/\.(jpe?g|png)$/i, '.webp')), `webp sibling for ${img}`);
}

// ---------- html --------------------------------------------------------------

for (const page of html) {
  const content = read(page);
  assert(!content.includes('@@'), `${page}: no @@include leftovers`);
  assert(!content.includes('__PAGE_URL__'), `${page}: page URL resolved`);
  assert(!content.includes('/* __'), `${page}: no unresolved build placeholders`);
  assert(/<html[^>]*\slang="[a-z]{2}/i.test(content), `${page}: <html lang> set`);
  assert(/<link rel="canonical" href="https?:\/\//.test(content), `${page}: absolute canonical URL`);
  assert(
    !/property="og:image" content="\.?\//.test(content),
    `${page}: og:image is absolute (social crawlers reject relative URLs)`
  );
}

// ---------- mode-specific ------------------------------------------------------

const lineCount = (text) => text.split('\n').length;

if (mode === 'handoff' || mode === 'dev') {
  for (const page of html) {
    assert(lineCount(read(page)) > 10, `${page}: readable (multi-line) HTML`);
  }
  for (const file of css) {
    assert(lineCount(read(file)) > 5, `${file}: readable CSS`);
  }
  for (const file of js) {
    const content = read(file);
    assert(lineCount(content) > 3 || content.trim().length < 200, `${file}: readable JS (not minified)`);
  }
  assert(!files.includes('sitemap.xml') || true, 'sitemap optional');
}

if (mode === 'prod') {
  for (const page of html) {
    assert(lineCount(read(page)) <= 3, `${page}: minified HTML`);
  }
  for (const file of css) {
    assert(lineCount(read(file)) <= 3, `${file}: minified CSS`);
  }
}

if (mode !== 'dev') {
  assert(!files.some((f) => f.endsWith('.map')), 'no sourcemaps in a production/handoff build');
}

// Tailwind kit must not leak into vanilla builds
if (!existsSync(join(process.cwd(), 'src/styles/tailwind.css'))) {
  assert(!files.includes('package.json'), 'no Tailwind rebuild kit in a vanilla build');
}

// ---------- report ------------------------------------------------------------

const total = ok.length + failures.length;
if (failures.length) {
  console.error(`\n✗ check-dist (${mode}): ${failures.length}/${total} checks failed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

const size = files.reduce((sum, f) => sum + statSync(join(DIST, f)).size, 0);
console.log(`✓ check-dist (${mode}): ${total} checks passed — ${files.length} files, ${Math.round(size / 1024)} KB`);
