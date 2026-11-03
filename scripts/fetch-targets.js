// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from 'node:crypto';
import { get } from 'node:https';
import { get as getHttp } from 'node:http';
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

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

const USER_AGENT = `${config.project.name}/${config.project.version} (+${config.repo.url}; mailto:${config.contact?.general || 'cancelspec@protonmail.com'})`;

// Cache to ensure each URL is fetched at most once per run
const pageCache = new Map();

// Track hosts that return an error and skip them for subsequent targets
const failedHosts = new Set();

function fetchUrl(targetUrl, maxRedirects = 5) {
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

function discoverAllPlaybooks(playbooksDir) {
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

async function run() {
  console.log(`CancelSpec Source Fetcher running with User-Agent: "${USER_AGENT}"\n`);
  const scratchDir = join(process.cwd(), 'scratch/fetched-pages');
  mkdirSync(scratchDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const playbooksDir = join(process.cwd(), 'playbooks');
  const playbooks = discoverAllPlaybooks(playbooksDir);

  console.log(`Discovered ${playbooks.length} playbooks across all regions.\n`);

  const fetchedSuccess = [];
  const fetchedFailed = [];

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
        const res = await fetchUrl(url);
        console.log(`HTTP ${res.status} [${res.length} bytes] - SHA256: ${res.hash.slice(0, 16)}...`);
        source.sha256 = res.hash;
        source.accessed_on = today;
        modified = true;
        fetchedSuccess.push({ playbook: `${pb.region}/${pb.file}`, url, sha256: res.hash });

        // Save raw scratch copy for audit
        const safeName = `${pb.doc.id || pb.file.replace(/\.ya?ml$/, '')}-${idx}.html`;
        writeFileSync(join(scratchDir, safeName), res.raw, 'utf8');
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

  const manifest = {
    fetchDate: today,
    userAgent: USER_AGENT,
    successCount: fetchedSuccess.length,
    failedCount: fetchedFailed.length,
    successes: fetchedSuccess,
    failures: fetchedFailed,
  };

  writeFileSync(join(scratchDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n========================================`);
  console.log(`Fetch run complete!`);
  console.log(`  Successfully fetched & hashed: ${fetchedSuccess.length}`);
  console.log(`  Failed / Skipped:              ${fetchedFailed.length}`);
  console.log(`  Manifest saved to: scratch/fetched-pages/manifest.json`);
  console.log(`========================================\n`);

  if (fetchedFailed.length > 0) {
    console.log(`Pages that could not be fetched:`);
    for (const f of fetchedFailed) {
      console.log(`  - [${f.playbook}] ${f.url} (${f.reason})`);
    }
  }
}

run().catch((err) => {
  console.error('Fatal fetcher error:', err);
  process.exit(1);
});
