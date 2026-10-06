import { existsSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only runs for degit-cloned projects (no .git directory).
// Cleans up template-specific files and initializes a fresh project.
if (!existsSync('.git')) {
  const projectName = basename(resolve('.'));

  // Remove template-specific files (CI + Dependabot stay — they are useful in every project)
  for (const file of ['LICENSE']) {
    if (existsSync(file)) {
      rmSync(file, { recursive: true });
    }
  }

  // Reset package.json to a clean project state
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  pkg.name = projectName;
  pkg.version = '1.0.0';
  delete pkg.description;
  delete pkg.author;
  delete pkg.license;
  // Template cleanup is done — from now on `prepare` only installs git hooks
  pkg.scripts.prepare = 'husky || true';
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

  // Self-delete — this script is no longer needed
  try {
    rmSync(fileURLToPath(import.meta.url), { force: true });
  } catch {
    // ignore
  }

  console.log(`\n✅ Project "${projectName}" initialized. Run: git init && pnpm prepare && pnpm dev\n`);
}
