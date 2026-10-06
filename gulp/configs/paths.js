import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// ─────────────────────────────────────────────────────────────
// Directory & Extension Constants (internal — not user-facing)
// ─────────────────────────────────────────────────────────────

const folders = {
  build: 'dist',
  src: 'src',
  styles: 'styles',
  scripts: 'scripts',
  html: 'html',
  assets: 'assets',
  images: 'img',
  sprites: 'sprites',
  pages: 'pages',
  layouts: 'layouts',
  components: 'components',
};

const extensions = {
  styles: 'scss',
  scripts: 'js',
  html: 'html',
  // Case variants on purpose: camera/Figma exports are often .JPG/.PNG and the glob is case-sensitive
  images: '{jpg,jpeg,png,gif,ico,webp,avif,svg,JPG,JPEG,PNG,GIF,WEBP,AVIF,SVG}',
  rasters: '{jpg,jpeg,png,JPG,JPEG,PNG}',
  sprites: 'svg',
};

// ─────────────────────────────────────────────────────────────
// Computed Paths
// ─────────────────────────────────────────────────────────────

const computedPaths = {
  srcStyles: `${folders.src}/${folders.styles}`,
  srcScripts: `${folders.src}/${folders.scripts}`,
  srcHtml: `${folders.src}/${folders.html}`,
  srcAssets: `${folders.src}/${folders.assets}`,
  srcImages: `${folders.src}/${folders.assets}/${folders.images}`,
  srcSprites: `${folders.src}/${folders.assets}/${folders.sprites}`,
  srcHtmlPages: `${folders.src}/${folders.html}/${folders.pages}`,
  buildStyles: `${folders.build}/${folders.styles}`,
  buildScripts: `${folders.build}/${folders.scripts}`,
  buildAssets: `${folders.build}/${folders.assets}`,
  buildImages: `${folders.build}/${folders.assets}/${folders.images}`,
};

const globs = {
  htmlPages: `${computedPaths.srcHtmlPages}/**/*.${extensions.html}`,
  // Everything except pages: layouts, components and any other included partial
  htmlShared: [
    `${computedPaths.srcHtml}/**/*.${extensions.html}`,
    `!${computedPaths.srcHtmlPages}/**/*.${extensions.html}`,
  ],
  styles: [`${computedPaths.srcStyles}/*.${extensions.styles}`, `!${computedPaths.srcStyles}/_*.${extensions.styles}`],
  stylesWatch: `${computedPaths.srcStyles}/**/*.${extensions.styles}`,
  scripts: `${computedPaths.srcScripts}/**/*.${extensions.scripts}`,
  images: `${computedPaths.srcImages}/**/*.${extensions.images}`,
  rasters: `${computedPaths.srcImages}/**/*.${extensions.rasters}`,
  sprites: `${computedPaths.srcSprites}/**/*.${extensions.sprites}`,
  assets: [
    `${computedPaths.srcAssets}/**/*`,
    `!${computedPaths.srcImages}/**/*.${extensions.images}`,
    `!${computedPaths.srcSprites}/**/*.${extensions.sprites}`,
  ],
};

export const paths = {
  root: rootDir,
  build: folders.build,
  src: folders.src,
  ...computedPaths,
  globs,
};
