# src/

| Folder     | What                                     | Doc                 |
| ---------- | ---------------------------------------- | ------------------- |
| `html/`    | Pages, layouts, components (`@@include`) | `html/CLAUDE.md`    |
| `styles/`  | SCSS entries, tokens, mixins, partials   | `styles/CLAUDE.md`  |
| `scripts/` | Classic scripts (`window.App`), 1:1 copy | `scripts/CLAUDE.md` |
| `assets/`  | Static files (below)                     |                     |

## assets/

- `img/` — images; build optimizes them and adds `.webp` siblings (AVIF opt-in).
- `sprites/` — one SVG per icon → symbol sprite (see `html/CLAUDE.md`).
- `fonts/`, `video/`, `favicon.ico` — copied as-is.
