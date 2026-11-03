// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  createReleaseBundle,
  loadAllPlaybooks,
  serializeDeterministicJson,
} from '@cancelspec/core';
import { CATEGORIES, REGIONS, type CompiledPlaybook } from '@cancelspec/spec';
import { loadProjectConfig, type ProjectConfig } from './config.js';
import { buildClientBundles } from './generator/client_bundles.js';
import { generateCloudflareHeaders } from './generator/headers.js';
import { generateRobotsTxt, generateSitemapXml } from './generator/sitemap.js';
import { generateMainCss } from './generator/styles.js';
import { renderChangelogPage } from './templates/changelog.js';
import { renderContributePage } from './templates/contribute.js';
import { renderHallOfShamePage } from './templates/hall_of_shame.js';
import { renderHomePage } from './templates/home.js';
import {
  renderCategoryIndexPage,
  renderRegionIndexPage,
  renderServicesIndexPage,
} from './templates/indexes.js';
import { renderMethodologyPage } from './templates/methodology.js';
import { renderNotFoundPage } from './templates/not_found.js';
import { renderPolicyPage, type PolicyData } from './templates/policy.js';
import { renderSearchPage } from './templates/search.js';
import { renderServicePage } from './templates/service.js';
import { renderSpecDocsPage } from './templates/spec_docs.js';
import { renderToolPage } from './templates/tool.js';

export interface SiteBuilderOptions {
  playbooksDir: string;
  outDir: string;
  config?: ProjectConfig | undefined;
  referenceDate?: Date | undefined;
  quiet?: boolean | undefined;
  includeDrafts?: boolean | undefined;
}

export interface BuildReport {
  pagesCount: number;
  totalBytes: number;
  urls: string[];
}

export function computeRelativeRoot(relativeFilePath: string): string {
  const normalized = relativeFilePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const depth = segments.length - 1;
  return depth === 0 ? './' : '../'.repeat(depth);
}

export function relativizeHtml(html: string, rootRel: string): string {
  return html.replace(/(href|src|action)="\/([^"]*)"/g, (match, attr, path) => {
    if (path.startsWith('/')) return match;
    if (!path) return `${attr}="${rootRel}index.html"`;
    if (path.endsWith('/')) return `${attr}="${rootRel}${path}index.html"`;
    return `${attr}="${rootRel}${path}"`;
  });
}

function writePage(outDir: string, relativePath: string, content: string): number {
  const filePath = join(outDir, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  let finalContent = content;
  if (relativePath.endsWith('.html')) {
    const rootRel = computeRelativeRoot(relativePath);
    finalContent = relativizeHtml(content, rootRel);
  }
  writeFileSync(filePath, finalContent, 'utf8');
  return Buffer.byteLength(finalContent, 'utf8');
}

export function buildSite(options: SiteBuilderOptions): BuildReport {
  if (options.includeDrafts && !options.quiet) {
    console.warn(
      '⚠️  WARNING: --include-drafts is enabled for local preview only. This output contains unverified drafts and must NEVER be deployed to production!',
    );
  }

  const outDir = options.outDir;
  const config = options.config || loadProjectConfig();
  const playbooks = loadAllPlaybooks(options.playbooksDir, {
    referenceDate: options.referenceDate,
    includeDrafts: options.includeDrafts,
  });

  const urls: string[] = [];
  let pagesCount = 0;
  let totalBytes = 0;

  function trackPage(urlPath: string, relativeFilePath: string, html: string) {
    const bytes = writePage(outDir, relativeFilePath, html);
    urls.push(urlPath);
    pagesCount++;
    totalBytes += bytes;
  }

  // 1. Home
  trackPage('/', 'index.html', renderHomePage(config, playbooks.length));

  // 2. Tool
  trackPage('/tool/', 'tool/index.html', renderToolPage(config, playbooks.length));

  // 3. Services directory
  trackPage('/services/', 'services/index.html', renderServicesIndexPage(playbooks, config));

  // 4. Individual service pages (only for active verified playbooks)
  for (const playbook of playbooks) {
    const serviceUrl = `/services/${playbook.region.toLowerCase()}/${playbook.id}/`;
    const relPath = `services/${playbook.region.toLowerCase()}/${playbook.id}/index.html`;
    trackPage(serviceUrl, relPath, renderServicePage(playbook, config));
  }

  // 5. Category indexes (only categories with active playbooks)
  const playbooksByCategory = new Map<string, CompiledPlaybook[]>();
  for (const cat of CATEGORIES) {
    playbooksByCategory.set(cat, []);
  }
  for (const p of playbooks) {
    const list = playbooksByCategory.get(p.category);
    if (list) list.push(p);
  }
  for (const [cat, pList] of playbooksByCategory) {
    if (pList.length > 0) {
      const catUrl = `/services/category/${cat}/`;
      trackPage(catUrl, `services/category/${cat}/index.html`, renderCategoryIndexPage(cat, pList, config));
    }
  }

  // 6. Region indexes (only regions with active playbooks)
  const playbooksByRegion = new Map<string, CompiledPlaybook[]>();
  for (const reg of REGIONS) {
    playbooksByRegion.set(reg, []);
  }
  for (const p of playbooks) {
    const list = playbooksByRegion.get(p.region);
    if (list) list.push(p);
  }
  for (const [reg, pList] of playbooksByRegion) {
    if (pList.length > 0) {
      const regUrl = `/services/region/${reg.toLowerCase()}/`;
      trackPage(regUrl, `services/region/${reg.toLowerCase()}/index.html`, renderRegionIndexPage(reg, pList, config));
    }
  }

  // 7. Hall of Shame
  trackPage('/hall-of-shame/', 'hall-of-shame/index.html', renderHallOfShamePage(playbooks, config));

  // 8. Methodology
  trackPage('/methodology/', 'methodology/index.html', renderMethodologyPage(config));

  // 9. Spec docs
  trackPage('/spec/', 'spec/index.html', renderSpecDocsPage(config));

  // 10. Contribute
  trackPage('/contribute/', 'contribute/index.html', renderContributePage(config));

  // 11. Search
  trackPage('/search/', 'search/index.html', renderSearchPage(playbooks, config));

  // 12. Changelog
  trackPage('/changelog/', 'changelog/index.html', renderChangelogPage(config));

  // 13. Policy pages
  const policies: PolicyData[] = [
    {
      slug: 'privacy',
      title: 'Privacy Policy',
      bodyHtml: `
        <h2>Zero Data Collection Guarantee</h2>
        <p>CancelSpec collects nothing and stores nothing. The scanner runs entirely in your browser using a Web Worker. No statement data leaves your device, zero network requests are made during or after scanning, and nothing is saved to cookies, localStorage, or IndexedDB.</p>
        <h2>Verification with Developer Tools</h2>
        <p>You can independently verify this in your browser: open the Network tab (inspect requests after scan) and Application tab (inspect storage).</p>
      `,
    },
    {
      slug: 'security',
      title: 'Security Policy',
      bodyHtml: `
        <h2>Reporting Vulnerabilities</h2>
        <p>Please report vulnerabilities to <code>${config.contact.security}</code> or through GitHub private vulnerability reporting. We acknowledge reports within 48 hours.</p>
      `,
    },
    {
      slug: 'takedown',
      title: 'Takedown Policy',
      bodyHtml: `
        <h2>Contact</h2>
        <p>Send notices to <code>${config.contact.takedown}</code>. We acknowledge within 3 days and correct or remove verified inaccuracies within 7 business days.</p>
      `,
    },
    {
      slug: 'nc-policy',
      title: 'NonCommercial Policy',
      bodyHtml: `
        <h2>Scope of CC BY-NC-SA 4.0 Corpus</h2>
        <p>The playbook data is licensed under CC BY-NC-SA 4.0. Allowed uses: personal use, nonprofit trackers, research, schools, free ad-free tools. Disallowed uses: paid services, ad-supported sites, selling or bundling the dataset.</p>
      `,
    },
    {
      slug: 'trademark',
      title: 'Trademark Policy',
      bodyHtml: `
        <h2>Service Names & Identification</h2>
        <p>Service names appear solely as plain text for factual identification under nominative fair use. They remain trademarks of their respective owners.</p>
      `,
    },
  ];

  for (const policy of policies) {
    const polUrl = `/policies/${policy.slug}/`;
    trackPage(polUrl, `policies/${policy.slug}/index.html`, renderPolicyPage(policy, config));
  }

  // 14. 404 page
  trackPage('/404.html', '404.html', renderNotFoundPage(config));

  // 15. Static assets: CSS, Headers, Sitemap, Robots, Search index, Release bundle
  // CSS
  const css = generateMainCss();
  totalBytes += writePage(outDir, 'styles/main.css', css);

  // Headers
  const headers = generateCloudflareHeaders();
  totalBytes += writePage(outDir, '_headers', headers);

  // Sitemap & Robots (always absolute to site.url)
  const sitemap = generateSitemapXml(urls, config.site.url);
  totalBytes += writePage(outDir, 'sitemap.xml', sitemap);

  const robots = generateRobotsTxt(config.site.url);
  totalBytes += writePage(outDir, 'robots.txt', robots);

  // Compact Search Index
  const searchIndex = playbooks.map((p) => ({
    id: p.id,
    name: p.name,
    aliases: p.aliases || [],
    category: p.category,
    region: p.region,
    difficulty: p.difficulty,
  }));
  const searchJson = JSON.stringify(searchIndex);
  totalBytes += writePage(outDir, 'search-index.json', searchJson);

  // Release Bundle
  const bundle = createReleaseBundle(playbooks, {
    referenceDate: options.referenceDate,
  });
  const bundleJson = serializeDeterministicJson(bundle);
  totalBytes += writePage(outDir, `data/bundle.${bundle.dataVersion}.json`, bundleJson);
  totalBytes += writePage(outDir, 'data/bundle.latest.json', bundleJson);

  // Client-side scripts (Tool Web Worker & Interactive UI)
  try {
    const clientBytes = buildClientBundles(outDir, playbooks);
    totalBytes += clientBytes;
  } catch (err) {
    if (!options.quiet) {
      console.warn('Warning: Could not build client bundles:', (err as Error).message);
    }
  }

  if (!options.quiet) {
    console.log(`✓ Static site built successfully!`);
    console.log(`  Pages generated: ${pagesCount}`);
    console.log(`  Total transfer size: ${Math.round(totalBytes / 1024)} KB`);
    console.log(`  Output directory: ${outDir}`);
  }

  return { pagesCount, totalBytes, urls };
}
