import pkg from '../../package.json' with { type: 'json' };
import { env } from '../configs/env.js';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const c = colors;
const divider = (char = '─', length = 50) => `${c.dim}${char.repeat(length)}${c.reset}`;

let buildStartTime = 0;

const modeColors = { development: c.yellow, production: c.green, handoff: c.cyan };
const getEnvInfo = () => ({ mode: env.mode, color: modeColors[env.mode] ?? c.white });

export const logBuildStart = (done) => {
  const info = getEnvInfo();
  buildStartTime = Date.now();

  console.log('');
  console.log(divider());
  console.log('');
  console.log(`  ${c.cyan}◆${c.reset} ${c.bold}${pkg.name}${c.reset} ${c.dim}v${pkg.version}${c.reset}`);
  console.log(`  ${c.dim}Mode:${c.reset} ${info.color}${info.mode}${c.reset}`);
  console.log('');
  console.log(divider());
  console.log('');

  done();
};

/**
 * Final build step. Fails the gulp run (exit code 1) when any task reported
 * an error — a broken Sass file or include must never produce a "successful"
 * build with missing output. Watch mode never reaches this step.
 */
export const logBuildEnd = (done) => {
  const elapsed = Date.now() - buildStartTime;
  const seconds = (elapsed / 1000).toFixed(2);
  const errors = app.build?.errors ?? 0;

  console.log('');
  console.log(divider());
  console.log('');

  if (errors > 0) {
    console.log(
      `  ${c.red}✗${c.reset} ${c.bold}Build failed${c.reset} ${c.dim}— ${errors} error(s) in ${seconds}s${c.reset}`
    );
    console.log('');
    console.log(divider());
    console.log('');
    done(new Error(`Build failed with ${errors} error(s)`));
    return;
  }

  console.log(`  ${c.green}✓${c.reset} ${c.bold}Build completed${c.reset} ${c.dim}in ${seconds}s${c.reset}`);
  console.log(`  ${c.dim}Output:${c.reset} ${c.cyan}./${app.paths.build}/${c.reset}`);
  console.log('');
  console.log(divider());
  console.log('');
  done();
};

export const logServerStart = (port, externalUrl) => {
  const info = getEnvInfo();

  console.log('');
  console.log(divider());
  console.log('');
  console.log(`  ${c.green}✓${c.reset} ${c.bold}Server started${c.reset}`);
  console.log('');
  console.log(`  ${c.cyan}▸${c.reset} Local:   ${c.bold}http://localhost:${port}${c.reset}`);
  if (externalUrl) {
    console.log(`  ${c.cyan}▸${c.reset} Network: ${c.bold}${externalUrl}${c.reset}`);
  }
  console.log(`  ${c.cyan}▸${c.reset} Mode:    ${info.color}${info.mode}${c.reset}`);
  console.log('');
  console.log(divider());
  console.log('');
};

export const logSuccess = (message) => {
  console.log(`  ${c.green}✓${c.reset} ${message}`);
};

export const logWarning = (message) => {
  console.log(`  ${c.yellow}⚠${c.reset} ${message}`);
};

export const logError = (title, error) => {
  const message = error?.message || String(error);
  console.log(`  ${c.red}✗${c.reset} ${c.bold}${title}${c.reset} ${c.red}${message}${c.reset}`);
};

/**
 * Record a task failure. Logs it and counts it so `logBuildEnd` can fail
 * one-shot builds; in watch mode the count is informational only.
 */
export const reportFailure = (title, error) => {
  logError(title, error);
  if (app.build) app.build.errors += 1;
};
