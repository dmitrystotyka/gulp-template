# src/styles/

```
normalize · vars · fonts · utils · ui · main .scss   → dist/styles/*.css (load order in _head.html)
critical.scss      first-paint styles (preloader, first screen) — inlined into <head>, never a file
vars.scss          design tokens, Tailwind naming
_mixins.scss       rem(), em(), fluid(), alpha(), media-up/down/between, hover, $breakpoints
components/        layout blocks → main.scss   (register in components/_index.scss)
ui/                buttons, icons… → ui.scss   (register in ui/_index.scss)
tailwind.css       optional — its presence turns the Tailwind pipeline on
```

## Sizes — always `rem()` / `em()`

Write the px from the design, the function converts:

```scss
font-size: rem(18); // 1.125rem
padding: rem(12 24); // 0.75rem 1.5rem
margin: rem(0 auto); // 0 auto
box-shadow: rem(0, 1, 2, -1) …; // negatives → comma form
letter-spacing: em(1); // relative to the element's font-size
font-size: fluid(24, 48); // 24px → 48px between 375 and 1230 viewport
```

Raw `px` / `rem` / `em` fail Stylelint. Exceptions: `_mixins.scss` (media queries), fallbacks inside `var()`.

## Tokens — Tailwind naming (`vars.scss`)

| Group      | Token                                            | Example                         |
| ---------- | ------------------------------------------------ | ------------------------------- |
| Palette    | `--color-<hue>-<50…950>`, `--color-white`        | `var(--color-red-300)`          |
| Opacity    | `alpha(<token>, <0–100>)`                        | `alpha(gray-950, 60)`           |
| Roles      | `--color-text · bg · accent · error · success`   | `var(--color-accent)`           |
| Font       | `--font-sans`                                    | `font-family: var(--font-sans)` |
| Text size  | `--text-<xs…6xl>` + `--text-<size>--line-height` | `var(--text-lg)`                |
| Weight     | `--font-weight-<normal·medium·semibold·bold>`    | `var(--font-weight-bold)`       |
| Leading    | `--leading-<tight·snug·normal·relaxed>`          | `var(--leading-tight)`          |
| Radius     | `--radius-<xs…2xl·full>`                         | `var(--radius-md)`              |
| Shadow     | `--shadow-<sm·md·lg>`                            | `var(--shadow-md)`              |
| Duration   | `--duration-<150·300·500>` (ms, read by JS)      | `var(--duration-300)`           |
| Layout / z | `--container-*`, `--header-height`, `--z-*`      |                                 |

```scss
.title {
  font-size: var(--text-2xl);
  line-height: var(--text-2xl--line-height);
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-900);
}
```

## Colors

Values are copied from Tailwind v4 (`oklch(…)`) — `--color-gray-950` is exactly Tailwind's `gray-950`.

```scss
color: var(--color-gray-950); // text-gray-950
background-color: alpha(gray-950, 60); // bg-gray-950/60
border-color: alpha(white, 20); // border-white/20
```

- `alpha()` compiles to `color-mix(in oklab, var(--color-gray-950) 60%, transparent)` — what Tailwind emits.
- Hex, named colors and `rgb()/hsl()` fail Stylelint outside `vars.scss` (hex also allowed in `critical.scss` fallbacks).
- New hue: copy its 11 lines from Tailwind's `theme.css` (Context7 → tailwindcss) into `vars.scss`.
- Components use roles (`--color-accent`) where the meaning matters, palette shades for the rest.
- With Tailwind installed, the same names mean the same tokens (`text-red-300` ↔ `var(--color-red-300)`);
  override them in the `@theme` block of `tailwind.css`.

## critical.scss

The first CSS the browser applies — inlined into `<head>` (`criticalCSS: true` in project.config.js).
Only what must paint instantly: preloader, first-screen skeleton, page background.
`vars.css` isn't loaded yet → every token needs a fallback: `var(--color-white, #fff)`.
A ready preloader example is in the file.

## Rules

- Media queries only through the mixins (`@include media-down(md)`) — never hardcoded.
- New partial → `@forward` in its `_index.scss` (no glob imports). Folder names lowercase.
- `!important` needs `/* stylelint-disable-next-line declaration-no-important -- why */`.

## With Tailwind (`tailwind.css` exists)

```css
@layer properties, theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities) source(none); /* required — build fails without it */
@source '../html/**/*.html'; /* by extension: CLAUDE.md next to the sources is never scanned */
@source '../scripts/**/*.js';
@source inline('text-center'); /* safelist: classes that appear in no file */
```

- **SCSS owns its class names.** The build collects every `.class` from `src/styles/**/*.scss` and adds
  `@source not inline('btn container …')` — Tailwind never emits a same-named utility (its `container`
  would override our `.container` max-width). The kit gets the same line. Nothing to maintain.
- Tailwind reads files as plain text: words in JS/comments (`hidden`, `fixed`) can add a tiny unused
  rule — harmless, never a conflict with SCSS (see above).
- `pnpm dev` keeps classes you removed until restart (Tailwind's incremental cache); `pnpm build` is always exact.

- **No Preflight** — `normalize.scss` stays the one reset. Don't import `tailwindcss` or `preflight.css`.
- **Layers are added by the build** (`gulp/utils/cssLayers.js`): vars → `theme`, normalize/fonts → `base`,
  ui/main → `components`, utils → `utilities`. So a utility beats a component: `class="btn mt-4"` works.
  Don't write `@layer` in SCSS. Unlayered and stronger than utilities: `critical.scss` (inline) and vendor CSS.
- New SCSS entry → add it to `ENTRY_LAYERS` in `cssLayers.js`, otherwise it stays unlayered.
- Custom token used as a utility (`text-accent`) → also declare it in `@theme` (`--color-accent: …`).
- `@source` paths: one per line, relative to `tailwind.css`; the handoff kit replaces them with the theme's paths.
