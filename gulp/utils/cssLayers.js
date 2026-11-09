import path from 'node:path';

/**
 * Cascade layers for the SCSS entries — only while Tailwind is active.
 *
 * Tailwind v4 emits its utilities inside `@layer utilities`; unlayered CSS
 * always beats layered CSS, so without this `class="btn mt-4"` would lose the
 * margin to `.btn`. Each compiled entry is wrapped into the layer below, in
 * Tailwind's own order: properties < theme < base < components < utilities.
 * `properties` (Tailwind's --tw-* fallbacks for older Safari/Firefox ESR) must
 * stay first — declared later it would override utilities like border-dashed.
 * Vanilla builds (no Tailwind) stay unlayered — nothing changes there.
 */
export const LAYER_ORDER = 'properties, theme, base, components, utilities';

export const ENTRY_LAYERS = {
  vars: 'theme',
  normalize: 'base',
  fonts: 'base',
  ui: 'components',
  main: 'components',
  utils: 'utilities',
};

// Must stay outside any @layer block (@charset first, @import before other rules)
const TOP_LEVEL = new Set(['charset', 'import']);

export const cssLayers = () => ({
  postcssPlugin: 'gulp-template-css-layers',
  Once(root, { AtRule, result }) {
    const file = result.opts.from || root.source?.input.file || '';
    const layer = ENTRY_LAYERS[path.basename(file, path.extname(file))];
    if (!layer) return;

    const top = [];
    const body = [];
    root.each((node) => {
      (node.type === 'atrule' && TOP_LEVEL.has(node.name) ? top : body).push(node);
    });

    const block = new AtRule({ name: 'layer', params: layer, source: root.source });
    block.append(body);

    // The order statement repeats in every file on purpose: whichever stylesheet
    // the browser parses first fixes the order, and it is always the same one.
    root.removeAll();
    root.append(...top, new AtRule({ name: 'layer', params: LAYER_ORDER, source: root.source }), block);
  },
});
cssLayers.postcss = true;
