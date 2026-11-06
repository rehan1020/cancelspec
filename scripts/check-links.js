// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { get } from 'node:https';
import { get as getHttp } from 'node:http';
import { loadAllPlaybooks } from '../packages/core/dist/loader.js';

let config;
try {
  config = JSON.parse(readFileSync(join(process.cwd(), 'project.config'), 'utf8'));
} catch {
  config = { project: { name: 'CancelSpec', version: '0.1.0' }, repo: { url: 'https://github.com/rehan1020/cancelspec' } };
}

const USER_AGENT = `${config.project.name}/${config.project.version} (+${config.repo.url})`;

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const getter = parsed.protocol === 'http:' ? getHttp : get;
      const req = getter(
        url,
        {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 10000,
        },
        (res) => {
          // Drain response
          res.resume();
          if (res.statusCode && res.statusCode >= 400 && res.statusCode !== 403 && res.statusCode !== 429) {
            resolve({ ok: false, status: res.statusCode, error: `HTTP ${res.statusCode}` });
          } else {
            resolve({ ok: true, status: res.statusCode });
          }
        },
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Request timeout (10s)' });
      });
      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

export async function checkAllPlaybookLinks() {
  const playbooks = loadAllPlaybooks(join(process.cwd(), 'playbooks'), { includeDrafts: true });
  console.log(`Checking URLs across ${playbooks.length} playbooks...\n`);

  const urlMap = new Map(); // url -> Array<{ id, region, type }>

  for (const p of playbooks) {
    if (p.sources) {
      for (const s of p.sources) {
        if (s.url && s.url.startsWith('http')) {
          if (!urlMap.has(s.url)) urlMap.set(s.url, []);
          urlMap.get(s.url).push({ id: p.id, region: p.region, type: 'source' });
        }
      }
    }
    if (p.channels) {
      for (const ch of p.channels) {
        if (ch.entry_url && ch.entry_url.startsWith('http')) {
          if (!urlMap.has(ch.entry_url)) urlMap.set(ch.entry_url, []);
          urlMap.get(ch.entry_url).push({ id: p.id, region: p.region, type: 'entry_url' });
        }
      }
    }
  }

  console.log(`Found ${urlMap.size} unique URLs to check.\n`);
  const failures = [];

  for (const [url, usages] of urlMap.entries()) {
    process.stdout.write(`Checking ${url.slice(0, 70)}... `);
    const res = await checkUrl(url);
    if (!res.ok) {
      console.log(`FAILED (${res.error})`);
      failures.push({ url, usages, error: res.error });
    } else {
      console.log(`OK (${res.status})`);
    }
  }

  console.log(`\nURL Check Summary: ${urlMap.size - failures.length} OK, ${failures.length} Failed.`);

  if (failures.length > 0) {
    console.error(`\nBroken links detected:`);
    let body = `### Automated Link Check Failure Report\n\n`;
    body += `The weekly automated link check detected ${failures.length} broken URL(s):\n\n`;

    for (const f of failures) {
      const usageList = f.usages.map((u) => `\`${u.region}/${u.id}\` (${u.type})`).join(', ');
      console.error(`  - ${f.url} [${f.error}] in ${usageList}`);
      body += `- **URL**: ${f.url}\n  - **Error**: ${f.error}\n  - **Affected Playbooks**: ${usageList}\n\n`;
    }

    if (process.env.GITHUB_ACTIONS && process.env.GITHUB_TOKEN) {
      try {
        console.log(`Opening GitHub Issue for link check failures...`);
        execSync(
          `gh issue create --title "Automated Link Check: Broken URLs Detected" --body "${body.replace(/"/g, '\\"')}" --label "bug"`,
          { stdio: 'inherit' },
        );
      } catch (err) {
        console.error(`Failed to create GitHub issue:`, err.message);
      }
    }
    return false;
  }

  return true;
}

if (process.argv[1]?.endsWith('check-links.js')) {
  checkAllPlaybookLinks()
    .then((ok) => {
      if (!ok) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
