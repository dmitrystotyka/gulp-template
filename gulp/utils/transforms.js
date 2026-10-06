/**
 * Content Transforms
 * Small object-mode Transform streams replacing single-purpose gulp plugins
 * (gulp-prettier, gulp-terser, gulp-csso, gulp-webp).
 * All of them catch their own errors so `gulp watch` survives; the failure
 * is recorded so one-shot builds still exit 1 (see logBuildEnd).
 */

import { Transform } from 'node:stream';
import path from 'node:path';
import { format, resolveConfig } from 'prettier';
import { minify as htmlMinifyRaw } from 'html-minifier-terser';
import { minify as terserMinify } from 'terser';
import { transform as lightningcss } from 'lightningcss';
import { optimize as svgoOptimizeRaw } from 'svgo';
import sharp from 'sharp';
import { reportFailure } from './logger.js';

const contentTransform = (name, handler) =>
  new Transform({
    objectMode: true,
    async transform(file, enc, callback) {
      if (file.isNull()) return callback(null, file);

      try {
        await handler(file);
        callback(null, file);
      } catch (error) {
        reportFailure(`${name} (${path.basename(file.path)})`, error);
        callback(null, file);
      }
    },
  });

// ─────────────────────────────────────────────────────────────
// HTML
// ─────────────────────────────────────────────────────────────

let prettierOptions;

// Formats with the project's own Prettier config (.prettierrc.json) so the
// built HTML looks exactly like hand-written source — no overrides that
// could add/remove whitespace between inline elements.
export const htmlPrettify = () =>
  contentTransform('HTML formatting', async (file) => {
    prettierOptions ??= (await resolveConfig(file.path)) || {};
    const formatted = await format(file.contents.toString(), {
      ...prettierOptions,
      parser: 'html',
    });
    file.contents = Buffer.from(formatted);
  });

// Conservative on purpose: nothing that changes the DOM a stylesheet or
// script could depend on (attribute order stays, `type="text"` stays).
export const htmlMinify = () =>
  contentTransform('HTML minification', async (file) => {
    const minified = await htmlMinifyRaw(file.contents.toString(), {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
    });
    file.contents = Buffer.from(minified);
  });

/**
 * Replace every occurrence of `search` (plain string, no regex) in file contents.
 */
export const replaceContents = (search, replacement) =>
  contentTransform('Content replace', (file) => {
    file.contents = Buffer.from(file.contents.toString().split(search).join(replacement));
  });

/**
 * Page-level SEO metadata that only the build knows:
 * - `__PAGE_URL__` → absolute URL of this page (canonical / og:url);
 * - relative `og:image` / `twitter:image` paths → absolute (social crawlers
 *   require absolute image URLs).
 */
export const pageMeta = (siteUrl) =>
  contentTransform('Page metadata', (file) => {
    const relative = file.relative.replace(/\\/g, '/');
    const route = relative === 'index.html' ? '' : relative.replace(/\.html$/, '');
    const pageUrl = `${siteUrl}/${route}`;

    const html = file.contents
      .toString()
      .split('__PAGE_URL__')
      .join(pageUrl)
      .replace(/(<meta\s+(?:property|name)="(?:og:image|twitter:image)"\s+content=")\.?\/(?!\/)/g, `$1${siteUrl}/`);

    file.contents = Buffer.from(html);
  });

// ─────────────────────────────────────────────────────────────
// JS / CSS
// ─────────────────────────────────────────────────────────────

// No `pure_funcs`/`drop_console`: minified code must behave exactly like the
// readable handoff build — stripping console calls is a product decision,
// not a build default.
export const jsMinify = () =>
  contentTransform('JS minification', async (file) => {
    const result = await terserMinify(
      { [file.relative]: file.contents.toString() },
      {
        module: true,
        format: { comments: false },
        compress: { drop_debugger: true },
        ...(file.sourceMap ? { sourceMap: { content: file.sourceMap, filename: file.relative } } : {}),
      }
    );
    file.contents = Buffer.from(result.code);
    if (result.map) file.sourceMap = JSON.parse(result.map);
  });

export const cssMinify = () =>
  contentTransform('CSS minification', (file) => {
    const result = lightningcss({
      filename: file.relative,
      code: file.contents,
      minify: true,
    });
    file.contents = Buffer.from(result.code);
  });

// ─────────────────────────────────────────────────────────────
// Images (sharp / svgo)
// ─────────────────────────────────────────────────────────────

const RASTER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

export const sharpOptimize = () =>
  contentTransform('Image optimization', async (file) => {
    const ext = path.extname(file.path).toLowerCase();
    if (!RASTER_EXTENSIONS.includes(ext)) return;

    const { config } = app;
    const originalSize = file.contents.length;
    let optimized;

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        optimized = await sharp(file.contents)
          .jpeg({
            quality: config.images.jpeg?.quality ?? 80,
            progressive: config.images.jpeg?.progressive ?? true,
          })
          .toBuffer();
        break;
      case '.png':
        optimized = await sharp(file.contents)
          .png({ compressionLevel: config.images.png?.compressionLevel ?? 9 })
          .toBuffer();
        break;
      case '.webp':
        optimized = await sharp(file.contents)
          .webp({ quality: config.images.webp?.quality ?? 80 })
          .toBuffer();
        break;
      case '.avif':
        optimized = await sharp(file.contents)
          .avif({ quality: config.images.avif?.quality ?? 60 })
          .toBuffer();
        break;
      case '.gif':
        optimized = await sharp(file.contents, { animated: true }).gif({ effort: 7 }).toBuffer();
        break;
    }

    // Only replace if optimization actually reduced size (prevents double-compression degradation)
    if (optimized && optimized.length < originalSize) {
      file.contents = optimized;
    }
  });

export const svgoOptimize = () =>
  contentTransform('SVG optimization', (file) => {
    if (path.extname(file.path).toLowerCase() !== '.svg') return;

    const result = svgoOptimizeRaw(file.contents.toString(), {
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: { overrides: { removeViewBox: false } },
        },
      ],
    });
    file.contents = Buffer.from(result.data);
  });

/**
 * Convert raster images to another format (webp/avif) via sharp,
 * renaming the file extension. Files that fail to convert are dropped
 * so a broken image never ships under a wrong extension.
 */
export const imageToFormat = (imageFormat, options = {}) =>
  new Transform({
    objectMode: true,
    async transform(file, enc, callback) {
      if (file.isNull()) return callback(null, file);

      try {
        file.contents = await sharp(file.contents)[imageFormat](options).toBuffer();
        file.extname = `.${imageFormat}`;
        callback(null, file);
      } catch (error) {
        reportFailure(`${imageFormat} conversion (${path.basename(file.path)})`, error);
        callback();
      }
    },
  });
