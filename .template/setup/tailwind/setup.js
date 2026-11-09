/**
 * Tailwind CSS v4 Setup Script (CLI)
 * Run: pnpm tailwind:setup        (asks first)
 *      pnpm tailwind:setup -y     (no question — CI, scripts)
 *
 * Zero-patch installer: the gulp pipeline natively supports Tailwind and
 * activates itself when src/styles/tailwind.css exists (tailwind: 'auto'
 * in project.config.js). This script only installs packages and copies one file.
 * Safe to re-run: it only does what is missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import * as config from './config.js';
import { resolvePath } from '../../paths.js';

const templatesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates');
const autoYes = process.argv.slice(2).some((arg) => arg === '-y' || arg === '--yes');

// ─────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────

const c = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m' };
const say = (text = '') => console.log(text ? `  ${text}` : '');
const ok = (text) => say(`${c.green}✓${c.reset} ${text}`);
const fail = (text) => say(`${c.red}✗${c.reset} ${text}`);
const row = (label, text) => say(`  ${c.dim}${label.padEnd(12)}${c.reset}${text}`);
const divider = () => say(`${c.dim}${'─'.repeat(50)}${c.reset}`);

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

const entryPath = resolvePath(config.files.entry);
const installedVersion = () => {
  try {
    return JSON.parse(fs.readFileSync(resolvePath('node_modules/tailwindcss/package.json'), 'utf8')).version;
  } catch {
    return null;
  }
};
const packagesInstalled = () =>
  config.packageNames.every((name) => fs.existsSync(resolvePath('node_modules', name, 'package.json')));

const confirm = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${question} (y/N): `, (answer) => {
      rl.close();
      resolve(['y', 'yes'].includes(answer.trim().toLowerCase()));
    });
  });

// ─────────────────────────────────────────────────────────────
// Summary — what the user needs to know, once
// ─────────────────────────────────────────────────────────────

const summary = () => {
  say();
  divider();
  say();
  ok(`${c.bold}Tailwind CSS v${installedVersion() ?? '4'} is on${c.reset}`);
  say();
  say(`${c.cyan}▸${c.reset} Restart ${c.bold}pnpm dev${c.reset} — the pipeline turns on by itself`);
  say();
  row('Config', `${config.files.entry} — @theme tokens, @source paths`);
  row('Scans', 'src/html/ · src/scripts/ only → only classes found there ship');
  row('Class names', 'write them in full: text-red-600, never text-${color}-600');
  row('Safelist', "@source inline('…') — classes that appear in no file");
  row('Overrides', 'utilities beat SCSS components (cascade layers), no !important');
  row('Reset', 'normalize.scss — Tailwind Preflight is off');
  row('WordPress', 'pnpm zip → dist/ kit: npm run dev | build, see TAILWIND.md');
  say();
  row('Turn off', `delete ${config.files.entry} · pnpm remove ${config.packageNames.join(' ')}`);
  row('Docs', config.urls.docs);
  say();
  divider();
  say();
};

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

const setup = async () => {
  const needEntry = !fs.existsSync(entryPath);
  const needPackages = !packagesInstalled();

  say();
  say(`${c.bold}Tailwind CSS v4${c.reset}`);
  say();

  if (!needEntry && !needPackages) {
    ok('Already set up — nothing to do.');
    summary();
    return;
  }

  if (needPackages) say(`• install ${config.packages.join(', ')} (devDependencies)`);
  if (needEntry) say(`• create ${config.files.entry} — turns the pipeline on`);
  say();

  if (!autoYes && !(await confirm('Continue?'))) {
    say();
    say('Cancelled — nothing changed.');
    say();
    return;
  }

  if (needPackages) {
    say();
    try {
      execSync(`pnpm add -D ${config.packages.join(' ')}`, { stdio: 'inherit' });
    } catch {
      say();
      fail('Install failed — nothing else changed. Fix the error above and run again.');
      say();
      process.exitCode = 1;
      return;
    }
    ok(`Installed ${config.packageNames.join(', ')}`);
  }

  if (needEntry) {
    fs.mkdirSync(path.dirname(entryPath), { recursive: true });
    fs.copyFileSync(path.join(templatesDir, 'tailwind.css'), entryPath);
    ok(`Created ${config.files.entry}`);
  }

  summary();
};

setup();
