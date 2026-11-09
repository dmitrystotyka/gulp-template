# gulp-template — spec

What the template must do and how each promise is enforced. `CLAUDE.md` files say _how to write code_;
this file says _what must stay true_. A change that breaks a requirement below is a bug, even if the build is green.

## Purpose

Static markup starter: SCSS + `@@include` HTML → `dist/`, delivered three ways:

| Who                   | Gets                                 | Command      |
| --------------------- | ------------------------------------ | ------------ |
| Developer             | dev server, live reload, sourcemaps  | `pnpm dev`   |
| Public (demo, deploy) | minified site on Vercel/static host  | `pnpm build` |
| Client / WP developer | readable, hand-editable code in .zip | `pnpm zip`   |

## Requirements

Each has an ID; the right column is what fails when it breaks.

### Output (`dist/`)

| ID  | Requirement                                                                                                     | Enforced by          |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------- |
| O1  | Opens from disk (file://): no `type="module"`, no root-absolute `/` paths, links `./page.html`                  | `check-dist`         |
| O2  | Icons work from disk: sprite inlined after `<body>`, `<use href="#id">` only                                    | `check-dist`         |
| O3  | Scripts are classic, copied 1:1 per file, share `window.App`; no `import`/`export`                              | `check-dist`, ESLint |
| O4  | Every page: `<html lang>`, absolute canonical + `og:url` + `og:image` from `SITE_URL`                           | `check-dist`         |
| O5  | No leftovers: `@@…`, `__PAGE_URL__`, `/* __…__ */` placeholders                                                 | `check-dist`         |
| O6  | Valid HTML (`html-validate:recommended` + `prettier` presets)                                                   | `pnpm validate`      |
| O7  | Every jpg/png has a `.webp` sibling; AVIF opt-in                                                                | `check-dist`         |
| O8  | No sourcemaps in build/zip; no Tailwind kit in a vanilla build                                                  | `check-dist`         |
| O9  | Output works offline: vendors copied from `node_modules`, no CDN at runtime, no Tailwind browser build          | `check-dist`, review |
| O10 | `404.html` styled on any missing URL, also nested: `<base href=basePath>` first in `<head>`, skipped on file:// | `check-dist`, review |

### Tailwind (when `src/styles/tailwind.css` exists)

| ID  | Requirement                                                                                                                                                                                                     | Enforced by                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| T1  | Only used classes: `source(none)` + `@source` by extension (`html/**/*.html`, `scripts/**/*.js`); docs/README/`.template` are never scanned; SCSS-owned class names excluded via generated `@source not inline` | `tasks/tailwind.js` (fails) |
| T2  | One reset: `normalize.scss`; Tailwind imported as `theme.css` + `utilities.css`, no Preflight                                                                                                                   | template, review            |
| T3  | Utilities beat SCSS: entries in layers `properties < theme < base < components < utilities`                                                                                                                     | `check-dist`                |
| T4  | Vanilla build unchanged: no layers, no kit                                                                                                                                                                      | `check-dist`                |
| T5  | Kit in `dist/`: scans `**/*.{php,html,js}` minus `vendor/`, `node_modules/`, `scripts/vendor/`; `dev` (watch) + `build` (minify); `@source inline` safelist carried over                                        | `check-dist`                |
| T6  | One minify path: `@tailwindcss/postcss` with `optimize: { minify: false }`, `MINIFY` decides                                                                                                                    | `check-dist --mode=handoff` |

### Modes

| ID  | Requirement                                                                          | Enforced by                     |
| --- | ------------------------------------------------------------------------------------ | ------------------------------- |
| M1  | `build`: HTML/CSS/JS minified, images optimized, media queries sorted                | `check-dist --mode=prod`        |
| M2  | `zip` (handoff): same task graph, code readable, images optimized, source order kept | `check-dist --mode=handoff`, CI |
| M3  | Mode lives only in `.env.*`; `process.env` read only in `gulp/configs/env.js`        | review                          |
| M4  | Minified code behaves like readable code: no `drop_console`, no attribute rewriting  | review (`gulp/CLAUDE.md`)       |

### Build behaviour

| ID  | Requirement                                                                          | Enforced by   |
| --- | ------------------------------------------------------------------------------------ | ------------- |
| B1  | Any task failure → exit 1 in one-shot builds; `dev` watch survives                   | `logBuildEnd` |
| B2  | Incremental in watch (`since: lastRun`); layout/component change rebuilds every page | review        |
| B3  | No bundler, no transpiler, one minify path per asset type                            | review        |
| B4  | Tailwind optional: on when `src/styles/tailwind.css` exists, no gulpfile patching    | review        |

### Source code

| ID  | Requirement                                                                           | Enforced by             |
| --- | ------------------------------------------------------------------------------------- | ----------------------- |
| S1  | Sizes via `rem()`/`em()`/`fluid()`; colors via tokens/`alpha()`; media via mixins     | Stylelint               |
| S2  | Tokens use Tailwind v4 names and values (`--color-gray-950` = `gray-950`)             | review                  |
| S3  | `src/html/` formatted by hand (Prettier-ignored); `dist/` formatted by the build      | `.prettierignore`       |
| S4  | Components document params in `<!--- --->`; optional params behind `@@if (context.x)` | review, `check-dist` O5 |
| S5  | `<img>`/`<video>`/`<iframe>` carry `width`+`height`; LCP image eager, rest lazy       | `pnpm validate`, review |

### WordPress theme (`pnpm theme` → `wp-theme/`)

| ID  | Requirement                                                                                                                                                                                                      | Enforced by                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| W1  | Classic theme installable from the zip: files inside `<slug>/`, `style.css` (Theme Name, Requires at least 6.3), `index.php`, `functions.php`                                                                    | `check-theme`                           |
| W2  | Pages split at `<main>`: shared `header.php`/`footer.php` (wp_head, body_class, wp_body_open, wp_footer); `front-page.php`, `404.php`, `page-<name>.php`; page-only markup after `</main>` stays in its template | `theme/build.js` (fails), `check-theme` |
| W3  | One asset list: `inc/assets.php` from the build's own `<link>`/`<script>` order (commented-out ones skipped); enqueued in order, scripts `defer` in footer; every file exists                                    | `check-theme`                           |
| W4  | No static leftovers in PHP: no `./` URLs, `.html` links, hardcoded `<script src>`, `@@`, placeholders; SEO meta/`<title>` left to WordPress                                                                      | `check-theme`                           |
| W5  | Valid PHP in every template                                                                                                                                                                                      | CI `php -l`                             |
| W6  | HTML is the source: `wp-theme/` is regenerated from scratch each run, never edited in the repo (gitignored)                                                                                                      | `.gitignore`, review                    |

### Repo & supply chain

| ID  | Requirement                                                                                             | Enforced by               |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------- |
| R1  | `pnpm check` 0 warnings on pre-push, CI, Vercel                                                         | husky, CI, `vercel.json`  |
| R2  | Conventional commits, every commit bumps `package.json` semver                                          | commitlint, review        |
| R3  | Template repo stays vanilla (projects made from it don't): no tailwindcss/swiper in deps, `vendors: []` | review                    |
| R4  | `minimumReleaseAge` 3 days, empty audited `onlyBuiltDependencies`, SHA-pinned CI actions                | `pnpm-workspace.yaml`, CI |

## Non-goals

SPA/routing, JS bundling or TS, CMS logic, server-side code, image CDNs, runtime third-party scripts.

## Done = all green

```bash
pnpm check && pnpm build && node scripts/check-dist.mjs --mode=prod && pnpm validate
pnpm exec cross-env BUILD_TARGET=handoff pnpm build && node scripts/check-dist.mjs --mode=handoff && pnpm validate   # pipeline changes
pnpm theme   # page structure / theme changes: builds, checks, generates and zips the WordPress theme
```

New requirement → add a row here and, where possible, a check in `scripts/check-dist.mjs` / `scripts/check-theme.mjs`.
