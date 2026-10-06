import { sizeReporter, sharpOptimize, svgoOptimize, imageToFormat } from '../utils/index.js';

export const images = () => {
  const { gulp, paths, plugins, config } = app;

  let stream = gulp.src(paths.globs.images, { encoding: false, since: gulp.lastRun(images) });

  // Single pass: optimize on the way to dist (no re-reading dist afterwards)
  if (config.optimization.minify.images) {
    stream = stream.pipe(sharpOptimize()).pipe(svgoOptimize());
  }

  return stream
    .pipe(sizeReporter('Images', { showFiles: true }))
    .pipe(gulp.dest(paths.buildImages))
    .pipe(plugins.browserSync.stream());
};

export const imagesWebp = () => {
  const { gulp, paths, config } = app;

  if (!config.images.webp?.enabled) {
    return Promise.resolve();
  }

  return gulp
    .src(paths.globs.rasters, { encoding: false, since: gulp.lastRun(imagesWebp) })
    .pipe(imageToFormat('webp', { quality: config.images.webp.quality ?? 80 }))
    .pipe(sizeReporter('WebP', { showFiles: false }))
    .pipe(gulp.dest(paths.buildImages));
};

export const imagesAvif = () => {
  const { gulp, paths, config } = app;

  if (!config.images.avif?.enabled) {
    return Promise.resolve();
  }

  return gulp
    .src(paths.globs.rasters, { encoding: false, since: gulp.lastRun(imagesAvif) })
    .pipe(imageToFormat('avif', { quality: config.images.avif.quality ?? 60 }))
    .pipe(sizeReporter('AVIF', { showFiles: false }))
    .pipe(gulp.dest(paths.buildImages));
};
