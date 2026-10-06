# gulp-template — agent instructions

Static-markup starter: Gulp 5 + SCSS + `@@include` HTML partials, no JS bundler.
Build output (`dist/`) is a WordPress-handoff artifact: readable, self-sufficient,
hand-editable. `pnpm build:handoff` / `pnpm zip` produce it — keep it that way.
Node 24, pnpm 10.16+.

## Architecture

- `gulpfile.js` sets `globalThis.app = { gulp, paths, plugins, config, build }`;
  every task destructures from that global instead of importing configs.
  `app.build.errors` counts recorded failures.
- Import order in gulpfile matters: `gulp/configs/env.js` (dotenv) must load
  before `config.js`.
- `gulp/configs/env.js` — resolves `isDev` / `isProd` / `isHandoff`
  (`BUILD_TARGET=handoff`), `mode`, `port`, `siteUrl`. The ONLY place that
  reads `process.env` (logger included).
- `gulp/configs/paths.js` — all folder names/globs, computed, not user-facing.
  Image globs are case-insensitive (`.JPG`/`.PNG` exports) and include avif.
- `gulp/configs/config.js` — validates `project.config.js`, resolves
  `config.tailwind.active` (`'auto'` → `existsSync('src/styles/tailwind.css')`),
  `config.site.{url,lang}`. Only shallow-copies the config (it may contain
  functions — never `structuredClone` it).
- `project.config.js` — the only user-facing settings file. Code minification
  and media-query sorting are `isProd && !isHandoff`; image optimization is
  `isProd` (handoff included).
- `gulp/utils/transforms.js` — small Transform streams replace single-purpose
  gulp plugins (prettier/terser/lightningcss/sharp/svgo). They catch their own
  errors, pass the file through and call `reportFailure` (watch survives,
  one-shot builds fail). `pageMeta(siteUrl)` resolves `__PAGE_URL__`
  (canonical / og:url) and absolutizes `og:image` / `twitter:image`.
- `gulp/utils/stream.js` — `sizeReporter` (PassThrough when disabled),
  `handleError(title)` (attach via `.on('error', ...)` to plugin streams:
  logs, rings bell, records the failure, `this.emit('end')`),
  `streamToPromise` (for async tasks that can't return a stream).
- `gulp/utils/logger.js` — `logBuildEnd` fails the run (`done(new Error)`,
  exit 1) when `app.build.errors > 0`. Every "something was skipped" path in a
  task (missing Tailwind package, missing vendor file, critical CSS compile
  error, minifier error) goes through `reportFailure`, never a bare warning.

## Build modes

| Script            | NODE_ENV    | BUILD_TARGET | Code     | Images    | Media queries |
| ----------------- | ----------- | ------------ | -------- | --------- | ------------- |
| `dev`/`build:dev` | development |              | readable | as-is     | source order  |
| `build:handoff`   | production  | handoff      | readable | optimized | source order  |
| `build:prod`      | production  |              | minified | optimized | sorted        |

- `build:prod` and `build:handoff` run the same gulp task graph; the mode lives
  entirely in `project.config.js`. Never add a second minify path.
- Minified output must behave exactly like the readable one: no
  `pure_funcs`/`drop_console` in Terser, no `removeRedundantAttributes` /
  `sortAttributes` in html-minifier (they change DOM that CSS/JS depend on).
- `pnpm zip` = `build:handoff` + `scripts/check-dist.mjs --mode=handoff` +
  archive (`tar -a`, cross-platform, no `.DS_Store`).

## Conventions

- **Incremental builds**: `{ since: gulp.lastRun(task) }` — no gulp-cached /
  gulp-remember / gulp-newer. `html` is incremental per page; `htmlAll`
  (same stream, no `since`) runs when layouts/components change.
- **Binary streams need `{ encoding: false }`** in `gulp.src` (Gulp 5 decodes
  UTF-8 by default): images, assets (fonts/video/favicon), vendor copies.
- **Sass**: gulp-sass + sass-embedded with `quietDeps: true` — own `@warn` and
  deprecation notices stay visible. No glob imports — partials are registered
  in `styles/components/_index.scss` / `styles/ui/_index.scss` via `@forward`.
  Folder names are lowercase (case-sensitive FS compatibility). Breakpoints
  live in `styles/_mixins.scss` (`$breakpoints` map, `media-up/down/between`,
  `hover`, `fluid()`) — never hardcode media queries. Design tokens
  (colors/z-index/radius/header-height) in `styles/vars.scss`.
- **Sizing pattern**: all sizes are written in pixels through `rem()` / `em()`
  (`rem(18)`, `rem(12 24)`, `rem(0 auto)`, `rem(320px)`, `em(20)`) — never raw
  `px`/`rem` literals in declarations. Only exceptions: media queries inside
  `_mixins.scss` (px by design) and the typed zero fallback in
  `var(--header-height, 0rem)` (bare 0 breaks calc()).
- **`!important`** is gated by stylelint at 0 warnings — an intentional use
  carries `/* stylelint-disable-next-line declaration-no-important -- why */`.
- **Critical CSS**: `optimization.criticalCSS: true` inlines compiled
  `critical.scss` into `<head>` (html task, `__CRITICAL_CSS__` placeholder) —
  it never compiles to a standalone file. Watch covers its partials too.
- **HTML pages** start with `<html lang="@@lang">` (`config.site.lang`);
  `_head.html` emits canonical + `og:url` via `__PAGE_URL__` and relative
  `image` params become absolute at build time. Keep pages flat in `pages/`.
- **JS is copied 1:1** as native ES modules — never add a bundler/transpiler.
  `scripts/components/*` is an opt-in library imported from `app.js`; every
  file ships to `dist/` regardless. Comments in English.
  Libraries come in via `vendors` in project.config.js → `dist/**/vendor/`.
- **Minification happens in the main tasks** (single pass, gated by
  `config.optimization.minify.*`) — there is no separate minify stage.
- **Sprite**: `gulp-svg-sprite` bundles svgo@2 internally — its plugin name is
  `cleanupIDs` (capital IDs), do not "fix" it to the svgo3 spelling. Icons are
  included via `@@include('components/_icon.html', {"name": "<file>"})`
  (`.icon` styles in `styles/ui/_icon.scss`).
- **Dev server** mirrors the Vercel deploy: clean URLs (`/about` → about.html)
  and `404.html` for missing pages (extensionless or `.html`).
- **Env**: defaults (port 3000, derived localhost URL) are defined ONCE in
  `gulp/configs/env.js`, which exports resolved `env` — never hardcode
  ports/URLs elsewhere. Load order: `.env.local` wins over `.env.{NODE_ENV}`.

## Tailwind v4 (optional feature)

- Activation is file-based: `src/styles/tailwind.css` exists → pipeline active.
  `pnpm tailwind:setup` (`.template/setup/tailwind/`) only installs
  `tailwindcss` + `@tailwindcss/postcss` and copies template files — it must
  never patch gulpfile.js or \_head.html.
- `gulp/tasks/tailwind.js` imports `@tailwindcss/postcss` **dynamically**
  (the package is absent in vanilla projects); a missing package is a recorded
  build failure, not a warning.
- `_head.html` uses `@@if (tailwind)` / `@@if (tailwindCdn)` — booleans passed
  as gulp-file-include `context` from the html task. `tailwindCdn` is
  prod/handoff-builds-only.
- The `@theme` block between `/* tw-theme:start */` … `/* tw-theme:end */`
  markers in tailwind.css is extracted and inlined into pages (replaces the
  `/* __TW_THEME__ */` placeholder in `layouts/_tailwind-cdn.html`) so tokens
  reach the CDN dev mode. Keep the markers.
- CDN loader: pinned `@tailwindcss/browser` version + SRI hash live in
  `layouts/_tailwind-cdn.html` — when bumping the version, recompute the hash:
  `curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
- `gulp/tasks/tailwindKit.js` writes the dist rebuild kit (package.json with
  versions pinned to the installed Tailwind, tailwind.css without `@source`
  lines, TAILWIND.md) on prod/handoff builds only.

## Commands & verification

- `pnpm dev` / `pnpm build:dev` / `pnpm build:prod` / `pnpm build:handoff` /
  `pnpm preview` / `pnpm serve` (no rebuild) / `pnpm zip` (handoff archive)
- `pnpm tailwind:setup` (add Tailwind) / `pnpm clean:demo` (remove demo content
  — destructive, test only on a copy)
- `pnpm check` = `lint` + `lint:css` + `format:check`, all at 0 warnings.
  Hooks: pre-commit lint-staged, commit-msg commitlint, pre-push `pnpm check`.
- `scripts/check-dist.mjs --mode=dev|prod|handoff` is the post-build smoke
  test (6 CSS entries, sprite, webp siblings, no `@@`/placeholder leftovers,
  `<html lang>`, absolute canonical/og:image, readable-vs-minified per mode,
  no sourcemaps outside dev, no Tailwind kit in vanilla builds). CI and
  `pnpm zip` run it; run it yourself after touching the pipeline.
- Vercel runs `pnpm check && pnpm build:prod && check-dist` (vercel.json
  `buildCommand`); GitHub Actions runs the same plus `build:handoff`.
- The template repo itself stays vanilla: no tailwindcss/swiper in
  devDependencies, `vendors: []` commented out. Test features, then revert.

## Supply chain

- `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (3 days) — a too-fresh
  dependency version fails install; lower the range floor (pnpm picks the
  newest mature version) instead of excluding packages. `onlyBuiltDependencies`
  is an explicit (currently empty) allow-list — audit before adding to it.
- GitHub Actions in `ci.yml` are pinned to commit SHAs (`# vX` comment
  alongside) — keep pins when updating. Dependabot uses a 3-day cooldown.
- `gulp/utils/prepare.js` runs on `pnpm install` for degit clones only
  (no `.git`): strips LICENSE, resets package.json (keeps `prepare: husky`),
  self-deletes. CI and Dependabot stay — they are useful in every project.
