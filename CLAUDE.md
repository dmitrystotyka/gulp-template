# gulp-template

Gulp 5 + SCSS + `@@include` HTML → static `dist/`, ready for WordPress handoff.
No JS bundler. Node 24 · pnpm 10.16+.

## Commands

```bash
pnpm dev       # dev server + watch
pnpm build     # production build (minified) → dist/
pnpm preview   # build + serve dist/
pnpm zip       # handoff build (readable code, optimized images) → .zip
pnpm check     # ESLint + Stylelint + Prettier, 0 warnings (pre-push, CI, Vercel)
pnpm fix       # autofix all of the above
pnpm validate  # HTML validator (html-validate) over dist/*.html
```

Setup: `pnpm tailwind:setup`. Demo = `src/html/pages/demo.html` (delete the file to drop it).

## How to work here

1. **`SPEC.md`** — what must stay true (requirements O/M/B/S/R + what enforces each). Never break one.
2. **Read the folder's `CLAUDE.md`** (map below) and write code the way it says.
3. **Library/tool code → Context7 first** (section below), then the official docs, never memory alone.
4. **Change behaviour → update the doc in the same change** (and `SPEC.md` if a requirement changes).
   Keep docs short: tree, rules, copy-paste examples.
5. **Verify** (next section) before reporting done.

## Verify — every HTML/pipeline change

```bash
pnpm check && pnpm build && node scripts/check-dist.mjs --mode=prod && pnpm validate
```

`pnpm validate` is mandatory, not optional: run it after any markup change and fix the
source, never loosen `.htmlvalidate.json` to pass. `pnpm zip`, CI and Vercel run it too.
Pipeline/env change → also the handoff pass (CI runs it):
`pnpm exec cross-env BUILD_TARGET=handoff pnpm build && node scripts/check-dist.mjs --mode=handoff && pnpm validate`.

## Library docs — Context7 (MCP)

Before writing or changing code that uses a library/tool, fetch current docs through the
Context7 MCP: `resolve-library-id` → `query-docs` (one topic per query). Never rely on memory
alone. Known IDs (skip the resolve step):

| Library                | Context7 ID                                         | Used in                                    |
| ---------------------- | --------------------------------------------------- | ------------------------------------------ |
| Gulp 5                 | `/gulpjs/gulp`                                      | `gulpfile.js`, `gulp/tasks/`               |
| Sass (sass-embedded)   | `/sass/embedded-host-node` · language `/sass/sass`  | `tasks/styles.js`, `tasks/html.js`, SCSS   |
| Tailwind CSS v4        | `/tailwindlabs/tailwindcss.com`                     | `tasks/tailwind*.js`, `utils/cssLayers.js` |
| Swiper (opt-in vendor) | `/nolimits4web/swiper` (pick the installed version) | `scripts/components/sliders.js`            |

Not in Context7 (verified) — read the package README on npm/GitHub instead:
`gulp-file-include` (`@@include`/`@@if` syntax), `html-validate` (rules, presets, `.htmlvalidate.json`).
For anything else (Prettier, Stylelint, ESLint, sharp, svgo, BrowserSync, Lightning CSS, Terser,
dotenv) resolve the ID first; add it to the table once found.

## Docs map

| Folder         | Doc                     |
| -------------- | ----------------------- |
| `src/html/`    | `src/html/CLAUDE.md`    |
| `src/styles/`  | `src/styles/CLAUDE.md`  |
| `src/scripts/` | `src/scripts/CLAUDE.md` |
| `src/assets/`  | `src/CLAUDE.md`         |
| `gulp/`        | `gulp/CLAUDE.md`        |

## Settings — two places

- **Differs between modes** → `.env.development` (dev) · `.env.production` (build) · `.env.handoff` (zip, overrides production):
  `SITE_URL`, `PORT`, `BROWSER`, `SOURCEMAPS`, `MINIFY`, `OPTIMIZE_IMAGES`, `SORT_MEDIA_QUERIES`, `SITEMAP`, `ROBOTS`.
- **Same in every mode** → `project.config.js`: `lang`, `criticalCSS`, `images`, `sprites`, `vendors`, `tailwind`, `postcssPlugins`, `sizeReport`.
- Secrets/local overrides → `.env.local` (gitignored, wins). New switch = `.env.*` + `flag()` in `gulp/configs/env.js`.

Other: `SPEC.md` (requirements) · `scripts/check-dist.mjs` (dist smoke test) ·
`.htmlvalidate.json` (validator rules) · `.template/setup/` (tailwind, zip — pure Node, no tar) · `.github/`, `vercel.json` (CI, deploy).

## Rules

- **`dist/` must open from disk**: a client double-clicks `dist/*.html` (file://) and sees the site.
  So: classic `<script defer>` (no `type="module"`), inline sprite, relative `./` paths, links to `page.html`.
  `check-dist` enforces it.
- No bundler/transpiler, no second minify path.
- `process.env` only in `gulp/configs/env.js` (exception: `gulp/utils/prepare.js` install hook reads `CI`/`VERCEL`); no hardcoded ports/URLs.
- npm scripts must run in cmd too: no `|| true`, `rm -rf`, `VAR=x cmd` — use `cross-env` or a Node script.
- Template stays vanilla: no tailwindcss/swiper in deps, `vendors: []` commented out.
- Supply chain: `minimumReleaseAge` 3 days, audited `onlyBuiltDependencies`, SHA-pinned CI actions.

## PageSpeed (Core Web Vitals)

- **LCP** (hero image): write its `<picture>` by hand with `loading="eager" fetchpriority="high"`;
  everything below the fold — `_picture.html` with `"loading": "lazy"`. Never lazy-load the LCP image.
- **CLS**: every `<img>`/`<video>`/`<iframe>` has `width` + `height` (`_picture` requires them);
  reserve space for header (`--header-height`) and late content.
- **Images**: webp is generated automatically; enable `images.avif` for heavy photos; export at ≤2× display size.
- **Fonts**: prefer local `woff2` in `assets/fonts` + `font-display: swap` (`fonts.scss`), preload
  only the one above-the-fold face; a Google Fonts `<link>` costs a render-blocking request.
- **CSS**: `criticalCSS: true` (project.config.js) + `critical.scss` for above-the-fold styles; no `@import url()`.
- **JS**: `defer` only (`_scripts.html`), enable just the components a page uses, no third-party scripts in `<head>`.
- **Measure** on the deployed `pnpm build` (Vercel URL) in PageSpeed Insights, mobile — never on `pnpm dev`.

## Git

- **Never commit or push on your own.** Ask first, or do it when the user says so.
- **Version**: every commit bumps `package.json` semver (fix → patch, feat → minor, breaking → major)
  and ends the message with it: `feat: short summary (v3.4.0)`. Conventional commits (commitlint).
- **Backup before push**: one branch `backup`, on GitHub only (no local copy), holding the previous version.
  Before pushing main, move it to the current remote main:
  ```bash
  git fetch origin
  git push --force origin origin/main:refs/heads/backup
  git push origin main
  ```
- No other branches. Never force-push `main` (`--force` is for `backup` only).
