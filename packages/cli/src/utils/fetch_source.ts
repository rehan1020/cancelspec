// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function findProjectConfigFile(startDir = process.cwd()): string | null {
  let curr = resolve(startDir);
  while (true) {
    const candidate = join(curr, 'project.config');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

export function getUserAgent(startDir = process.cwd()): string {
  let config = {
    project: { name: 'CancelSpec', version: '0.0.0' },
    repo: { url: 'https://github.com/rehan1020/cancelspec' },
    contact: { general: 'cancelspec@protonmail.com' },
  };

  try {
    const cfgPath = findProjectConfigFile(startDir);
    if (cfgPath) {
      config = JSON.parse(readFileSync(cfgPath, 'utf8'));
    }
  } catch {
    // fallback
  }

  return `${config.project.name}/${config.project.version} (+${config.repo.url}; mailto:${config.contact?.general || 'cancelspec@protonmail.com'})`;
}

export function normalizeWhitespace(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export function extractVisibleText(html: string): string {
  if (!html) return '';

  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');

  // Add line breaks for block elements
  clean = clean.replace(/<\/?(div|p|h[1-6]|li|tr|section|article|header|footer|nav|main|blockquote)\b[^>]*>/gi, '\n');
  clean = clean.replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining tags
  clean = clean.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#8217;/gi, "'")
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"')
    .replace(/&#8211;/gi, '-')
    .replace(/&#8212;/gi, '--');

  return normalizeWhitespace(clean);
}

const robotsCache = new Map<string, string | null>();

export async function isUrlAllowedByRobots(
  urlStr: string,
  userAgent: string,
  failedHosts?: Set<string>,
): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  const origin = parsed.origin;
  const path = (parsed.pathname || '/') + (parsed.search || '');

  if (!robotsCache.has(origin)) {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const res = await fetch(robotsUrl, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 200) {
        const txt = await res.text();
        robotsCache.set(origin, txt);
      } else {
        robotsCache.set(origin, null);
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
  const disallowList: string[] = [];

  for (const rawLine of lines) {
    const part = rawLine.split('#')[0];
    const line = part ? part.trim() : '';
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
        disallowList.length = 0;
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
    if (rule === '/') {
      failedHosts?.add(parsed.hostname);
      return false;
    }
    if (rule.includes('*')) {
      const regexStr = '^' + rule.split('*').map((s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('.*');
      if (new RegExp(regexStr).test(path)) {
        failedHosts?.add(parsed.hostname);
        return false;
      }
    } else if (path.startsWith(rule)) {
      failedHosts?.add(parsed.hostname);
      return false;
    }
  }

  return true;
}

export interface FetchSourceResult {
  url: string;
  status: number;
  normalizedText: string;
  hash: string;
  rawHash: string;
  fetchDate: string;
}

export async function fetchSource(
  targetUrl: string,
  options: {
    userAgent?: string | undefined;
    failedHosts?: Set<string> | undefined;
    cache?: Map<string, FetchSourceResult> | undefined;
    timeoutMs?: number | undefined;
  } = {},
): Promise<FetchSourceResult> {
  if (options.cache && options.cache.has(targetUrl)) {
    return options.cache.get(targetUrl)!;
  }

  let hostname = '';
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    throw new Error(`Invalid URL: ${targetUrl}`);
  }

  if (options.failedHosts?.has(hostname)) {
    throw new Error(`Host ${hostname} was previously marked as failed or disallowed`);
  }

  const ua = options.userAgent || getUserAgent();

  // Robots check
  const allowed = await isUrlAllowedByRobots(targetUrl, ua, options.failedHosts);
  if (!allowed) {
    options.failedHosts?.add(hostname);
    throw new Error(`Disallowed by robots.txt on ${hostname}`);
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10000),
    });
  } catch (err) {
    options.failedHosts?.add(hostname);
    throw new Error(`Network failure fetching ${targetUrl}: ${(err as Error).message}`);
  }

  if (res.status >= 400) {
    options.failedHosts?.add(hostname);
    throw new Error(`HTTP ${res.status} from ${hostname}`);
  }

  const raw = await res.text();
  const rawHash = createHash('sha256').update(raw, 'utf8').digest('hex');
  const normalizedText = extractVisibleText(raw);
  const hash = createHash('sha256').update(normalizedText, 'utf8').digest('hex');
  const fetchDate = new Date().toISOString().slice(0, 10);

  const result: FetchSourceResult = {
    url: targetUrl,
    status: res.status,
    normalizedText,
    hash,
    rawHash,
    fetchDate,
  };

  if (options.cache) {
    options.cache.set(targetUrl, result);
  }

  return result;
}

export const TARGET_KEYWORDS = ['cancel', 'subscription', 'plan', 'close', 'delete', 'billing'];

export function extractKeywordSnippets(text: string, keywords = TARGET_KEYWORDS, maxSnippets = 12): string[] {
  if (!text) return [];

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const matched: string[] = [];
  const seen = new Set<string>();

  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const hasKw = lowerKeywords.some((kw) => lowerLine.includes(kw));
    if (hasKw) {
      // Normalize snippet
      const cleanSnippet = line.replace(/\s+/g, ' ');
      if (!seen.has(cleanSnippet) && cleanSnippet.length >= 10) {
        seen.add(cleanSnippet);
        matched.push(cleanSnippet);
        if (matched.length >= maxSnippets) break;
      }
    }
  }

  return matched;
}
