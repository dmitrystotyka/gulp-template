import fs from 'node:fs';
import postcss from 'gulp-postcss';
import { sizeReporter, handleError, cssMinify, streamToPromise, reportFailure } from '../utils/index.js';

/**
 * Extract the @theme block from src/styles/tailwind.css
 * (between the tw-theme:start / tw-theme:end markers).
 * Inlined into pages so design tokens reach the CDN dev mode.
 */
export const getTailwindTheme = () => {
  try {
    const css = fs.readFileSync(`${app.paths.srcStyles}/tailwind.css`, 'utf-8');
    const match = css.match(/\/\*\s*tw-theme:start\s*\*\/([\s\S]*?)\/\*\s*tw-theme:end\s*\*\//);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
};

/**
 * Compile src/styles/tailwind.css with Tailwind v4 (@tailwindcss/postcss).
 * No-ops when the feature is inactive (see config.tailwind in project.config.js).
 * The package is installed by `pnpm tailwind:setup`, hence the dynamic import.
 */
export const tailwind = async () => {
  const { gulp, paths, plugins, config } = app;

  if (!config.tailwind.active) return;

  let tailwindPostcss;
  try {
    ({ default: tailwindPostcss } = await import('@tailwindcss/postcss'));
  } catch {
    reportFailure('Tailwind', new Error('active but @tailwindcss/postcss is not installed — run: pnpm tailwind:setup'));
    return;
  }

  let stream = gulp
    .src(`${paths.srcStyles}/tailwind.css`, { sourcemaps: config.sourceMaps, allowEmpty: true })
    .pipe(postcss([tailwindPostcss()]).on('error', handleError('Tailwind')));

  if (config.optimization.minify.css) {
    stream = stream.pipe(cssMinify());
  }

  stream = stream
    .pipe(sizeReporter('Tailwind'))
    .pipe(gulp.dest(paths.buildStyles, { sourcemaps: config.sourceMaps ? '.' : false }))
    .pipe(plugins.browserSync.stream());

  await streamToPromise(stream);
};
