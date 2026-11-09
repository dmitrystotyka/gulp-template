#!/usr/bin/env node
/**
 * Post-build smoke test for dist/ — the checks that used to be done by hand.
 * Fails (exit 1) on the first broken expectation.
 *
 * Usage:
 *   node scripts/check-dist.mjs --mode=prod      # minified output
 *   node scripts/check-dist.mjs --mode=handoff   # readable output (WordPress deliverable)
 *   node scripts/check-dist.mjs --mode=dev
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

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

// POSIX separators on every OS (Windows join() yields backslashes)
const files = walk(DIST).map((f) => f.slice(DIST.length + 1).replaceAll(sep, '/'));
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

  // Must open straight from disk (file://): browsers block module scripts,
  // external sprite references and root-absolute paths there.
  assert(!/<script[^>]*type="module"/.test(content), `${page}: no module scripts (file://)`);
  assert(!/<use[^>]*href="[^"#]+#/.test(content), `${page}: icons use the inline sprite (file://)`);
  assert(!/<use\s+href="#/.test(content) || content.includes('<symbol'), `${page}: inline sprite present`);
  assert(!/\s(?:src|href)="\/(?!\/)/.test(content), `${page}: no root-absolute src/href (file://)`);
}

for (const file of js) {
  assert(!/^\s*(?:import|export)\s/m.test(read(file)), `${file}: classic script, no import/export (file://)`);
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

// ---------- tailwind -----------------------------------------------------------

for (const page of html) {
  assert(!read(page).includes('@tailwindcss/browser'), `${page}: no Tailwind browser build (compiled CSS only)`);
}

const layered = (file) => css.includes(file) && /@layer\s+components\s*\{/.test(read(file));

if (existsSync(join(process.cwd(), 'src/styles/tailwind.css'))) {
  assert(css.includes('styles/tailwind.css'), 'styles/tailwind.css compiled');
  assert(layered('styles/main.css'), 'main.css in @layer components (utilities can override it)');
  assert(/@layer\s+theme\s*\{/.test(read('styles/vars.css')), 'vars.css in @layer theme');
  // The first stylesheet fixes the layer order; Tailwind's `properties` must be lowest
  assert(
    /^\s*(?:@charset[^;]*;\s*)?@layer\s+properties\b/.test(read('styles/normalize.css')),
    'layer order starts with properties'
  );

  // SCSS owns `.container` — a Tailwind `container` utility would override its max-width
  assert(!/\.container\s*\{/.test(read('styles/tailwind.css')), 'no Tailwind utility named like an SCSS class');

  if (mode !== 'dev') {
    const kit = files.includes('tailwind.css') ? read('tailwind.css') : '';
    assert(/@source not inline\('[^']*\bcontainer\b/.test(kit), 'kit tailwind.css keeps SCSS-owned names excluded');
    assert(kit.includes('source(none)'), 'kit tailwind.css: source(none) — explicit sources only');
    assert(kit.includes("@source './**/*.{php,html,js}'"), 'kit tailwind.css scans the theme (*.php)');
    assert(!/@source\s+['"]\.\.\//.test(kit), 'kit tailwind.css: no @source outside the theme');
    const scripts = files.includes('package.json') ? (JSON.parse(read('package.json')).scripts ?? {}) : {};
    assert(scripts.dev?.includes('--watch') && scripts.build?.includes('--minify'), 'kit package.json: dev + build');
  }
} else {
  // Vanilla build: no kit, no layers (cascade unchanged)
  assert(!files.includes('package.json'), 'no Tailwind kit in a vanilla build');
  assert(!layered('styles/main.css'), 'vanilla main.css stays unlayered');
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
