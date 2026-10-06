import fs from 'fs';
import path from 'path';
import { logServerStart, logWarning } from '../utils/index.js';

export const server = () => {
  const { plugins, paths, config } = app;

  plugins.browserSync.init(
    {
      server: {
        baseDir: paths.build,
        // Clean URLs like the Vercel deploy (`cleanUrls: true`): /about → about.html
        serveStaticOptions: { extensions: ['html'] },
      },
      port: config.server.port,
      notify: false,
      open: config.server.open ?? true,
      cors: true,
      logLevel: 'silent',
      middleware: [
        // Serve 404.html for unmatched pages (dev only)
        (req, res, next) => {
          let url;
          try {
            url = decodeURIComponent(req.url.split('?')[0]);
          } catch {
            return next();
          }

          // Only page requests: extensionless or explicit .html
          const ext = path.extname(url);
          if (ext && ext !== '.html') return next();

          // Reject path traversal — only look up files inside the build dir
          const buildRoot = path.resolve(paths.build);
          const resolved = path.resolve(buildRoot, `.${path.posix.normalize(`/${url}`)}`);
          if (resolved !== buildRoot && !resolved.startsWith(buildRoot + path.sep)) return next();

          if (fs.existsSync(resolved) || fs.existsSync(`${resolved}.html`)) return next();

          const page404 = path.join(paths.build, '404.html');
          if (fs.existsSync(page404)) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end(fs.readFileSync(page404, 'utf-8'));
          }

          next();
        },
      ],
    },
    (err, bs) => {
      if (err) {
        logWarning(`Server failed to start: ${err.message}`);
        return;
      }

      // BrowserSync silently takes the next free port — log the real one
      const urls = bs.options.get('urls');
      logServerStart(bs.options.get('port'), urls?.get('external'));
    }
  );
};
