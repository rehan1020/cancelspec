// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = resolve(process.argv[2] || join(process.cwd(), 'site'));
const SUBPATH = process.env.SUBPATH || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

export function createPreviewServer(options = {}) {
  const root = resolve(options.root || ROOT);
  const subpath = options.subpath || SUBPATH;

  return createServer((req, res) => {
    let urlPath = req.url ? req.url.split('?')[0] : '/';

    // Handle subpath prefix if configured
    if (subpath) {
      const cleanSub = subpath.replace(/\/+$/, '');
      if (urlPath === cleanSub || urlPath === `${cleanSub}/`) {
        urlPath = '/';
      } else if (urlPath.startsWith(`${cleanSub}/`)) {
        urlPath = urlPath.slice(cleanSub.length);
      }
    }

    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

    let filePath = join(root, urlPath);

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }

    if (!existsSync(filePath)) {
      const notFoundPage = join(root, '404.html');
      if (existsSync(notFoundPage)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(notFoundPage));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const data = readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Error: ${err}`);
    }
  });
}

const server = createPreviewServer();

// Start automatically when run directly as CLI script
if (process.argv[1] && process.argv[1].endsWith('serve.js')) {
  server.listen(PORT, HOST, () => {
    const base = SUBPATH ? `${SUBPATH}/` : '';
    console.log(`\nCancelSpec local preview server running!`);
    console.log(`  Serving: ${ROOT}`);
    console.log(`  URL:     http://${HOST}:${PORT}/${base}`);
    console.log(`  Tool:    http://${HOST}:${PORT}/${base}tool/\n`);
  });
}
