/**
 * Gulpfile
 */

import gulp from 'gulp';

// Environment (must be first — loads .env before config evaluation)
import './gulp/configs/env.js';

// Configuration
import { paths } from './gulp/configs/paths.js';
import { plugins } from './gulp/configs/plugins.js';
import { config } from './gulp/configs/config.js';

// Global app object. `build.errors` is incremented by every recorded task
// failure (handleError / reportFailure); one-shot builds fail on it.
globalThis.app = { gulp, paths, plugins, config, build: { errors: 0 } };

// Tasks
import { clean } from './gulp/tasks/clean.js';
import { html, htmlAll } from './gulp/tasks/html.js';
import { styles } from './gulp/tasks/styles.js';
import { scripts } from './gulp/tasks/scripts.js';
import { images, imagesWebp, imagesAvif } from './gulp/tasks/images.js';
import { assets } from './gulp/tasks/assets.js';
import { vendors } from './gulp/tasks/vendors.js';
import { server } from './gulp/tasks/server.js';
import { sprite } from './gulp/tasks/sprite.js';
import { tailwind } from './gulp/tasks/tailwind.js';
import { tailwindKit } from './gulp/tasks/tailwindKit.js';
import { sitemap, robots } from './gulp/tasks/optimize.js';
import { logBuildStart, logBuildEnd } from './gulp/utils/index.js';
import { createUnlinkHandler } from './gulp/utils/watcher.js';

// ─────────────────────────────────────────────────────────────
// Watch
// ─────────────────────────────────────────────────────────────

const { globs } = paths;

const watch = () => {
  // When Tailwind is active, class changes in HTML/JS must retrigger the scan
  const withTailwind = (task) => (config.tailwind.active ? gulp.series(task, tailwind) : task);

  gulp.watch(globs.htmlPages, withTailwind(html)).on('unlink', createUnlinkHandler(paths.srcHtmlPages, paths.build));
  gulp.watch(globs.htmlShared, withTailwind(htmlAll));
  gulp
    .watch(globs.stylesWatch, styles)
    .on('unlink', createUnlinkHandler(paths.srcStyles, paths.buildStyles, { '.scss': '.css' }));
  gulp
    .watch(globs.scripts, withTailwind(scripts))
    .on('unlink', createUnlinkHandler(paths.srcScripts, paths.buildScripts));
  gulp
    .watch(globs.images, gulp.series(images, imagesWebp, imagesAvif))
    .on('unlink', createUnlinkHandler(paths.srcImages, paths.buildImages, {}, ['.webp', '.avif']));
  gulp.watch(globs.sprites, sprite);
  gulp.watch(globs.assets, assets).on('unlink', createUnlinkHandler(paths.srcAssets, paths.buildAssets));

  if (config.tailwind.active) {
    gulp.watch(`${paths.srcStyles}/tailwind.css`, tailwind);
  }

  if (config.optimization.criticalCSS) {
    // critical.scss plus every partial it may @use (vars, mixins, …)
    gulp.watch([`${paths.srcStyles}/critical.scss`, `${paths.srcStyles}/**/_*.scss`], htmlAll);
  }
};

// ─────────────────────────────────────────────────────────────
// Task Groups
// ─────────────────────────────────────────────────────────────

const imagesTasks = gulp.series(images, imagesWebp, imagesAvif);
const mainTasks = gulp.parallel(html, styles, tailwind, scripts, imagesTasks, sprite, assets, vendors);
const seoTasks = gulp.series(sitemap, robots);

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

const fullBuild = gulp.series(logBuildStart, clean, mainTasks, gulp.parallel(seoTasks, tailwindKit), logBuildEnd);

gulp.task('dev', gulp.series(logBuildStart, clean, mainTasks, gulp.parallel(watch, server)));
gulp.task('build:dev', gulp.series(logBuildStart, clean, mainTasks, logBuildEnd));
// build:prod and build:handoff share the pipeline — the difference lives in
// project.config.js (minify/sortMediaQueries off for handoff via BUILD_TARGET).
gulp.task('build:prod', fullBuild);
gulp.task('build:handoff', fullBuild);
gulp.task('preview', server);

// Graceful shutdown — close BrowserSync and free port
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    plugins.browserSync.exit();
    // gulp-cli's exit listener flips the code to 1 because watch tasks never
    // "complete" — register later so we run after it and restore a clean exit
    process.on('exit', () => {
      process.exitCode = 0;
    });
    process.exit(0);
  });
});
