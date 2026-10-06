<div align="center">
  <h1>Gulp Template</h1>
  <p>Modern Gulp 5 starter for fast frontend development and clean WordPress handoffs</p>

  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D24-brightgreen?style=flat-square" alt="Node.js"></a>
    <a href="https://gulpjs.com"><img src="https://img.shields.io/badge/gulp-5-cf4647?style=flat-square" alt="Gulp"></a>
    <a href="https://github.com/hHolyMolly/gulp-template/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  </p>

  <p><a href="https://gulp-template-seven.vercel.app">Live Demo</a></p>
</div>

<br />

## Features

- **SCSS** — Dart Sass (sass-embedded), Autoprefixer; media-query sorting in `build:prod` only
- **HTML Includes** — `@@include` partials with parameters, `@@lang`, canonical + `og:url` + absolute `og:image` from `SITE_URL`
- **SVG Sprites** — symbol sprite + `_icon.html` partial
- **Images** — Sharp optimization, auto WebP, opt-in AVIF (case-insensitive globs)
- **Vendors** — library files copied from `node_modules` into `dist`
- **BrowserSync 3** — dev server, hot reload, clean URLs like the deploy, 404 fallback
- **Three builds** — `build:dev` (sourcemaps) · `build:prod` (minified: Lightning CSS + Terser + html-minifier) · `build:handoff` (optimized but readable — the WordPress deliverable)
- **Failing builds fail** — a broken Sass file or include exits 1 (watch mode survives)
- **Tailwind CSS v4** — optional, one command, zero patching
- **WordPress Handoff** — self-sufficient `dist/` with Tailwind rebuild kit & CDN dev mode
- **Quality gates** — ESLint 10, Stylelint 17 (0 warnings), Prettier, dist smoke test; husky + lint-staged + commitlint; GitHub CI; same gates on Vercel

## Quick Start

```bash
npx degit hHolyMolly/gulp-template my-project
cd my-project
pnpm install
git init && pnpm prepare   # enable git hooks
pnpm dev
```

> Node.js 24+, pnpm 10.16+

## Commands

| Command                                    | Description                                                   |
| ------------------------------------------ | ------------------------------------------------------------- |
| `pnpm dev`                                 | Dev server with hot reload                                    |
| `pnpm build:dev`                           | Development build (readable, sourcemaps)                      |
| `pnpm build:prod`                          | Production build (minified + optimized) — demo / static hosts |
| `pnpm build:handoff`                       | Handoff build (optimized images, readable code) — WordPress   |
| `pnpm preview`                             | Production build + preview server                             |
| `pnpm serve`                               | Serve existing `dist/` (no rebuild)                           |
| `pnpm zip`                                 | Handoff build + smoke test + `dist/` → zip                    |
| `pnpm lint` / `lint:fix`                   | ESLint check (0 warnings) · autofix                           |
| `pnpm lint:css` / `lint:css:fix`           | Stylelint check (0 warnings) · autofix                        |
| `pnpm format` / `format:check`             | Prettier write · check                                        |
| `pnpm check`                               | lint + lint:css + format:check (pre-push, Vercel, CI)         |
| `pnpm check:dist -- --mode=<m>`            | Smoke-test `dist/` (`dev` · `prod` · `handoff`)               |
| `pnpm tailwind:setup`                      | Add Tailwind CSS v4                                           |
| `pnpm clean:demo`                          | Remove demo content, reset index.html                         |
| `pnpm clean` / `clean:cache` / `clean:all` | Remove `dist/` · caches · `node_modules/` + `dist/`           |

Git hooks: pre-commit (lint-staged) · commit-msg (commitlint) · pre-push (`pnpm check`).

## Project Structure

```
src/
├── html/
│   ├── layouts/          # _head (meta, canonical, OG), _header, _footer, _modals
│   ├── pages/            # Each file → dist/*.html (<html lang="@@lang">)
│   └── components/       # Reusable blocks (_icon.html, _picture.html, demo.html)
├── styles/
│   ├── vars.scss         # CSS custom properties
│   ├── normalize.scss    # CSS reset
│   ├── fonts.scss        # @font-face
│   ├── main.scss         # Layout + components/_index.scss
│   ├── ui.scss           # UI elements via ui/_index.scss
│   ├── utils.scss        # Utility classes
│   └── critical.scss     # Above-the-fold (optional)
├── scripts/
│   ├── app.js            # Entry — native ES modules, no bundler
│   ├── components/       # modals, sliders, spollers, headerScroll, dynamicAdapt (opt-in via app.js)
│   └── utils/            # DOM, debounce, bodyLock
└── assets/
    ├── fonts/  img/  sprites/  video/
scripts/check-dist.mjs    # dist smoke test (CI, pnpm zip)
```

New SCSS partials: add a `@forward` line to `components/_index.scss` or `ui/_index.scss`.
JS modules in `scripts/components/` are a library: import the ones you use from `app.js` — every file is copied to `dist/` as-is.

## Configuration

[`project.config.js`](project.config.js) — the only settings file:

| Setting                         | Description                                                            |
| ------------------------------- | ---------------------------------------------------------------------- |
| `site`                          | `url` (from `SITE_URL`) for canonical/OG/sitemap · `lang` for `@@lang` |
| `server`                        | Port (from `.env`), auto-open                                          |
| `sourceMaps`                    | CSS/JS sourcemaps (dev only by default)                                |
| `optimization.minify`           | HTML/CSS/JS/image minification — code minify is `build:prod` only      |
| `optimization.sortMediaQueries` | Move media queries to the end of each file (`build:prod` only)         |
| `optimization.criticalCSS`      | Inline compiled `critical.scss` into `<head>` of every page            |
| `optimization.sitemap/robots`   | Generate sitemap.xml / robots.txt (prod + handoff builds)              |
| `tailwind`                      | `'auto'` (on when `src/styles/tailwind.css` exists) / `true/false`     |
| `vendors`                       | Files copied from `node_modules` into `dist/**/vendor/`                |
| `images`                        | WebP/AVIF/JPEG/PNG quality                                             |
| `sprites`                       | SVG sprite toggle and filename                                         |
| `sizeReport`                    | Gzip build size report                                                 |
| `postcss`                       | Extra PostCSS plugins                                                  |

Env: `.env.development` / `.env.production` (committed, no secrets) + `.env.local` (gitignored, wins). `PORT` and `SITE_URL` — the site URL falls back to `http://localhost:<PORT>` automatically.

> Changes to `project.config.js`, `.env.*` or the `vendors` list require a dev server restart.

## Build modes

| Mode            | HTML/CSS/JS | Images    | Media queries | Sourcemaps | Use for                               |
| --------------- | ----------- | --------- | ------------- | ---------- | ------------------------------------- |
| `build:dev`     | readable    | as-is     | source order  | yes        | local checks                          |
| `build:handoff` | readable    | optimized | source order  | no         | **WordPress / hand-off** (`pnpm zip`) |
| `build:prod`    | minified    | optimized | sorted        | no         | demo deploys, static hosting          |

`build:handoff` is `build:prod` with every code-mangling step off (`BUILD_TARGET=handoff`): no minification, no media-query sorting, no console stripping, attributes untouched. What a developer tests in `pnpm dev` is what they receive.

## SVG Icons

Drop an SVG into `src/assets/sprites/` and include it anywhere:

```html
@@include('components/_icon.html', {"name": "arrow-right"})
```

Icons size from `font-size` and color from `currentColor` (`.icon` in `ui/_icon.scss`).

## Responsive Images

The build creates a `.webp` sibling for every jpg/png (AVIF — opt-in via `images.avif`):

```html
@@include('components/_picture.html', { "src": "./assets/img/photo", "ext": "jpg", "alt": "…", "class": "", "loading":
"lazy", "width": "1200", "height": "675" })
```

## Vendor Libraries

```bash
pnpm add swiper
```

```js
// project.config.js
vendors: [
  'swiper/swiper-bundle.min.js',
  { from: 'swiper/swiper-bundle.min.css', to: 'swiper.min.css' },
],
```

```html
<link rel="stylesheet" href="./styles/vendor/swiper.min.css" />
<script src="./scripts/vendor/swiper-bundle.min.js"></script>
<script src="./scripts/app.js" type="module"></script>
```

## Tailwind CSS v4 (optional)

```bash
pnpm tailwind:setup   # installs packages, creates src/styles/tailwind.css + demo page
pnpm dev              # restart — pipeline activates automatically
```

CSS-first config in `src/styles/tailwind.css` (`@theme`, `@source`). Additive — SCSS entries untouched.

## WordPress Handoff

`pnpm zip` (= `build:handoff` + smoke test + archive) makes `dist/` self-sufficient inside a theme:

- HTML is Prettier-formatted, CSS keeps source order, JS ships as readable per-file ES modules
- **Rebuild kit** (Tailwind active): `dist/package.json` + `TAILWIND.md` — after editing `.php`: `npm install && npm run css` (versions pinned to the project's Tailwind)
- **CDN dev mode**: on `localhost` / `*.local` / `*.test` pages auto-load the pinned Tailwind browser build (SRI) — new classes work without rebuild; production hosts load nothing. Override: `window.TW_CDN = true/false`

## Deploy

**Vercel** — zero config: import the repo at [vercel.com/new](https://vercel.com/new), everything
(build command, `dist` output, clean URLs, security headers) comes from [`vercel.json`](vercel.json).
Every push runs `pnpm check` + `build:prod` + the dist smoke test on Vercel's side; a failing build exits 1 and blocks the deploy.
**GitHub Actions** (`.github/workflows/ci.yml`) runs the same gates plus the handoff build.

## Production Headers

Vercel sets them from `vercel.json`. On your own server:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
# CSP on staging with Tailwind CDN dev mode: allow script-src https://cdn.jsdelivr.net
```

## License

MIT © [HolyMolly](https://github.com/hHolyMolly)
