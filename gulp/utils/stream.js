import { PassThrough } from 'node:stream';
import { finished } from 'node:stream/promises';
import size from 'gulp-size';
import { reportFailure } from './logger.js';

export const sizeReporter = (title, options = {}) => {
  const { config } = app;

  if (!config.sizeReport.enabled) {
    return new PassThrough({ objectMode: true });
  }

  return size({
    title,
    showFiles: options.showFiles ?? true,
    showTotal: options.showTotal ?? true,
    gzip: options.gzip ?? config.sizeReport.gzip,
  });
};

/**
 * Error handler for failure-prone plugin streams (Sass, PostCSS, file-include).
 * Logs the error, rings the terminal bell, records the failure (one-shot
 * builds exit 1 in `logBuildEnd`) and ends the stream so `gulp watch`
 * survives instead of crashing.
 *
 * Usage: .pipe(somePlugin().on('error', handleError('Styles')))
 */
export const handleError = (title) =>
  function (error) {
    reportFailure(title, error);
    process.stdout.write('\x07');
    this.emit('end');
  };

/**
 * Await a gulp stream from an async task.
 * resume() switches the last stream into flowing mode (nothing consumes
 * its readable side — gulp normally does this via stream-exhaust).
 */
export const streamToPromise = (stream) => finished(stream.resume());
