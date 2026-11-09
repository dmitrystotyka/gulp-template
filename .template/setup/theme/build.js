/**
 * WordPress theme from the handoff build: dist/ → wp-theme/ (classic PHP theme).
 * Run: pnpm theme  (handoff build + check-dist + validate → this → check-theme → zip)
 *
 * HTML stays the source of truth: every run regenerates wp-theme/ from scratch.
 * Once a WP developer starts editing the PHP, the theme is theirs — stop regenerating.
 *
 * Every page is split at <main>: what comes before → header.php, after → footer.php,
 * <main> itself → front-page.php / 404.php / page-<name>.php. Assets are enqueued by
 * functions.php from inc/assets.php (the order of layouts/_head.html + _scripts.html).
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { resolvePath } from '../../paths.js';
import { projectConfig } from '../../../project.config.js';
import { themeSlug } from './slug.js';

const DIST = resolvePath('dist');
const OUT = resolvePath('wp-theme');

const fail = (message) => {
  console.error(`\n  ✗ theme: ${message}\n`);
  process.exit(1);
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) fail('dist/index.html not found — run: pnpm theme');

const pkg = JSON.parse(fs.readFileSync(resolvePath('package.json'), 'utf8'));
const slug = themeSlug(pkg.name);
const prefix = slug.replace(/-/g, '_').replace(/^(\d)/, '_$1');
const themeName = slug
  .split('-')
  .filter(Boolean)
  .map((word) => word[0].toUpperCase() + word.slice(1))
  .join(' ');

const read = (file) => fs.readFileSync(path.join(DIST, file), 'utf8');
const write = (file, content) => {
  fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
  fs.writeFileSync(path.join(OUT, file), content);
};
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

// ─────────────────────────────────────────────────────────────
// Assets — the build's own <link>/<script> order, one list for PHP
// ─────────────────────────────────────────────────────────────

// Comments first: disabled <script> lines in _scripts.html are commented out, not removed
const assetsOf = (source, html = source.replace(/<!--[\s\S]*?-->/g, '')) => ({
  styles: [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => attr(tag, 'rel') === 'stylesheet' && attr(tag, 'href')?.startsWith('./'))
    .map((tag) => attr(tag, 'href').slice(2)),
  scripts: [...html.matchAll(/<script\b[^>]*\bsrc="\.\/([^"]+)"[^>]*>/g)].map(([, src]) => src),
});

const pages = fs
  .readdirSync(DIST)
  .filter((file) => file.endsWith('.html'))
  .sort();
const assets = assetsOf(read('index.html'));

for (const page of pages) {
  if (JSON.stringify(assetsOf(read(page))) !== JSON.stringify(assets)) {
    fail(`${page} links other CSS/JS than index.html — the theme enqueues one list for every page`);
  }
}

// ─────────────────────────────────────────────────────────────
// HTML → PHP
// ─────────────────────────────────────────────────────────────

/** What WordPress or functions.php does instead: title/SEO meta, enqueued assets, sprite, 404 <base>. */
const strip = (html) =>
  html
    .replace(/<!--(?!\[)[\s\S]*?-->/g, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/<meta\b[^>]*\b(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*)"[^>]*>/g, '')
    .replace(/<link\b[^>]*>/g, (tag) =>
      attr(tag, 'rel') === 'canonical' || (attr(tag, 'rel') === 'stylesheet' && attr(tag, 'href')?.startsWith('./'))
        ? ''
        : tag
    )
    .replace(/<script\b[^>]*\bsrc="\.\/[^"]*"[^>]*>\s*<\/script>/g, '')
    .replace(/<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?createElement\(\s*['"]base['"]\s*\)[\s\S]*?<\/script>/g, '')
    .replace(/<svg\b[^>]*>(?:(?!<\/svg>)[\s\S])*?<symbol[\s\S]*?<\/svg>/, '');

const php = (code) => `<?php ${code} ?>`;
const themeUri = (file) => php(`echo esc_url( get_theme_file_uri( '${file}' ) );`);
const pageUri = (file) => {
  const name = file.replace(/\.html$/, '');
  return php(`echo esc_url( home_url( '/${name === 'index' ? '' : `${name}/`}' ) );`);
};
const rewriteUrl = (url) => {
  const [file, hash] = url.split('#');
  return (file.endsWith('.html') ? pageUri(file) : themeUri(file)) + (hash ? `#${hash}` : '');
};

/** ./assets/x → get_theme_file_uri(), ./about.html → home_url('/about/'). */
const rewrite = (html) =>
  html.replace(/\b(href|src|srcset|poster|data-src)="([^"]*)"/g, (match, name, value) => {
    if (name === 'srcset') {
      return `${name}="${value
        .split(',')
        .map((part) => part.trim().replace(/^\.\/(\S+)/, (m, url) => rewriteUrl(url)))
        .join(', ')}"`;
    }
    return value.startsWith('./') ? `${name}="${rewriteUrl(value.slice(2))}"` : match;
  });

const tidy = (text) =>
  text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*\n/, '') // leading blank lines only — keep the first line's indent
    .trimEnd();

const dedent = (text) => {
  const lines = text.split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
};

const hasSprite = fs.existsSync(path.join(DIST, 'assets/sprites'));

// Shared chrome: no blank lines, so pages that differ only by removed tags compare equal
const compact = (text) => tidy(text).replace(/\n\s*\n/g, '\n');

const toHeader = (pre) =>
  compact(
    pre
      .replace(/<html\b[^>]*>/, `<html ${php('language_attributes();')}>`)
      .replace(/<meta charset="[^"]*"\s*\/?>/i, `<meta charset="${php("bloginfo( 'charset' );")}" />`)
      .replace(/<\/head>/, `  ${php('wp_head();')}\n  </head>`)
      .replace(
        /<body\b[^>]*>/,
        `<body ${php('body_class();')}>\n    ${php('wp_body_open();')}${hasSprite ? `\n    ${php(`${prefix}_sprite();`)}` : ''}`
      )
  );

const toFooter = (post) => compact(post.replace(/<\/body>/, `  ${php('wp_footer();')}\n  </body>`));

const templateName = (page) =>
  page === 'index.html'
    ? 'front-page.php'
    : page === '404.html'
      ? '404.php'
      : `page-${page.replace(/\.html$/, '')}.php`;

const parts = pages.map((page) => {
  const html = rewrite(strip(read(page)));
  const start = html.search(/<main\b/);
  const end = html.lastIndexOf('</main>');
  if (start < 0 || end < 0) fail(`${page}: no <main> — pages are split at <main>…</main>`);
  return {
    page,
    pre: toHeader(html.slice(0, start)),
    // from the start of <main>'s line, so dedent sees its real indent
    main: dedent(html.slice(html.lastIndexOf('\n', start) + 1, end + '</main>'.length)),
    post: toFooter(html.slice(end + '</main>'.length)),
  };
});

// One header for all pages
const header = parts.find((p) => p.page === 'index.html').pre;
for (const p of parts) {
  if (p.pre !== header) fail(`${p.page}: markup before <main> differs from index.html — header.php is shared`);
}

// One footer; page-only markup after </main> (e.g. a modal) goes into that page's template
const lines = (text) => text.split('\n');
const base = parts.reduce((a, b) => (lines(b.post).length < lines(a.post).length ? b : a)).post;
const extraOf = (p) => {
  const a = lines(base);
  const b = lines(p.post);
  let head = 0;
  while (head < a.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  if (head + tail < a.length) fail(`${p.page}: markup after </main> doesn't contain the shared footer`);
  return b.slice(head, b.length - tail).join('\n');
};

// ─────────────────────────────────────────────────────────────
// Write the theme
// ─────────────────────────────────────────────────────────────

fs.rmSync(OUT, { recursive: true, force: true });

const generated = (source) =>
  `/**\n * Generated by \`pnpm theme\` from ${source} — edit the HTML and regenerate,\n * or take this file over (then stop regenerating).\n */`;

// Full header — every field Theme Check / the wordpress.org directory asks for
const theme = projectConfig.theme ?? {};
const headerFields = [
  ['Theme Name', themeName],
  ['Theme URI', theme.themeUri],
  ['Author', theme.author],
  ['Author URI', theme.authorUri],
  ['Description', pkg.description || `${themeName} — classic WordPress theme generated from static markup.`],
  ['Version', pkg.version],
  ['Requires at least', theme.requiresWp ?? '6.3'],
  ['Tested up to', theme.testedUpTo],
  ['Requires PHP', theme.requiresPhp ?? '7.4'],
  ['License', theme.license],
  ['License URI', theme.licenseUri],
  ['Text Domain', slug],
].filter(([, value]) => value);
const width = Math.max(...headerFields.map(([key]) => key.length)) + 2;

write(
  'style.css',
  `/*
${headerFields.map(([key, value]) => `${`${key}:`.padEnd(width)}${value}`).join('\n')}
*/

/* Styles live in styles/ and are enqueued by functions.php (inc/assets.php). */
`
);

write('header.php', `${header}\n`);
write('footer.php', `${dedent(base)}\n`);

for (const p of parts) {
  const extra = extraOf(p);
  const footer = extra
    ? `<?php\n// Page-only markup — printed before the footer scripts\nadd_action( 'wp_footer', function () { ?>\n${dedent(extra)}\n<?php }, 5 );\nget_footer();\n`
    : `<?php get_footer(); ?>\n`;
  write(
    templateName(p.page),
    `<?php\n${generated(`src/html/pages/${p.page}`)}\n\nget_header();\n?>\n${p.main}\n${footer}`
  );
}

const mainTag = parts.find((p) => p.page === 'index.html').main.match(/<main\b[^>]*>/)[0];
// Standard WordPress views — same <main> as the static pages, content from the editor
const view = (doc, body) => `<?php
/**
 * ${doc}
 */

get_header();
?>
${mainTag}
  <div class="container">
${body}
  </div>
</main>
<?php get_footer(); ?>
`;

write(
  'page.php',
  view(
    'Pages without their own page-<slug>.php: title + editor content.',
    `    <?php while ( have_posts() ) : the_post(); ?>
      <article <?php post_class(); ?>>
        <h1><?php the_title(); ?></h1>
        <?php the_content(); ?>
      </article>
    <?php endwhile; ?>`
  )
);

write(
  'single.php',
  view(
    'Single post: title, date, editor content, link back to the list.',
    `    <?php while ( have_posts() ) : the_post(); ?>
      <article <?php post_class(); ?>>
        <h1><?php the_title(); ?></h1>
        <p><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time></p>
        <?php the_content(); ?>
      </article>
      <?php the_post_navigation(); ?>
    <?php endwhile; ?>`
  )
);

write(
  'index.php',
  view(
    'Fallback for every other view (blog list, archives, search): post list with pagination.',
    `    <?php if ( have_posts() ) : ?>
      <?php while ( have_posts() ) : the_post(); ?>
        <article <?php post_class(); ?>>
          <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
          <?php the_excerpt(); ?>
        </article>
      <?php endwhile; ?>
      <?php the_posts_pagination(); ?>
    <?php else : ?>
      <p><?php esc_html_e( 'Nothing found.', '${slug}' ); ?></p>
    <?php endif; ?>`
  )
);

const handle = (file) =>
  `${slug}-${file
    .replace(/^(styles|scripts)\//, '')
    .replace(/\.(css|js)$/, '')
    .replace(/[/.]/g, '-')
    .toLowerCase()}`;
const phpList = (files) => files.map((file) => `\t\t'${handle(file)}' => '${file}',`).join('\n');
write(
  'inc/assets.php',
  `<?php
// Generated by \`pnpm theme\` from layouts/_head.html + layouts/_scripts.html — regenerate, don't edit.
// Order matters: functions.php enqueues each file after the previous one.

return array(
\t'styles'  => array(
${phpList(assets.styles)}
\t),
\t'scripts' => array(
${phpList(assets.scripts)}
\t),
);
`
);

write(
  'functions.php',
  `<?php
/**
 * ${themeName} — generated by \`pnpm theme\`.
 * CSS/JS: inc/assets.php, same order as the static build (each file depends on the previous one).
 */

defined( 'ABSPATH' ) || exit;

add_action(
\t'after_setup_theme',
\tfunction () {
\t\tadd_theme_support( 'title-tag' );
\t\tadd_theme_support( 'post-thumbnails' );
\t\tadd_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
\t}
);

add_action(
\t'wp_enqueue_scripts',
\tfunction () {
\t\t$assets = require get_theme_file_path( 'inc/assets.php' );

\t\t$deps = array();
\t\tforeach ( $assets['styles'] as $handle => $file ) {
\t\t\twp_enqueue_style( $handle, get_theme_file_uri( $file ), $deps, (string) filemtime( get_theme_file_path( $file ) ) );
\t\t\t$deps = array( $handle );
\t\t}

\t\t$deps = array();
\t\tforeach ( $assets['scripts'] as $handle => $file ) {
\t\t\twp_enqueue_script(
\t\t\t\t$handle,
\t\t\t\tget_theme_file_uri( $file ),
\t\t\t\t$deps,
\t\t\t\t(string) filemtime( get_theme_file_path( $file ) ),
\t\t\t\tarray(
\t\t\t\t\t'in_footer' => true,
\t\t\t\t\t'strategy'  => 'defer',
\t\t\t\t)
\t\t\t);
\t\t\t$deps = array( $handle );
\t\t}
\t}
);

/**
 * Inline SVG sprite, printed right after <body> (header.php) — icons use <use href="#name">.
 */
function ${prefix}_sprite() {
\t$file = get_theme_file_path( 'inc/sprite.svg' );
\tif ( is_readable( $file ) ) {
\t\treadfile( $file );
\t}
}

/**
 * Icon from the sprite, same markup as components/_icon.html:
 * <?php ${prefix}_icon( 'arrow-right' ); ?>
 */
function ${prefix}_icon( $name, $extra_class = '' ) {
\tprintf(
\t\t'<svg class="icon icon--%1$s%2$s" aria-hidden="true"><use href="#%1$s"></use></svg>',
\t\tesc_attr( $name ),
\t\t$extra_class ? ' ' . esc_attr( $extra_class ) : ''
\t);
}
`
);

// Static files + ready-to-inline sprite + Tailwind kit
for (const dir of ['styles', 'scripts', 'assets']) {
  if (fs.existsSync(path.join(DIST, dir))) fs.cpSync(path.join(DIST, dir), path.join(OUT, dir), { recursive: true });
}

if (hasSprite) {
  const file = fs.readdirSync(path.join(DIST, 'assets/sprites')).find((f) => f.endsWith('.svg'));
  const sprite = read(`assets/sprites/${file}`)
    .replace(/<\?xml[^>]*>\s*/, '')
    .replace(/<svg\b/, '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"');
  write('inc/sprite.svg', sprite);
}

for (const file of ['tailwind.css', 'package.json', 'TAILWIND.md', '.gitignore']) {
  if (fs.existsSync(path.join(DIST, file))) fs.copyFileSync(path.join(DIST, file), path.join(OUT, file));
}

// Theme screenshot (Appearance → Themes): 1200×900 from the social preview, when there is one
const preview = path.join(DIST, 'assets/img/previews/global.webp');
if (fs.existsSync(preview)) {
  await sharp(preview).resize(1200, 900, { fit: 'cover' }).png().toFile(path.join(OUT, 'screenshot.png'));
}

const templates = parts.map((p) => templateName(p.page)).join(', ');
console.log(`\n  ✓ wp-theme/ — "${themeName}" v${pkg.version}: ${templates}, page.php, single.php, index.php`);
console.log(`    ${assets.styles.length} styles + ${assets.scripts.length} scripts → inc/assets.php\n`);
