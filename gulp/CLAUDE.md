# gulp/

`gulpfile.js` sets `globalThis.app = { gulp, paths, plugins, config, build }` —
tasks read from it instead of importing configs. Gulp tasks: `dev` · `build` · `preview`.

```
configs/env.js       the only process.env reader: loads .env.local > [.env.handoff] > .env.{mode},
                     parses switches with flag() (mode default when missing). Import before config.js
configs/paths.js     all folders and globs
configs/config.js    merges env + project.config.js into app.config (stable shape tasks read) —
                     shallow copy only, no structuredClone
configs/plugins.js   shared plugin instances
tasks/               one file per task
utils/transforms.js  prettier/terser/lightningcss/sharp/svgo streams, pageMeta, inlineSprite
utils/stream.js      sizeReporter, handleError(title), streamToPromise
utils/cssLayers.js   PostCSS plugin: SCSS entries → cascade layers (Tailwind active only)
utils/logger.js      logBuildEnd → exit 1 when app.build.errors > 0
utils/prepare.js     `prepare` (every install), pure Node — no `||`/`true` (cmd has neither), never fails:
                     fresh copy (name gulp-template, no commits, not CI) → own name + v1.0.0, no LICENSE;
                     then husky hooks when node_modules + .git exist, else a one-line hint
```

## Build modes

|                        | Code     | Images    | Media queries |
| ---------------------- | -------- | --------- | ------------- |
| `pnpm dev`             | readable | as-is     | source order  |
| `pnpm build`           | minified | optimized | sorted        |
| `pnpm zip` (`handoff`) | readable | optimized | source order  |

Same task graph for build and zip — the mode lives only in `.env.*` (`BUILD_TARGET=handoff` loads `.env.handoff`).
`check-dist --mode=handoff` guards that `.env.handoff` really keeps the code readable.

## Rules

- Any failure or skip → `reportFailure`, never a bare warning. Plugin streams: `.on('error', handleError(title))`.
- Incremental: `{ since: gulp.lastRun(task) }`. `html` per page, `htmlAll` on layout/component change.
- Binary `gulp.src` needs `{ encoding: false }`.
- Minify only inside main tasks; no `drop_console`/`pure_funcs`, no `removeRedundantAttributes`/`sortAttributes`.
- `gulp-svg-sprite` uses svgo@2: `cleanupIDs` is correct — don't "fix" it.
- Sprite runs before `html`, which inlines it after `<body>` on pages using `<use href="#…">`
  (`inlineSprite` — external sprite refs are blocked on file://). Icon changes → `sprite` + `htmlAll`.
- Terser runs with `module: false` — sources are classic scripts.
- Tailwind (`SPEC.md` T1–T6): `tasks/tailwind.js` imports `@tailwindcss/postcss` dynamically, fails without
  `source(none)`, runs with `optimize: { minify: false }` (minify = `cssMinify` only), appends
  `scssOwnedRule()` (`@source not inline` of every SCSS class name). SCSS changes re-run it in watch. `utils/cssLayers.js`
  wraps the SCSS entries into layers — only when Tailwind is active, last PostCSS plugin.
  `tasks/tailwindKit.js` (prod/handoff) writes `dist/tailwind.css` (`toKitCss`: src `@source` → theme
  `**/*.{php,html,js}`), `package.json` (`dev` watch / `build`), `TAILWIND.md`, `.gitignore`.
  No CDN/browser build. `tailwind:setup` never patches gulpfile/`_head.html`.
  Test a Tailwind change: back up `package.json` + `pnpm-lock.yaml`, `pnpm tailwind:setup`, run both
  verify passes, then delete `src/styles/tailwind.css` and restore the two files.
- Dev server mirrors Vercel: clean URLs + `404.html`.
