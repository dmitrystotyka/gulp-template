# src/html/

```
pages/              → dist/*.html, keep flat — index (starter components section — delete when you start) · 404
layouts/            _head · _header · _footer · _modals · _scripts
components/         _button · _icon · _picture
components/modals/  everything modal: _frame-start + _frame-end (shared frame) · one file per modal (_example — copy it)
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

`pnpm page about "About us"` → `pages/about.html` (index.html without "Starter components", title set).
By hand: copy `pages/index.html`, delete that section. `<html lang="@@lang">`, then the head include:

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

1. Copy `components/modals/_example.html` → `_callback.html`, set `id` / `title`, write the content.
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

`tailwind` · `criticalCss` · `lang` · `siteUrl` · `basePath` (site root path from `SITE_URL`, e.g. `/`).

## WordPress theme (`pnpm theme`)

Every page is split at `<main>`: before → `header.php`, after → `footer.php`, `<main>` → `front-page.php`
(index) · `404.php` · `page-<name>.php`. So, in every page:

- exactly one `<main>…</main>`; everything before it identical on all pages (layouts only);
- page-only markup after `</main>` (a modal include) is fine — it goes into that page's template;
- CSS/JS only through `_head.html` / `_scripts.html` (one list → `inc/assets.php`);
- links `./about.html` → `home_url('/about/')`, `./assets/…` → `get_theme_file_uri()` — automatic.

`pnpm theme` fails with the page name when a rule is broken. Spec: `SPEC.md` W1–W6.

## 404

`pages/404.html` is served by the host for **any** missing URL, also nested (`/blog/post/x`).
Its first `<script>` adds `<base href="@@basePath">` so `./styles/…` resolve from the site root —
keep it the first thing in `<head>`; skipped on file://. Vercel and `pnpm dev` serve it automatically;
Apache: `ErrorDocument 404 /404.html`; nginx: `error_page 404 /404.html;`.
WordPress ignores it (WP uses `404.php`) — the WP developer turns it into `404.php`.

## Tailwind classes

Same page, Tailwind flavour — layout blocks and components stay SCSS (`.container`, `.btn`, `.popup`;
Tailwind never generates utilities with those names), utilities go on top:

```text
<main class="page">
  <section class="py-16 md:py-24">
    <div class="container">
      <h1 class="text-4xl font-bold">About</h1>
      <p class="mt-4 max-w-prose text-gray-600">…</p>
      @@include('components/_button.html', {"text": "Contact", "href": "./contact.html", "class": "mt-8"})
    </div>
  </section>
</main>
```


Tailwind scans `src/html/` and `src/scripts/` as plain text — write **full class names**,
never build them from parts (`text-@@color-600` is not found; pass the whole `"text-red-600"`).
A class that appears in no file → `@source inline('…')` in `src/styles/tailwind.css`.
