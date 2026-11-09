# src/html/

```
pages/              → dist/*.html, keep flat — index (clean start) · template (copy it) · 404 · demo (deletable)
layouts/            _head · _header · _footer · _modals · _scripts
components/         _button · _icon · _picture
components/modals/  everything modal: _frame-start + _frame-end (shared frame) · one file per modal (_demo — demo only)
```

## Formatting — by hand, Prettier is off here

`src/html/` is in `.prettierignore`: Prettier glues neighbouring `@@include` lines into one
line and breaks `@@if` inside tags. Write it like this and it stays like this:

```text
<body>
  <div class="wrapper">
    @@include('layouts/_header.html')

    <main class="page">…</main>

    @@include('layouts/_footer.html')
  </div>
</body>
```

- 2-space indent, one `@@include` per line, multi-line JSON params are fine.
- `dist/` is still formatted (build runs Prettier on the output) and validated (`pnpm validate`).

## New page

Copy `pages/template.html`. `<html lang="@@lang">`, then the head include:

```text
@@include('layouts/_head.html', {
  "title": "About",
  "description": "About page description",
  "image": "./assets/img/previews/global.webp"
})
```

`image` stays relative — the build makes it absolute and adds canonical + `og:url`.
Links between pages: `./about.html` (works from file:// and on Vercel).

## Components

```text
Button — only "text" required; href · type · variant (outline) · icon · popup · close · class
  @@include('components/_button.html', {"text": "Send", "type": "submit"})
  @@include('components/_button.html', {"text": "More", "href": "./about.html", "variant": "outline", "icon": "arrow-right"})
  @@include('components/_button.html', {"text": "Call me", "popup": "callback"})     ← opens #callback
  @@include('components/_button.html', {"text": "Close", "close": "true"})            ← inside a modal

Icon — file name from src/assets/sprites/
  @@include('components/_icon.html', {"name": "arrow-right"})

Picture — all params required, .webp is generated
  @@include('components/_picture.html', {"src": "./assets/img/photo", "ext": "jpg", "alt": "…",
    "class": "", "loading": "lazy", "width": "1200", "height": "675"})
```

## Modals — one file each

Everything about a modal lives in `components/modals/_<name>.html`: id, title, content.

```text
components/modals/_callback.html
  @@include('components/modals/_frame-start.html', {"id": "callback", "title": "Call me"})
        <form>…</form>
  @@include('components/modals/_frame-end.html')
```

1. Copy `components/modals/_demo.html` → `_callback.html`, set `id` / `title`, write the content.
2. Include the file: every page → `layouts/_modals.html`; one page → that page, after `_modals.html`.
   `@@include('components/modals/_callback.html')`
3. Open it: `@@include('components/_button.html', {"text": "Call me", "popup": "callback"})`.

The frame (close button, title, wrappers) is only in `modals/_frame-start` / `_frame-end` — change it there once.

## Writing a component

- Required params: plain `@@name`. Optional: `@@if (context.name) {…}` — otherwise a missing
  param stays in the HTML as literal `@@name`.
- Document params in a `<!--- … --->` comment at the top: three dashes = source-only,
  stripped by the build. Normal `<!-- -->` reach `dist/`.
- Never put `@@include` inside a comment — it is still executed.
- Done when `pnpm build && pnpm validate` pass.

## Scripts

Every page ends with `@@include('layouts/_scripts.html')` — the one place to enable
components and vendors (uncomment a `<script defer>` line). Never `type="module"`.

## `@@if` context

`tailwind` · `criticalCss` · `lang` · `siteUrl`.

## Tailwind classes

Tailwind scans `src/html/` and `src/scripts/` as plain text — write **full class names**,
never build them from parts (`text-@@color-600` is not found; pass the whole `"text-red-600"`).
A class that appears in no file → `@source inline('…')` in `src/styles/tailwind.css`.
