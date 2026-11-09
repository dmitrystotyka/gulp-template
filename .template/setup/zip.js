/**
 * Archive Script
 *   pnpm zip    → dist/      → <project>-<YYYY-MM-DD>.zip           (static HTML handoff)
 *   pnpm theme  → wp-theme/  → <project>-wp-theme-<YYYY-MM-DD>.zip  (files inside <slug>/,
 *                 so WordPress "Upload Theme" creates the theme folder)
 * Options: --dir=<folder> --suffix=<name part> --root (wrap files in the theme slug folder)
 *
 * Pure Node (zlib) — no tar/zip binary, so it behaves the same in PowerShell,
 * Git Bash, macOS and Linux (GNU tar cannot write zip archives).
 */

import { deflateRawSync, crc32 } from 'node:zlib';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { resolvePath } from '../paths.js';
import { themeSlug } from './theme/slug.js';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const dirName = arg('dir') ?? 'dist';
const dist = resolvePath(dirName);
const SKIP = new Set(['.DS_Store', 'Thumbs.db']);

if (!existsSync(dist)) {
  console.error(`\n  ✗ ${dirName}/ not found — run pnpm ${dirName === 'dist' ? 'zip' : 'theme'}\n`);
  process.exit(1);
}

const pkgName = JSON.parse(readFileSync(resolvePath('package.json'), 'utf8')).name;
const rootPrefix = process.argv.includes('--root') ? `${themeSlug(pkgName)}/` : '';

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : SKIP.has(e.name) ? [] : [join(dir, e.name)]
  );

// MS-DOS date/time used by the zip format
const dosDateTime = (date) => ({
  time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
});

const locals = [];
const centrals = [];
let offset = 0;

for (const file of walk(dist)) {
  const name = Buffer.from(rootPrefix + relative(dist, file).split(sep).join('/'));
  const data = readFileSync(file);
  const deflated = deflateRawSync(data, { level: 9 });
  const stored = deflated.length >= data.length; // already-compressed files (webp, woff2…)
  const body = stored ? data : deflated;
  const { time, date } = dosDateTime(statSync(file).mtime);
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(stored ? 0 : 8, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(date, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);

  locals.push(local, name, body);
  centrals.push(central, name);
  offset += local.length + name.length + body.length;
}

const centralDir = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(centrals.length / 2, 8);
end.writeUInt16LE(centrals.length / 2, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(offset, 16);

const suffix = arg('suffix') ? `-${arg('suffix')}` : '';
const archiveName = `${themeSlug(pkgName)}${suffix}-${new Date().toISOString().slice(0, 10)}.zip`;
const archive = Buffer.concat([...locals, centralDir, end]);

writeFileSync(resolvePath(archiveName), archive);
console.log(`\n  ✓ ${archiveName} (${centrals.length / 2} files, ${Math.round(archive.length / 1024)} KB)\n`);
