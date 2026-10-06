import fs from 'node:fs';
import path from 'node:path';
import { logWarning } from './logger.js';

/**
 * Creates an unlink handler for gulp.watch that removes the corresponding
 * build file, its .map sourcemap and optional derived siblings (.webp/.avif).
 *
 * @param {string} srcBase - Source base directory
 * @param {string} buildBase - Build output directory
 * @param {Object} extMap - Extension mapping (e.g. { '.scss': '.css' })
 * @param {string[]} siblingExts - Derived sibling extensions to remove (e.g. ['.webp', '.avif'])
 */
export const createUnlinkHandler = (srcBase, buildBase, extMap = {}, siblingExts = []) => {
  return (filePath) => {
    try {
      const relative = path.parse(path.relative(srcBase, filePath));
      // Swap only the extension itself — never string-replace inside the path
      const ext = extMap[relative.ext] ?? relative.ext;
      const buildPath = path.join(buildBase, relative.dir, `${relative.name}${ext}`);
      const targets = [buildPath, `${buildPath}.map`];

      for (const siblingExt of siblingExts) {
        targets.push(path.join(buildBase, relative.dir, `${relative.name}${siblingExt}`));
      }

      for (const target of targets) {
        fs.rmSync(target, { force: true });
      }
    } catch (error) {
      logWarning(`Unlink handler failed for ${filePath}: ${error.message}`);
    }
  };
};
