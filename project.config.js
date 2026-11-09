/**
 * Project settings — the same in every mode.
 *
 * What differs between dev / build / zip (URL, port, minify, sourcemaps,
 * image optimization, sitemap…) lives in .env.development / .env.production /
 * .env.handoff. Restart `pnpm dev` after editing this file or any .env.
 */

export const projectConfig = {
  // Document language → <html lang="@@lang">
  lang: 'en',

  // Inline src/styles/critical.scss into <head> — first-paint styles (preloader, first screen)
  criticalCSS: false,

  // Images — webp is generated next to every jpg/png; avif is opt-in (smaller, slower to encode).
  // Quality applies when OPTIMIZE_IMAGES=true.
  images: {
    webp: { enabled: true, quality: 80 },
    avif: { enabled: false, quality: 60 },
    jpeg: { quality: 80, progressive: true },
    png: { compressionLevel: 9 },
  },

  // SVG sprite from src/assets/sprites/ (inlined into pages that use icons)
  sprites: {
    enabled: true,
    fileName: 'sprite.symbol.svg',
  },

  // Libraries copied from node_modules: .css → dist/styles/vendor/, the rest → dist/scripts/vendor/.
  // `pnpm add <pkg>` first, then enable its <script> in src/html/layouts/_scripts.html.
  vendors: [
    // 'swiper/swiper-bundle.min.js',
    // { from: 'swiper/swiper-bundle.min.css', to: 'swiper.min.css' },
  ],

  // Tailwind CSS (`pnpm tailwind:setup`): 'auto' = on when src/styles/tailwind.css exists
  tailwind: 'auto',

  // Extra PostCSS plugins, applied after Autoprefixer (this file is an ES module):
  //   import postcssCustomMedia from 'postcss-custom-media';
  //   postcssPlugins: [postcssCustomMedia()],
  postcssPlugins: [],

  // Gzip size report in the build log
  sizeReport: true,
};
