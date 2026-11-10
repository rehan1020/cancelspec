// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from 'node:crypto';
import { get } from 'node:https';
import { get as getHttp } from 'node:http';
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { chromium } from 'playwright';

let config = {
  project: { name: 'CancelSpec', version: '0.1.0' },
  repo: { url: 'https://github.com/rehan1020/cancelspec' },
  contact: { general: 'cancelspec@protonmail.com' },
};
try {
  config = JSON.parse(readFileSync(join(process.cwd(), 'project.config'), 'utf8'));
} catch {
  // fallback
}

export const USER_AGENT = `${config.project.name}/${config.project.version} (+${config.repo.url}; mailto:${config.contact?.general || 'cancelspec@protonmail.com'})`;

// Cache to ensure each URL is fetched at most once per run
export const pageCache = new Map();
export const renderedPageCache = new Map();

// Track hosts that return an error and skip them for subsequent targets
export const failedHosts = new Set();

// Cache for robots.txt per origin
export const robotsCache = new Map();

export function normalizeWhitespace(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export async function isUrlAllowedByRobots(urlStr) {
  const parsed = new URL(urlStr);
  const origin = parsed.origin;
  const path = (parsed.pathname || '/') + (parsed.search || '');

  if (!robotsCache.has(origin)) {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const res = await fetch(robotsUrl, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(6000),
      });
      if (res.status === 200) {
        const txt = await res.text();
        robotsCache.set(origin, txt);
      } else {
        robotsCache.set(origin, null); // 404 or other: allow by default
      }
    } catch {
      robotsCache.set(origin, null);
    }
  }

  const robotsTxt = robotsCache.get(origin);
  if (!robotsTxt) return true;

  const lines = robotsTxt.split(/\r?\n/);
  let isApplies = false;
  let userAgentApplies = false;
  const disallowList = [];

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const val = line.slice(colon + 1).trim();

    if (key === 'user-agent') {
      if (val === '*' && !userAgentApplies) {
        isApplies = true;
      } else if (val.toLowerCase().includes('cancelspec')) {
        isApplies = true;
        userAgentApplies = true;
        disallowList.length = 0; // specific rule overrides wildcard
      } else {
        isApplies = false;
      }
    } else if (isApplies && key === 'disallow') {
      if (val) {
        disallowList.push(val);
      }
    }
  }

  for (const rule of disallowList) {
    if (rule === '/') return false;
    if (rule.includes('*')) {
      const regexStr = '^' + rule.split('*').map((s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('.*');
      if (new RegExp(regexStr).test(path)) return false;
    } else if (path.startsWith(rule)) {
      return false;
    }
  }

  return true;
}

export function detectBotChallenge(title, text, status) {
  if (status === 403 || status === 429) {
    return `HTTP ${status} forbidden or rate-limited`;
  }
  const lowerTitle = (title || '').toLowerCase();
  const lowerText = (text || '').toLowerCase();

  if (
    lowerTitle.includes('just a moment') ||
    lowerTitle.includes('attention required') ||
    lowerTitle.includes('access denied') ||
    lowerTitle.includes('robot or human') ||
    lowerTitle.includes('security check')
  ) {
    return `Bot challenge title: "${title}"`;
  }

  if (
    lowerText.includes('please verify you are a human') ||
    lowerText.includes('checking your browser') ||
    lowerText.includes('cf-browser-verification') ||
    lowerText.includes('challenge-running') ||
    lowerText.includes('enable javascript and cookies to continue') ||
    (lowerText.includes('ray id:') && lowerText.includes('cloudflare'))
  ) {
    return 'Bot-challenge indicator detected in page text';
  }

  return null;
}

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function fetchRenderedUrl(targetUrl) {
  if (renderedPageCache.has(targetUrl)) {
    return renderedPageCache.get(targetUrl);
  }

  const hostname = new URL(targetUrl).hostname;
  if (failedHosts.has(hostname)) {
    throw new Error(`Host ${hostname} was previously marked as failed`);
  }

  // 1. Robots.txt check
  const allowed = await isUrlAllowedByRobots(targetUrl);
  if (!allowed) {
    failedHosts.add(hostname);
    throw new Error(`Disallowed by robots.txt on ${hostname}`);
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
  });
  const page = await context.newPage();

  try {
    const res = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const status = res ? res.status() : 200;
    if (status >= 400) {
      failedHosts.add(hostname);
      throw new Error(`HTTP ${status} from ${hostname}`);
    }

    // Wait for dynamic main content hydration
    try {
      await page.waitForSelector('main, article, [role="main"], #main-content, #content, .content, body', {
        timeout: 10000,
      });
    } catch {
      // proceed if timeout
    }

    // Check if initial content is placeholder/loading and wait if necessary
    await page.waitForTimeout(3000);
    try {
      await page.waitForFunction(() => {
        const main =
          document.querySelector('main') ||
          document.querySelector('article') ||
          document.querySelector('[role="main"]') ||
          document.body;
        const txt = main ? main.innerText.trim() : '';
        return txt.length > 50 && !txt.toLowerCase().startsWith('loading');
      }, { timeout: 6000 });
    } catch {
      // proceed with available text
    }

    // Auto-expand accordions and details elements (common in help centers like Salesforce, Zendesk, Microsoft, etc.)
    await page.evaluate(() => {
      document.querySelectorAll('details:not([open])').forEach((d) => {
        d.open = true;
      });

      document.querySelectorAll('button[aria-expanded="false"]').forEach((b) => {
        try {
          b.click();
        } catch {}
      });
    });
    await page.waitForTimeout(1000);

    // Extract visible text from main content area
    const { title, visibleText } = await page.evaluate(() => {
      const candidates = [
        document.querySelector('main'),
        document.querySelector('article'),
        document.querySelector('[role="main"]'),
        document.querySelector('#main-content'),
        document.querySelector('#content'),
        document.querySelector('.article-content'),
        document.querySelector('.article-body'),
        document.querySelector('.siteforceContentArea'),
        document.body,
      ].filter(Boolean);

      let best = candidates[0];
      for (const c of candidates) {
        if ((c.innerText || '').length > (best.innerText || '').length) {
          best = c;
        }
      }

      return {
        title: document.title || '',
        visibleText: best ? best.innerText : '',
      };
    });

    // 2. Bot challenge detection
    const botChallenge = detectBotChallenge(title, visibleText, status);
    if (botChallenge) {
      failedHosts.add(hostname);
      throw new Error(`Bot challenge on ${hostname}: ${botChallenge}`);
    }

    if (!visibleText || !visibleText.trim()) {
      throw new Error(`Main content area is empty on ${targetUrl}`);
    }

    // 3. Normalize whitespace & hash
    const normalized = normalizeWhitespace(visibleText);
    const hash = createHash('sha256').update(normalized, 'utf8').digest('hex');

    const result = {
      status,
      length: normalized.length,
      hash,
      normalizedText: normalized, // In-memory only; never written to repo
    };

    renderedPageCache.set(targetUrl, result);
    return result;
  } catch (err) {
    failedHosts.add(hostname);
    throw err;
  } finally {
    await context.close();
  }
}

export function fetchUrl(targetUrl, maxRedirects = 5) {
  if (pageCache.has(targetUrl)) {
    return Promise.resolve(pageCache.get(targetUrl));
  }

  const hostname = new URL(targetUrl).hostname;
  if (failedHosts.has(hostname)) {
    return Promise.reject(new Error(`Host ${hostname} was previously marked as failed`));
  }

  return new Promise((resolve, reject) => {
    const isHttps = targetUrl.startsWith('https:');
    const getter = isHttps ? get : getHttp;

    const req = getter(
      targetUrl,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
      },
      (res) => {
        // Handle HTTP redirects (301, 302, 303, 307, 308)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (maxRedirects <= 0) {
            failedHosts.add(hostname);
            return reject(new Error(`Too many redirects from ${targetUrl}`));
          }
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return fetchUrl(redirectUrl, maxRedirects - 1)
            .then((result) => {
              pageCache.set(targetUrl, result);
              resolve(result);
            })
            .catch(reject);
        }

        if (res.statusCode && res.statusCode >= 400) {
          failedHosts.add(hostname);
          return reject(new Error(`HTTP ${res.statusCode} from ${hostname}`));
        }

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const hash = createHash('sha256').update(data).digest('hex');
          const result = {
            status: res.statusCode || 200,
            length: data.length,
            hash,
            raw: data,
          };
          pageCache.set(targetUrl, result);
          resolve(result);
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();
      failedHosts.add(hostname);
      reject(new Error(`Timeout fetching ${hostname}`));
    });

    req.on('error', (err) => {
      failedHosts.add(hostname);
      reject(err);
    });
  });
}

export function discoverAllPlaybooks(playbooksDir) {
  const regions = ['GLOBAL', 'US', 'UK', 'EU', 'IN'];
  const playbooks = [];

  for (const r of regions) {
    const dir = join(playbooksDir, r);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const f of files) {
      const fullPath = join(dir, f);
      try {
        const raw = readFileSync(fullPath, 'utf8');
        const doc = parseYaml(raw);
        if (doc) {
          playbooks.push({
            region: r,
            file: f,
            path: fullPath,
            doc,
            raw,
          });
        }
      } catch (err) {
        console.error(`Error parsing ${r}/${f}: ${err.message}`);
      }
    }
  }

  return playbooks;
}

export async function run() {
  const args = process.argv.slice(2);
  const renderMode = args.includes('--render');

  console.log(`CancelSpec Source Fetcher running with User-Agent: "${USER_AGENT}"`);
  console.log(`Mode: ${renderMode ? 'Playwright Headless Render' : 'Standard HTTP'}\n`);

  const today = new Date().toISOString().slice(0, 10);
  const playbooksDir = join(process.cwd(), 'playbooks');
  const playbooks = discoverAllPlaybooks(playbooksDir);

  console.log(`Discovered ${playbooks.length} playbooks across all regions.\n`);

  const fetchedSuccess = [];
  const fetchedFailed = [];

  try {
    for (const pb of playbooks) {
      console.log(`Checking ${pb.region}/${pb.file} (${pb.doc.name || pb.doc.id}):`);
      if (!pb.doc.sources || !Array.isArray(pb.doc.sources)) {
        continue;
      }

      let modified = false;

      for (let idx = 0; idx < pb.doc.sources.length; idx++) {
        const source = pb.doc.sources[idx];
        const url = source.url;
        if (!url) continue;

        const host = new URL(url).hostname;
        if (failedHosts.has(host)) {
          console.log(`  [Source ${idx + 1}] Skipping ${url} - host ${host} previously failed.`);
          delete source.sha256;
          source.accessed_on = today;
          modified = true;
          fetchedFailed.push({ playbook: `${pb.region}/${pb.file}`, url, reason: `Host ${host} skipped` });
          continue;
        }

        process.stdout.write(`  [Source ${idx + 1}] Fetching ${url}... `);
        try {
          let res;
          if (renderMode) {
            res = await fetchRenderedUrl(url);
          } else {
            res = await fetchUrl(url);
          }

          console.log(`HTTP ${res.status} [${res.length} bytes] - SHA256: ${res.hash.slice(0, 16)}...`);
          source.sha256 = res.hash;
          source.accessed_on = today;
          modified = true;
          fetchedSuccess.push({ playbook: `${pb.region}/${pb.file}`, url, sha256: res.hash });
        } catch (err) {
          console.log(`FAILED: ${err.message}`);
          delete source.sha256;
          source.accessed_on = today;
          modified = true;
          fetchedFailed.push({ playbook: `${pb.region}/${pb.file}`, url, reason: err.message });
        }
      }

      if (modified) {
        const headerMatch = pb.raw.match(/<!--[\s\S]*?-->|#(?:(?!\n\n)[\s\S])*\n/);
        const yamlStr = stringifyYaml(pb.doc, { indent: 2, lineWidth: 0 });
        const updatedContent =
          (headerMatch
            ? headerMatch[0].trim() + '\n\n'
            : '# SPDX-FileCopyrightText: 2026 CancelSpec contributors\n# SPDX-License-Identifier: CC-BY-NC-SA-4.0\n\n') +
          yamlStr;
        writeFileSync(pb.path, updatedContent, 'utf8');
      }
    }
  } finally {
    await closeBrowser();
  }

  console.log(`\n========================================`);
  console.log(`Fetch run complete!`);
  console.log(`  Successfully fetched & hashed: ${fetchedSuccess.length}`);
  console.log(`  Failed / Skipped:              ${fetchedFailed.length}`);
  console.log(`========================================\n`);

  if (fetchedFailed.length > 0) {
    console.log(`Pages that could not be fetched:`);
    for (const f of fetchedFailed) {
      console.log(`  - [${f.playbook}] ${f.url} (${f.reason})`);
    }
  }
}

// Only auto-run if executed as CLI entry point
if (process.argv[1] && process.argv[1].endsWith('fetch-targets.js')) {
  run().catch((err) => {
    console.error('Fatal fetcher error:', err);
    process.exit(1);
  });
}
