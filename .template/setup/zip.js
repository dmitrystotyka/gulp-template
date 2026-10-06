/**
 * Handoff Archive Script
 * Run: pnpm zip (runs build:handoff + check-dist first)
 *
 * Archives dist/ into <project-name>-<YYYY-MM-DD>.zip at the project root.
 * No dependencies: `tar -a` (bsdtar) ships with macOS, Linux and Windows 10+
 * and writes a portable zip (forward slashes, no OS junk files).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, statSync, readFileSync } from 'node:fs';
import { resolvePath } from '../paths.js';

const dist = resolvePath('dist');

if (!existsSync(dist)) {
  console.error('\n  ✗ dist/ not found — run pnpm build:handoff first\n');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(resolvePath('package.json'), 'utf8'));
const date = new Date().toISOString().slice(0, 10);
const archiveName = `${pkg.name}-${date}.zip`;
const archivePath = resolvePath(archiveName);

rmSync(archivePath, { force: true });

try {
  // -a picks the format from the extension (.zip); -C dist . → contents land
  // at the archive root without a dist/ prefix.
  execFileSync('tar', ['-a', '-cf', archivePath, '--exclude', '.DS_Store', '--exclude', 'Thumbs.db', '-C', dist, '.'], {
    stdio: 'inherit',
  });
} catch (error) {
  console.error(`\n  ✗ Archiving failed: ${error.message}\n`);
  process.exit(1);
}

const sizeKb = Math.round(statSync(archivePath).size / 1024);
console.log(`\n  ✓ ${archiveName} (${sizeKb} KB)\n`);
