<div align="center">
  <h1>Gulp Template</h1>
  <p>Modern Gulp 5 starter for fast frontend development and clean WordPress handoffs</p>

  <p>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D24-brightgreen?style=flat-square" alt="Node.js"></a>
    <a href="https://gulpjs.com"><img src="https://img.shields.io/badge/gulp-5-cf4647?style=flat-square" alt="Gulp"></a>
    <a href="https://github.com/dmitrystotyka/gulp-template/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  </p>

  <p><a href="https://gulp-template-seven.vercel.app/demo">Live Demo</a></p>
</div>

<br />

## Features

- **SCSS** — Dart Sass (sass-embedded), Autoprefixer; media-query sorting in `pnpm build` only
- **HTML Includes** — `@@include` partials with parameters, `@@lang`, canonical + `og:url` + absolute `og:image` from `SITE_URL`
- **SVG Sprites** — symbol sprite + `_icon.html` partial
- **Images** — Sharp optimization, auto WebP, opt-in AVIF (case-insensitive globs)
- **Vendors** — library files copied from `node_modules` into `dist`
- **BrowserSync 3** — dev server, hot reload, clean URLs like the deploy, 404 fallback
- **Two outputs** — `pnpm build` (minified: Lightning CSS + Terser + html-minifier) · `pnpm zip` (optimized but readable — the WordPress deliverable)
- **Opens from disk** — the client double-clicks `dist/index.html` (file://) and the site works: classic scripts, inline sprite, relative paths (enforced by the smoke test)
- **Failing builds fail** — a broken Sass file or include exits 1 (watch mode survives)
- **Tailwind CSS v4** — optional, one command, zero patching
- **WordPress Handoff** — self-sufficient `dist/` with a Tailwind theme kit that rebuilds from `.php` (only used classes)
- **Quality gates** — ESLint 10, Stylelint 17 (0 warnings), Prettier, HTML validator (html-validate), dist smoke test; husky + lint-staged + commitlint; GitHub CI; same gates on Vercel

## Quick Start

```bash
npx degit dmitrystotyka/gulp-template my-project
cd my-project
git init
pnpm install   # names the project after its folder (v1.0.0) + enables git hooks
pnpm dev
```

> Node.js 24+, pnpm 10.16+. Any order works — `pnpm install` first, `git init` later? Run `pnpm prepare` once after `git init` to enable the hooks. Same in cmd, PowerShell, Git Bash, macOS, Linux.

## Commands

```bash
pnpm dev       # dev server with hot reload
pnpm build     # production build (minified + optimized) → dist/
pnpm preview   # build + preview server
pnpm zip       # WordPress handoff: readable code, optimized images → .zip
pnpm check     # ESLint + Stylelint + Prettier (0 warnings)
pnpm fix       # autofix everything above
pnpm validate  # HTML validator over dist/*.html (also runs in zip, CI, Vercel)
```

Optional: `pnpm tailwind:setup` adds Tailwind CSS v4.

`index.html` is a clean start page. The showcase lives in `src/html/pages/demo.html` — delete that one file when you no longer need it.

Git hooks: pre-commit (lint-staged) · commit-msg (commitlint) · pre-push (`pnpm check`).

## Project Structure

```
src/
├── html/
│   ├── layouts/          # _head (meta, canonical, OG), _header, _footer, _modals, _scripts
│   ├── pages/            # index (clean start), template, 404, demo (deletable) → dist/*.html
│   └── components/       # _button, _icon, _picture, modals/ (_frame-start/_frame-end + one file per modal)
├── styles/
│   ├── vars.scss         # Design tokens, Tailwind naming: --color-red-300, --text-lg
│   ├── normalize.scss    # CSS reset
│   ├── fonts.scss        # @font-face
│   ├── main.scss         # Layout + components/_index.scss
│   ├── ui.scss           # UI elements via ui/_index.scss
│   ├── utils.scss        # Utility classes
│   └── critical.scss     # First-paint styles (preloader) inlined into <head> (optional)
├── scripts/
│   ├── app.js            # Your code — classic script, loaded last
│   ├── components/       # modals, sliders, spollers, headerScroll, dynamicAdapt (opt-in)
│   └── utils/            # DOM, debounce, bodyLock
└── assets/
    ├── fonts/  img/  sprites/  video/
scripts/check-dist.mjs    # dist smoke test (CI, pnpm zip)
```

Sizes are always written in px through `rem()` / `em()` (`rem(18)`, `rem(12 24)`), colors and text sizes through tokens with Tailwind v4 names and values (`var(--color-gray-950)`), opacity through `alpha(gray-950, 60)` — the SCSS twin of `bg-gray-950/60`. Stylelint rejects raw `px`/`rem`/`em`, hex and `rgb()` outside `vars.scss`.

New SCSS partials: add a `@forward` line to `components/_index.scss` or `ui/_index.scss`.
Scripts are plain `<script defer>` files sharing `window.App` — no modules, so `dist/` works when opened straight from disk. Enable components by uncommenting their lines in `src/html/layouts/_scripts.html`; every file is copied to `dist/` as-is.

## Configuration

Two places, split by one rule — **does it differ between modes?**

**`.env.*` — per mode** (committed, no secrets; `.env.local` is gitignored and wins):

| File               | Used by                      | Holds                               |
| ------------------ | ---------------------------- | ----------------------------------- |
| `.env.development` | `pnpm dev`                   | `PORT`, `BROWSER`, build switches   |
| `.env.production`  | `pnpm build`, `preview`      | `SITE_URL`, build switches          |
| `.env.handoff`     | `pnpm zip` (over production) | only the differences: readable code |

Build switches: `SOURCEMAPS` · `MINIFY` · `OPTIMIZE_IMAGES` · `SORT_MEDIA_QUERIES` · `SITEMAP` · `ROBOTS` (`true`/`false`).
`SITE_URL` feeds canonical, `og:url`, absolute `og:image`, sitemap; in dev it is `http://localhost:<PORT>`.

**[`project.config.js`](project.config.js) — same in every mode:**

| Setting          | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `lang`           | `<html lang>` of every page                                      |
| `criticalCSS`    | Inline `critical.scss` into `<head>` (preloader, first screen)   |
| `images`         | WebP/AVIF/JPEG/PNG quality, AVIF on/off                          |
| `sprites`        | SVG sprite toggle and filename                                   |
| `vendors`        | Files copied from `node_modules` into `dist/**/vendor/`          |
| `tailwind`       | `auto` (on when `src/styles/tailwind.css` exists) / `true/false` |
| `postcssPlugins` | Extra PostCSS plugins                                            |
| `sizeReport`     | Gzip build size report                                           |

> Changes to `project.config.js` or any `.env.*` require a dev server restart.

## Build modes

| Command      | HTML/CSS/JS | Images    | Media queries | Sourcemaps | Use for                      |
| ------------ | ----------- | --------- | ------------- | ---------- | ---------------------------- |
| `pnpm dev`   | readable    | as-is     | source order  | yes        | development                  |
| `pnpm build` | minified    | optimized | sorted        | no         | demo deploys, static hosting |
| `pnpm zip`   | readable    | optimized | source order  | no         | **WordPress / hand-off**     |

`pnpm zip` runs the same build with every code-mangling step off (`BUILD_TARGET=handoff`): no minification, no media-query sorting, attributes untouched — a WordPress developer gets code they can edit by hand. What you test in `pnpm dev` is what they receive.

## Buttons & Modals

```text
@@include('components/_button.html', {"text": "Call me", "popup": "callback"})
```

Button: `text` + optional `href` (renders `<a>`), `type`, `variant` (`outline`), `icon`, `popup`, `close`, `class`.

A modal is one file in `src/html/components/modals/` — id, title and content together:

```text
@@include('components/modals/_frame-start.html', {"id": "callback", "title": "Call me"})
  <form>…</form>
@@include('components/modals/_frame-end.html')
```

Include it in `layouts/_modals.html` (every page) or in one page. Copy `components/modals/_demo.html` to start.

> HTML sources (`src/html/`) are excluded from Prettier — it would glue `@@include` lines together. `dist/` is still formatted by the build.

## SVG Icons

Drop an SVG into `src/assets/sprites/` and include it anywhere:

```html
@@include('components/_icon.html', {"name": "arrow-right"})
```

The sprite is inlined into every page that uses icons (works from file://). Icons size from `font-size` and color from `currentColor` (`.icon` in `ui/_icon.scss`).

## Responsive Images

The build creates a `.webp` sibling for every jpg/png (AVIF — opt-in via `images.avif`):

```text
@@include('components/_picture.html', {"src": "./assets/img/photo", "ext": "jpg", "alt": "…",
  "class": "", "loading": "lazy", "width": "1200", "height": "675"})
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
<!-- _head.html -->
<link rel="stylesheet" href="./styles/vendor/swiper.min.css" />
<!-- layouts/_scripts.html, before the components -->
<script src="./scripts/vendor/swiper-bundle.min.js" defer></script>
```

## Tailwind CSS v4 (optional)

```bash
pnpm tailwind:setup   # installs packages, creates src/styles/tailwind.css, prints how it works
pnpm dev              # restart — pipeline activates automatically
```

CSS-first config in `src/styles/tailwind.css` (`@theme`, `@source`):

- **Only used classes** — `source(none)` + `@source '../html/**/*.html'`, `'../scripts/**/*.js'`; nothing else is scanned. Class names your SCSS defines (`.container`, `.btn`) are never generated by Tailwind. Classes that appear in no file → `@source inline('…')`.
- **One reset** — `normalize.scss`; Tailwind without Preflight, so SCSS components look the same with and without it.
- **Utilities win** — with Tailwind on, the SCSS entries go into cascade layers (`base < components < utilities`): `class="btn mt-4"` just works, no `!important`.

## WordPress Handoff

`pnpm zip` (handoff build + smoke test + HTML validation + archive) makes `dist/` self-sufficient inside a theme:

- HTML is Prettier-formatted, CSS keeps source order, JS ships as readable per-file classic scripts
- **Tailwind theme kit** (Tailwind active): `dist/tailwind.css` + `package.json` + `TAILWIND.md`. The theme scans its own `**/*.{php,html,js}` (without `vendor/`, `node_modules/`, `scripts/vendor/`) — `npm install`, then `npm run dev` (watch, rebuilds in milliseconds) or `npm run build` (minified). No Node: the standalone Tailwind CLI runs the same. Versions pinned to the project's Tailwind; `TAILWIND.md` lists the PHP rules (full class names, `@source inline` for classes stored in the database)

## Deploy

**Vercel** — zero config: import the repo at [vercel.com/new](https://vercel.com/new), everything
(build command, `dist` output, clean URLs, security headers) comes from [`vercel.json`](vercel.json).
Every push runs `pnpm check` + `pnpm build` + the dist smoke test + `pnpm validate` on Vercel's side; a failing build exits 1 and blocks the deploy.
**GitHub Actions** (`.github/workflows/ci.yml`) runs the same gates plus the handoff build.

## Production Headers

Vercel sets them from `vercel.json`. On your own server:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## License

MIT © [Dmitry Stotyka](https://dmitrystotyka.com)
