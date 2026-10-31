// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function generateSitemapXml(urls: string[], baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const items = urls
    .map((url) => {
      const loc = url.startsWith('http') ? url : `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>\n`;
}

export function generateRobotsTxt(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `User-agent: *
Allow: /

Sitemap: ${cleanBase}/sitemap.xml
`;
}
