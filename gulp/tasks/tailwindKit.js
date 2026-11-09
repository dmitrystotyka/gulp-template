import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { logSuccess, reportFailure } from '../utils/index.js';
import { scssOwnedRule } from './tailwind.js';

/**
 * WordPress handoff kit: makes dist/ (= the theme folder) rebuild its own
 * Tailwind CSS from .php/.html/.js — only the classes those files use.
 * Emitted only for production/handoff builds with Tailwind active.
 * Kit versions are pinned to the Tailwind version the source project uses,
 * so the rebuild inside the theme matches the shipped CSS.
 */

// What the theme scans, relative to dist/tailwind.css (= the theme root).
// Explicit list + source(none): independent of cwd and of any .gitignore,
// and composer's vendor/ or bundled libraries never add classes.
const KIT_SOURCES = [
  "@source './**/*.{php,html,js}';",
  "@source not './vendor';",
  "@source not './node_modules';",
  "@source not './scripts/vendor';",
];

const KIT_README = `# Tailwind CSS — theme kit

\`styles/tailwind.css\` contains only the classes used in this folder's
\`.php\` / \`.html\` / \`.js\` files (\`vendor/\`, \`node_modules/\`, \`scripts/vendor/\` skipped).
Sources and theme tokens: \`tailwind.css\`.

\`\`\`bash
npm install
npm run dev     # watch: rebuilds on every save (milliseconds)
npm run build   # minified, before going live — commit styles/tailwind.css
\`\`\`

No Node on the server/machine? The standalone CLI (one executable, no npm) runs the
same commands: https://github.com/tailwindlabs/tailwindcss/releases —
\`./tailwindcss -i ./tailwind.css -o ./styles/tailwind.css --watch\` / \`--minify\`.

## Rules

- **Full class names only.** \`text-<?= $color ?>-600\` is never found — map to whole strings:
  \`$colors = ['red' => 'text-red-600', 'green' => 'text-green-600'];\`
- **Classes that live in the database** (Gutenberg, ACF, menu classes) are not in any file —
  list them in \`tailwind.css\`: \`@source inline('text-center bg-red-500');\`
- **Overrides**: theme CSS sits in cascade layers (base < components < utilities),
  so a utility class always beats a component rule — no \`!important\` needed.
- **Keep the generated \`@source not inline('btn container …')\`** at the end of \`tailwind.css\`:
  those names belong to the theme CSS — Tailwind's own \`container\` would break the layout.
  A new class in theme CSS that shares a Tailwind name → add it to that line.
- \`npm run dev\` keeps classes you removed until restart; \`npm run build\` is always exact.
- Theme from \`pnpm theme\`: already enqueued (inc/assets.php). Your own theme — enqueue with a cache-busting version:
  \`wp_enqueue_style('tailwind', get_theme_file_uri('styles/tailwind.css'), [], filemtime(get_theme_file_path('styles/tailwind.css')));\`
`;

const installedTailwindRange = () => {
  try {
    const { version } = createRequire(import.meta.url)('tailwindcss/package.json');
    return `^${version}`;
  } catch {
    return '^4';
  }
};

/**
 * Source tailwind.css → kit tailwind.css: path-based @source lines are dropped
 * (they point into src/), `@source inline(…)` safelists stay, the theme's own
 * sources go right after the last @import.
 */
export const toKitCss = (source) => {
  const lines = source
    .split('\n')
    .filter((line) => !/^\s*@source\s+(?:not\s+)?['"]/.test(line))
    .map((line) =>
      /^\s*@import\s+['"]tailwindcss(?:\/utilities(?:\.css)?)?['"]/.test(line) && !line.includes('source(none)')
        ? line.replace(/\s*source\([^)]*\)/, '').replace(/;\s*$/, ' source(none);')
        : line
    );

  const lastImport = lines.findLastIndex((line) => /^\s*@import\s/.test(line));
  lines.splice(lastImport + 1, 0, '', '/* Theme sources (kit) — relative to this file */', ...KIT_SOURCES);

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
};

export const tailwindKit = async () => {
  const { paths, config } = app;

  if (!config.tailwind.active || !config.env.isProd) return;

  let source;
  try {
    source = await fs.readFile(`${paths.srcStyles}/tailwind.css`, 'utf-8');
  } catch (error) {
    reportFailure('Tailwind kit', error);
    return;
  }

  const kitPackage = {
    name: 'tailwind-theme-kit',
    private: true,
    scripts: {
      dev: 'tailwindcss -i ./tailwind.css -o ./styles/tailwind.css --watch',
      build: 'tailwindcss -i ./tailwind.css -o ./styles/tailwind.css --minify',
    },
    devDependencies: {
      '@tailwindcss/cli': installedTailwindRange(),
      tailwindcss: installedTailwindRange(),
    },
  };

  await fs.writeFile(path.join(paths.build, 'tailwind.css'), `${toKitCss(source)}${scssOwnedRule()}`);
  await fs.writeFile(path.join(paths.build, 'package.json'), `${JSON.stringify(kitPackage, null, 2)}\n`);
  await fs.writeFile(path.join(paths.build, 'TAILWIND.md'), KIT_README);
  await fs.writeFile(path.join(paths.build, '.gitignore'), 'node_modules/\n');

  logSuccess('Tailwind theme kit → dist/ (package.json, tailwind.css, TAILWIND.md)');
};
