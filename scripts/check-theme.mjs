#!/usr/bin/env node
/**
 * Smoke test for wp-theme/ (pnpm theme) — what check-dist is for dist/.
 * Fails (exit 1) with the list of broken expectations. No PHP needed:
 * syntax is linted with `php -l` in CI.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const THEME = join(process.cwd(), 'wp-theme');
const failures = [];
const ok = [];
const assert = (condition, message) => (condition ? ok : failures).push(message);

if (!existsSync(THEME)) {
  console.error('✗ wp-theme/ not found — run: pnpm theme');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  );
const files = walk(THEME).map((f) => f.slice(THEME.length + 1).replaceAll(sep, '/'));
const read = (rel) => readFileSync(join(THEME, rel), 'utf8');
const php = files.filter((f) => f.endsWith('.php'));

// ---------- structure ---------------------------------------------------------

for (const required of [
  'style.css',
  'functions.php',
  'index.php',
  'header.php',
  'footer.php',
  'front-page.php',
  '404.php',
  'inc/assets.php',
]) {
  assert(files.includes(required), `${required} present`);
}
assert(/Theme Name:\s*\S/.test(read('style.css')), 'style.css: Theme Name header');
assert(!files.some((f) => f.endsWith('.html')), 'no .html pages left in the theme');

// ---------- assets ------------------------------------------------------------

const assets = read('inc/assets.php');
const listed = [...assets.matchAll(/=>\s*'([^']+\.(?:css|js))'/g)].map(([, file]) => file);
assert(listed.length > 0, 'inc/assets.php lists styles and scripts');
for (const file of listed) assert(files.includes(file), `enqueued file exists: ${file}`);

if (files.some((f) => f.startsWith('assets/sprites/'))) {
  assert(files.includes('inc/sprite.svg'), 'inc/sprite.svg (inline sprite) present');
  assert(!read('inc/sprite.svg').includes('<?xml'), 'inc/sprite.svg: no XML prolog (inlined into <body>)');
}

// ---------- templates ---------------------------------------------------------

const header = read('header.php');
assert(header.includes('wp_head()'), 'header.php calls wp_head()');
assert(header.includes('body_class()'), 'header.php: <body <?php body_class(); ?>>');
assert(header.includes('wp_body_open()'), 'header.php calls wp_body_open()');
assert(header.includes('language_attributes()'), 'header.php: <html <?php language_attributes(); ?>>');
assert(!/<title>/.test(header), 'header.php: no <title> (title-tag support)');
assert(read('footer.php').includes('wp_footer()'), 'footer.php calls wp_footer()');

for (const file of php) {
  const content = read(file);
  assert(!content.includes('@@'), `${file}: no @@include leftovers`);
  assert(!/__PAGE_URL__|\/\* __/.test(content), `${file}: no build placeholders`);
  assert(!/(?:href|src|srcset|poster)="\.\//.test(content), `${file}: no relative ./ URLs (theme URIs only)`);
  assert(!/url\(\s*['"]?\.\//.test(content), `${file}: no relative url(./…)`);
  assert(!/(?:href|src)="[^"<]*\.html["#]/.test(content), `${file}: no links to .html pages`);
  assert(!/<script\b[^>]*\bsrc=/.test(content), `${file}: scripts are enqueued, not hardcoded`);
  // Every opened <?php block is closed (or the file ends in PHP mode)
  const opens = (content.match(/<\?php/g) || []).length;
  const closes = (content.match(/\?>/g) || []).length;
  assert(opens === closes || opens === closes + 1, `${file}: balanced <?php … ?>`);
}

// ---------- report ------------------------------------------------------------

const total = ok.length + failures.length;
if (failures.length) {
  console.error(`\n✗ check-theme: ${failures.length}/${total} checks failed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ check-theme: ${total} checks passed — ${php.length} PHP templates, ${files.length} files`);
