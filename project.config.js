/**
 * Project Configuration
 *
 * This file contains user-facing settings only.
 * Directory structure and internal paths are managed by gulp/configs/paths.js
 * PORT / SITE_URL come from .env files (see gulp/configs/env.js)
 */

import { env } from './gulp/configs/env.js';

const { isDev, isProd, isHandoff } = env;

// Minified output belongs to `build:prod` only. `build:handoff` (the WordPress
// deliverable) keeps HTML/CSS/JS readable while still optimizing images.
const minifyCode = isProd && !isHandoff;

export const projectConfig = {
  // ─────────────────────────────────────────────────────────
  // Environment
  // ─────────────────────────────────────────────────────────

  env: { isDev, isProd, isHandoff },

  // ─────────────────────────────────────────────────────────
  // Site — public URL (SITE_URL from .env, falls back to http://localhost:<port>)
  // and the document language passed to pages as `@@lang`.
  // ─────────────────────────────────────────────────────────

  site: {
    url: env.siteUrl,
    lang: 'en',
  },

  // ─────────────────────────────────────────────────────────
  // Dev Server (BrowserSync)
  // ─────────────────────────────────────────────────────────

  server: {
    port: env.port, // PORT from .env
    open: env.openBrowser, // open browser on `pnpm dev` (BROWSER=none disables)
  },

  // ─────────────────────────────────────────────────────────
  // Build Optimization
  // ─────────────────────────────────────────────────────────

  sourceMaps: isDev,

  optimization: {
    minify: {
      html: minifyCode,
      css: minifyCode,
      js: minifyCode,
      images: isProd,
    },
    // Moves every media query to the end of each stylesheet (smaller gzip).
    // Off for handoff: it separates rules from their responsive overrides,
    // which is exactly what a hand-editing developer does not want.
    sortMediaQueries: minifyCode,
    criticalCSS: false, // inline compiled critical.scss into <head> of every page
    sitemap: false, // generate sitemap.xml
    robots: false, // generate robots.txt
  },

  // ─────────────────────────────────────────────────────────
  // Tailwind CSS (optional — install with `pnpm tailwind:setup`)
  // 'auto' = active when src/styles/tailwind.css exists
  // true / false = force on / off
  // ─────────────────────────────────────────────────────────

  tailwind: {
    enabled: 'auto',
  },

  // ─────────────────────────────────────────────────────────
  // Vendor Libraries
  // Prebuilt files copied from node_modules into dist —
  // .css → dist/styles/vendor/, everything else → dist/scripts/vendor/
  // Install the package first, then list the file. Restart dev after edits.
  // ─────────────────────────────────────────────────────────

  vendors: [
    // 'swiper/swiper-bundle.min.js',
    // { from: 'swiper/swiper-bundle.min.css', to: 'swiper.min.css' },
  ],

  // ─────────────────────────────────────────────────────────
  // Images
  // ─────────────────────────────────────────────────────────

  images: {
    webp: {
      enabled: true,
      quality: 80,
    },
    avif: {
      enabled: false, // opt-in: smaller than webp, slower to encode
      quality: 60,
    },
    jpeg: {
      quality: 80,
      progressive: true,
    },
    png: {
      compressionLevel: 9,
    },
  },

  // ─────────────────────────────────────────────────────────
  // SVG Sprites
  // ─────────────────────────────────────────────────────────

  sprites: {
    enabled: true,
    fileName: 'sprite.symbol.svg',
  },

  // ─────────────────────────────────────────────────────────
  // Build Report
  // ─────────────────────────────────────────────────────────

  sizeReport: {
    enabled: true,
    gzip: true,
  },

  // ─────────────────────────────────────────────────────────
  // PostCSS — additional plugins (applied after Autoprefixer)
  // Example (this file is an ES module):
  //   import postcssCustomMedia from 'postcss-custom-media';
  //   postcss: { plugins: [postcssCustomMedia()] }
  // ─────────────────────────────────────────────────────────

  postcss: {
    plugins: [],
  },
};
