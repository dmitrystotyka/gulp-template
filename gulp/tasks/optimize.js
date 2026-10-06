import fs from 'fs/promises';
import path from 'path';
import { logSuccess } from '../utils/index.js';

export const sitemap = async () => {
  const { paths, config } = app;

  if (!config.optimization.sitemap) {
    return;
  }

  const hostname = config.site.url;
  const buildDir = paths.build;
  const allFiles = await fs.readdir(buildDir, { recursive: true });
  const htmlFiles = allFiles.filter((f) => f.endsWith('.html')).map((f) => path.join(buildDir, f));

  const urls = await Promise.all(
    htmlFiles
      .filter((file) => !path.basename(file).startsWith('404'))
      .map(async (file) => {
        const relativePath = path.relative(buildDir, file).replace(/\\/g, '/');
        const url = relativePath === 'index.html' ? '' : relativePath.replace(/\.html$/, '');
        const isIndex = relativePath === 'index.html';
        const stat = await fs.stat(file);
        const lastmod = stat.mtime.toISOString().split('T')[0];

        return `  <url>
    <loc>${hostname}/${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${isIndex ? 'weekly' : 'monthly'}</changefreq>
    <priority>${isIndex ? '1.0' : '0.8'}</priority>
  </url>`;
      })
  );

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  await fs.writeFile(path.join(buildDir, 'sitemap.xml'), content, 'utf-8');
  logSuccess('sitemap.xml generated');
};

export const robots = async () => {
  const { paths, config } = app;

  if (!config.optimization.robots) {
    return;
  }

  const lines = ['User-agent: *', 'Allow: /', 'Disallow: /404.html'];

  if (config.optimization.sitemap) {
    lines.push('', `Sitemap: ${config.site.url}/sitemap.xml`);
  }

  await fs.writeFile(path.join(paths.build, 'robots.txt'), `${lines.join('\n')}\n`, 'utf-8');
  logSuccess('robots.txt generated');
};
