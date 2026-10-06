import gulpSass from 'gulp-sass';
import * as sassEmbedded from 'sass-embedded';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import sortMediaQueries from 'postcss-sort-media-queries';
import { sizeReporter, handleError, cssMinify } from '../utils/index.js';

const sass = gulpSass(sassEmbedded);

export const styles = () => {
  const { gulp, paths, plugins, config } = app;

  // critical.scss never compiles to a standalone file —
  // when enabled it is inlined into <head> by the html task
  const src = [...paths.globs.styles, `!${paths.srcStyles}/critical.scss`];

  const postcssPlugins = [
    autoprefixer(),
    ...(config.optimization.sortMediaQueries ? [sortMediaQueries()] : []),
    ...(config.postcss?.plugins || []),
  ];

  let stream = gulp
    .src(src, { sourcemaps: config.sourceMaps })
    .pipe(
      sass({
        // Own `@warn`/`@debug` and Dart Sass deprecation notices stay visible
        // (they announce breaking changes); noise from node_modules is muted.
        quietDeps: true,
        loadPaths: [paths.src, 'node_modules'],
      }).on('error', handleError('Styles'))
    )
    .pipe(postcss(postcssPlugins).on('error', handleError('PostCSS')));

  if (config.optimization.minify.css) {
    stream = stream.pipe(cssMinify());
  }

  return stream
    .pipe(sizeReporter('CSS'))
    .pipe(gulp.dest(paths.buildStyles, { sourcemaps: config.sourceMaps ? '.' : false }))
    .pipe(plugins.browserSync.stream());
};
