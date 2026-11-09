# src/scripts/

```
utils/        dom ($, $$, on, exists) · debounce (debounce, throttle) · bodyLock
components/   modals · spollers · sliders · headerScroll · dynamicAdapt (opt-in)
app.js        your code — loaded last, everything is ready on window.App
```

Turn components on/off in `src/html/layouts/_scripts.html` (order there = run order).

## Rules

- **Classic scripts, not modules** — `dist/` must work from file://, where browsers block
  `type="module"`. No `import`/`export` (`check-dist` fails on them).
- File shape: `(() => { 'use strict'; const App = (window.App = window.App || {}); … })();`
  Share through `App` (`App.debounce`, `App.modal`), read with `const { bodyLock } = App;`.
- Copied 1:1 to `dist/` — no bundler, no transpiler. Comments in English.
- Libraries: `pnpm add <pkg>` → list the file in `vendors` (`project.config.js`) →
  uncomment/add its `<script defer>` in `_scripts.html` before the components.
