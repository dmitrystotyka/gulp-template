import fileInclude from 'gulp-file-include';
import { compile } from 'sass-embedded';
import {
  sizeReporter,
  handleError,
  htmlPrettify,
  htmlMinify,
  replaceContents,
  pageMeta,
  reportFailure,
} from '../utils/index.js';
import { getTailwindTheme } from './tailwind.js';

// Placeholder inside layouts/_tailwind-cdn.html, replaced with the @theme block
// from src/styles/tailwind.css so design tokens reach the CDN dev mode.
const TW_THEME_PLACEHOLDER = '/* __TW_THEME__ */';

// Placeholder inside layouts/_head.html, replaced with compiled critical.scss
// when optimization.criticalCSS is enabled.
const CRITICAL_PLACEHOLDER = '/* __CRITICAL_CSS__ */';

const compileCriticalCss = () => {
  const { paths } = app;

  try {
    return compile(`${paths.srcStyles}/critical.scss`, {
      style: 'compressed',
      loadPaths: [paths.src, 'node_modules'],
    }).css;
  } catch (error) {
    reportFailure('Critical CSS', error);
    return '';
  }
};

const htmlStream = ({ all = false } = {}) => {
  const { gulp, paths, plugins, config } = app;

  const tailwindActive = config.tailwind.active;
  // The CDN dev-mode snippet is only for handoff/production builds —
  // local `pnpm dev` already rebuilds tailwind.css on the fly.
  const tailwindCdn = tailwindActive && config.env.isProd;
  const criticalCss = config.optimization.criticalCSS;

  let stream = gulp.src(paths.globs.htmlPages, { since: all ? undefined : gulp.lastRun(html) }).pipe(
    fileInclude({
      prefix: '@@',
      basepath: paths.srcHtml,
      context: {
        tailwind: tailwindActive,
        tailwindCdn,
        criticalCss,
        lang: config.site.lang,
        siteUrl: config.site.url,
      },
    }).on('error', handleError('HTML'))
  );

  if (criticalCss) {
    stream = stream.pipe(replaceContents(CRITICAL_PLACEHOLDER, compileCriticalCss()));
  }

  if (tailwindCdn) {
    stream = stream.pipe(replaceContents(TW_THEME_PLACEHOLDER, getTailwindTheme()));
  }

  stream = stream.pipe(pageMeta(config.site.url));

  // Minified for production, prettified (readable, hand-editable) otherwise
  stream = stream.pipe(config.optimization.minify.html ? htmlMinify() : htmlPrettify());

  return stream.pipe(sizeReporter('HTML')).pipe(gulp.dest(paths.build)).pipe(plugins.browserSync.stream());
};

// Incremental: only pages changed since the last run
export const html = () => htmlStream();

// Full rebuild: used when layouts/components change (they affect every page)
export const htmlAll = () => htmlStream({ all: true });
