/**
 * Tailwind Setup Configuration
 */

// Directory names (mirrors gulp/configs/paths.js)
export const folders = {
  src: 'src',
  styles: 'styles',
};

// Tailwind v4, CSS-first config. `pnpm remove` uses the bare names.
export const packages = ['tailwindcss@^4', '@tailwindcss/postcss@^4'];
export const packageNames = packages.map((spec) => spec.replace(/@[^@/]+$/, ''));

// Creating this file activates the Tailwind pipeline (tailwind: 'auto' in project.config.js)
export const files = {
  entry: `${folders.src}/${folders.styles}/tailwind.css`,
};

export const urls = {
  docs: 'https://tailwindcss.com/docs',
};
