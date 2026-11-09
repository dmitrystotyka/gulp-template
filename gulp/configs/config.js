import { existsSync } from 'node:fs';
import { projectConfig } from '../../project.config.js';
import { env } from './env.js';
import { paths } from './paths.js';

/**
 * The resolved config every task reads (app.config).
 * Merges the per-mode switches from .env (gulp/configs/env.js) with the
 * per-project settings from project.config.js into one stable shape —
 * tasks never read either source directly.
 * Shallow copies only — project.config.js may hold functions (PostCSS plugins).
 */
const p = projectConfig;
const tailwind = p.tailwind ?? 'auto';

export const config = {
  env: { isDev: env.isDev, isProd: env.isProd, isHandoff: env.isHandoff },
  site: { url: env.siteUrl, lang: p.lang || 'en' },
  server: { port: env.port, open: env.openBrowser },
  sourceMaps: env.sourceMaps,

  optimization: {
    minify: { html: env.minify, css: env.minify, js: env.minify, images: env.optimizeImages },
    sortMediaQueries: env.sortMediaQueries,
    criticalCSS: Boolean(p.criticalCSS),
    sitemap: env.sitemap,
    robots: env.robots,
  },

  images: p.images,
  sprites: p.sprites,
  vendors: p.vendors ?? [],
  postcss: { plugins: p.postcssPlugins ?? [] },
  sizeReport: { enabled: p.sizeReport !== false, gzip: true },

  // 'auto' → active when the entry file exists (created by `pnpm tailwind:setup`)
  tailwind: {
    active: tailwind === 'auto' ? existsSync(`${paths.srcStyles}/tailwind.css`) : Boolean(tailwind),
  },
};
