import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { logSuccess, reportFailure } from '../utils/index.js';

/**
 * Copy prebuilt library files from node_modules into dist so the handoff
 * works offline and stays hand-editable (see `vendors` in project.config.js).
 * `.css` files go to dist/styles/vendor/, everything else to dist/scripts/vendor/.
 */
export const vendors = async () => {
  const { paths, config } = app;

  const entries = (config.vendors || []).map((entry) => (typeof entry === 'string' ? { from: entry } : entry));
  if (!entries.length) return;

  let copied = 0;

  for (const { from, to } of entries) {
    const srcPath = path.join(paths.root, 'node_modules', from);

    if (!existsSync(srcPath)) {
      reportFailure(
        'Vendors',
        new Error(`not found: node_modules/${from} — install the package first (pnpm add <package>)`)
      );
      continue;
    }

    const isCss = from.endsWith('.css');
    const destDir = path.join(isCss ? paths.buildStyles : paths.buildScripts, 'vendor');
    const destPath = path.join(destDir, to || path.basename(from));

    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(srcPath, destPath);

    // Bring the sourcemap along when the package ships one next to the file
    if (existsSync(`${srcPath}.map`)) {
      await fs.copyFile(`${srcPath}.map`, `${destPath}.map`);
    }

    copied++;
  }

  if (copied) {
    logSuccess(`Vendors: ${copied} file${copied > 1 ? 's' : ''} → vendor/`);
  }
};
