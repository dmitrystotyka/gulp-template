import { existsSync, readFileSync } from 'node:fs';
import fileInclude from 'gulp-file-include';
import { compile } from 'sass-embedded';
import {
  sizeReporter,
  handleError,
  htmlPrettify,
  htmlMinify,
  replaceContents,
  pageMeta,
  inlineSprite,
  stripSourceComments,
  reportFailure,
} from '../utils/index.js';

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

// The sprite task runs before html (gulpfile), so the compiled sprite is
// already in dist/ — read it once per run and inline it into pages.
const readSprite = () => {
  const { paths, config } = app;
  const file = `${paths.buildAssets}/${paths.srcSprites.split('/').pop()}/${config.sprites.fileName}`;

  return config.sprites.enabled && existsSync(file) ? readFileSync(file, 'utf8') : '';
};

const htmlStream = ({ all = false } = {}) => {
  const { gulp, paths, plugins, config } = app;

  const criticalCss = config.optimization.criticalCSS;

  let stream = gulp.src(paths.globs.htmlPages, { since: all ? undefined : gulp.lastRun(html) }).pipe(
    fileInclude({
      prefix: '@@',
      basepath: paths.srcHtml,
      context: {
        tailwind: config.tailwind.active,
        criticalCss,
        lang: config.site.lang,
        siteUrl: config.site.url,
        // Site root path ("/" or "/sub/") — 404.html sets <base> to it, see pages/404.html
        basePath: new URL(config.site.url).pathname.replace(/\/?$/, '/'),
      },
    }).on('error', handleError('HTML'))
  );

  stream = stream.pipe(stripSourceComments());

  if (criticalCss) {
    stream = stream.pipe(replaceContents(CRITICAL_PLACEHOLDER, compileCriticalCss()));
  }

  stream = stream.pipe(inlineSprite(readSprite())).pipe(pageMeta(config.site.url));

  // Minified for production, prettified (readable, hand-editable) otherwise
  stream = stream.pipe(config.optimization.minify.html ? htmlMinify() : htmlPrettify());

  return stream.pipe(sizeReporter('HTML')).pipe(gulp.dest(paths.build)).pipe(plugins.browserSync.stream());
};

// Incremental: only pages changed since the last run
export const html = () => htmlStream();

// Full rebuild: used when layouts/components change (they affect every page)
export const htmlAll = () => htmlStream({ all: true });
