/**
 * Environment — the single source of truth for env-derived values.
 * Must be imported BEFORE any config modules
 * (ESM evaluates imports in order — this ensures .env is loaded first).
 *
 * Load order (first wins): .env.local (gitignored) → .env.{development|production}
 *
 * Build targets:
 *   NODE_ENV=development            → dev server / build:dev (readable, sourcemaps)
 *   NODE_ENV=production             → build:prod (minified — demo deploys, non-WordPress hosting)
 *   NODE_ENV=production + handoff   → build:handoff (optimized images/sprite/kit, but readable
 *                                     HTML/CSS/JS — the WordPress deliverable)
 */

import dotenv from 'dotenv';

const isProd = process.env.NODE_ENV === 'production';
const isHandoff = process.env.BUILD_TARGET === 'handoff';

// `quiet` silences dotenv's "injecting env" banner (dotenv ≥ 17).
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: isProd ? '.env.production' : '.env.development', quiet: true });

const port = Number(process.env.PORT) || 3000;

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
};
