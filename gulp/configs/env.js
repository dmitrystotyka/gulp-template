/**
 * Environment — the single source of truth for env-derived values.
 * Must be imported BEFORE any config modules
 * (ESM evaluates imports in order — this ensures .env is loaded first).
 *
 * One .env file per mode (first wins):
 *   pnpm dev    → .env.local → .env.development
 *   pnpm build  → .env.local → .env.production
 *   pnpm zip    → .env.local → .env.handoff → .env.production
 *
 * Everything that differs between modes lives in those files; settings that
 * are the same in every mode live in project.config.js.
 */

import dotenv from 'dotenv';

const isProd = process.env.NODE_ENV === 'production';
const isHandoff = process.env.BUILD_TARGET === 'handoff';

const files = ['.env.local', ...(isHandoff ? ['.env.handoff'] : []), isProd ? '.env.production' : '.env.development'];
// `quiet` silences dotenv's "injecting env" banner (dotenv ≥ 17).
for (const path of files) dotenv.config({ path, quiet: true });

/** true/false/1/0/yes/no; a missing or empty variable falls back to the mode default. */
const flag = (name, fallback) => {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value);
};

const port = Number(process.env.PORT) || 3000;
const minifyByDefault = isProd && !isHandoff;

export const env = {
  isDev: !isProd,
  isProd,
  isHandoff,
  /** Human-readable build mode for logs. */
  mode: isHandoff ? 'handoff' : isProd ? 'production' : 'development',
  port,
  siteUrl: (process.env.SITE_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  /** `BROWSER=none` (CI, agents, SSH sessions) keeps the dev server from opening a tab. */
  openBrowser: process.env.BROWSER !== 'none',

  // Build switches — defaults mirror the committed .env files
  sourceMaps: flag('SOURCEMAPS', !isProd),
  minify: flag('MINIFY', minifyByDefault),
  optimizeImages: flag('OPTIMIZE_IMAGES', isProd),
  sortMediaQueries: flag('SORT_MEDIA_QUERIES', minifyByDefault),
  sitemap: flag('SITEMAP', false),
  robots: flag('ROBOTS', false),
};
