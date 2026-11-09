/**
 * New page from the home page (without its "Starter components" section).
 * Run: pnpm page about            → src/html/pages/about.html, title "About"
 *      pnpm page about "About us" → custom title
 * In the WordPress theme it becomes page-about.php on the next `pnpm theme`.
 */

import fs from 'node:fs';
import { resolvePath } from '../paths.js';

const [name, ...titleWords] = process.argv.slice(2);
const exit = (message) => {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
};

if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
  exit('Usage: pnpm page <name> ["Title"] — name in kebab-case: about, contact-us');
}
if (['index', '404'].includes(name)) exit(`"${name}" is reserved`);

const pagesDir = resolvePath('src/html/pages');
const target = `${pagesDir}/${name}.html`;
if (fs.existsSync(target)) exit(`src/html/pages/${name}.html already exists`);

const title = titleWords.join(' ') || name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const json = (text) => JSON.stringify(text).slice(1, -1); // inside "…" of @@include params
const html = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const source = fs.readFileSync(`${pagesDir}/index.html`, 'utf8');
const page = source
  // Starter components section (comment + its <section>) and the example modal it opens
  .replace(/\n(?:[ \t]*\n)*[ \t]*<!-- Starter components[\s\S]*?<\/section>\n/, '\n')
  .replace(/\n[ \t]*@@include\('components\/modals\/_example\.html'\)/, '')
  // @@title lands in <title> and meta content as-is — pass it HTML-escaped
  .replace(/("title":\s*)"[^"]*"/, `$1"${json(html(title))}"`)
  .replace(/("description":\s*)"[^"]*"/, '$1""')
  .replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${html(title)}</h1>`);

fs.writeFileSync(target, page);

console.log(`
  ✓ src/html/pages/${name}.html — "${title}"

    Open:    pnpm dev → http://localhost:3000/${name}
    Link:    <a href="./${name}.html">${html(title)}</a>
    Fill:    "description" in the head include, content inside <main>
    WP:      pnpm theme → wp-theme/page-${name}.php (WordPress page with slug "${name}")
`);
