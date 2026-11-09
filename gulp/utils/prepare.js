/**
 * `prepare` (runs on every `pnpm install`, or by hand: `pnpm prepare`).
 * Pure Node, no shell syntax — works the same in cmd, PowerShell, Git Bash, macOS, Linux.
 * Never fails the install: every problem becomes a one-line hint.
 *
 * 1. Fresh copy of the template (degit / zip, no commits yet) → becomes your project:
 *    package.json gets the folder name and v1.0.0, template LICENSE is removed.
 *    Works in any order: before or after `git init`, before or after `pnpm install`.
 * 2. Git hooks (husky) once dependencies are installed and a git repo exists.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const TEMPLATE_NAME = 'gulp-template';
const say = (icon, text) => console.log(`  ${icon} ${text}`);

const hasCommits = () => {
  try {
    execSync('git rev-parse --verify HEAD', { stdio: 'ignore' });
    return true;
  } catch {
    return false; // no git, no repo, or `git init` without a commit yet
  }
};

// CI / Vercel build the template repo itself (Vercel ships no .git) — never rename it there.
// Install hook, not the gulp pipeline: the env.js-only rule for process.env doesn't apply.
const isCi = Boolean(process.env.CI || process.env.VERCEL);

// ── 1. Fresh copy → own project ──────────────────────────────

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

if (pkg.name === TEMPLATE_NAME && !isCi && !hasCommits()) {
  const projectName = basename(resolve('.'))
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-');

  pkg.name = projectName;
  pkg.version = '1.0.0';
  delete pkg.description;
  delete pkg.author;
  delete pkg.license;
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  rmSync('LICENSE', { force: true });

  console.log('');
  say('✓', `Project "${projectName}" initialized (package.json v1.0.0)`);
}

// ── 2. Git hooks ─────────────────────────────────────────────

if (!existsSync('node_modules/husky')) {
  say('→', 'Dependencies not installed yet — run: pnpm install');
} else if (!existsSync('.git')) {
  say('→', 'No git repo yet — run: git init && pnpm prepare  (enables the git hooks)');
} else {
  const { default: husky } = await import('husky');
  // '' = installed; otherwise a reason (e.g. "HUSKY=0 skip install")
  const message = husky();
  say(message ? '−' : '✓', message ? `Git hooks: ${message}` : 'Git hooks enabled (pre-commit, commit-msg, pre-push)');
}
