import fs from 'node:fs';
import path from 'node:path';
import postcss from 'gulp-postcss';
import {
  sizeReporter,
  handleError,
  cssMinify,
  streamToPromise,
  reportFailure,
  appendContents,
} from '../utils/index.js';

/**
 * Class names our SCSS defines (`.container`, `.btn`, `.is-active`…).
 * Tailwind must never generate a utility with the same name: `container` is
 * a Tailwind utility too, and in `@layer utilities` it would override our
 * `.container` (components layer) with its own breakpoint max-widths.
 * SCSS owns its names; Tailwind gets every other class.
 */
export const scssClassNames = () => {
  const dir = app.paths.srcStyles;
  const names = new Set();

  for (const file of fs.readdirSync(dir, { recursive: true })) {
    if (!file.endsWith('.scss')) continue;
    const scss = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    // `.name` not preceded by a word char (skips 0.5, file.css); `&__elem` suffixes aren't utilities anyway
    for (const [, name] of scss.matchAll(/(?<![\w-])\.(-?[a-zA-Z_][\w-]*)/g)) names.add(name);
  }

  return [...names].sort();
};

/** `@source not inline(…)` for the SCSS-owned names (empty string when none). */
export const scssOwnedRule = () => {
  const names = scssClassNames();
  return names.length
    ? `\n/* Generated: class names owned by SCSS — Tailwind never emits a utility with these names */\n@source not inline('${names.join(' ')}');\n`
    : '';
};

/**
 * Explicit sources only: the utilities import must carry `source(none)`.
 * Without it Tailwind also auto-scans the project root (README, CLAUDE.md,
 * .template/…) and ships classes no page uses.
 */
const hasExplicitSources = (css) =>
  /@import\s+['"]tailwindcss(?:\/utilities(?:\.css)?)?['"][^;]*source\(none\)/.test(css);

/**
 * Compile src/styles/tailwind.css with Tailwind v4 (@tailwindcss/postcss).
 * No-ops when the feature is inactive (see config.tailwind in project.config.js).
 * The package is installed by `pnpm tailwind:setup`, hence the dynamic import.
 */
export const tailwind = async () => {
  const { gulp, paths, plugins, config } = app;

  if (!config.tailwind.active) return;

  const entry = `${paths.srcStyles}/tailwind.css`;
  if (!hasExplicitSources(fs.readFileSync(entry, 'utf8'))) {
    reportFailure(
      'Tailwind',
      new Error(
        `${entry}: add source(none) to the utilities import — see .template/setup/tailwind/templates/tailwind.css`
      )
    );
    return;
  }

  let tailwindPostcss;
  try {
    ({ default: tailwindPostcss } = await import('@tailwindcss/postcss'));
  } catch {
    reportFailure('Tailwind', new Error('active but @tailwindcss/postcss is not installed — run: pnpm tailwind:setup'));
    return;
  }

  let stream = gulp
    .src(entry, { sourcemaps: config.sourceMaps })
    .pipe(appendContents(scssOwnedRule()))
    // optimize: lower nesting etc. for the browserslist targets, but never minify here —
    // its default (minify when NODE_ENV=production) would ignore MINIFY=false in handoff.
    // Minification is cssMinify's job below: one minify path.
    .pipe(postcss([tailwindPostcss({ optimize: { minify: false } })]).on('error', handleError('Tailwind')));

  if (config.optimization.minify.css) {
    stream = stream.pipe(cssMinify());
  }

  stream = stream
    .pipe(sizeReporter('Tailwind'))
    .pipe(gulp.dest(paths.buildStyles, { sourcemaps: config.sourceMaps ? '.' : false }))
    .pipe(plugins.browserSync.stream());

  await streamToPromise(stream);
};
