// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Playbook } from '@cancelspec/spec';
import { parse } from 'yaml';
import {
  extractKeywordSnippets,
  fetchSource,
  getUserAgent,
  type FetchSourceResult,
} from '../utils/fetch_source.js';

export interface PacketOptions {
  quiet?: boolean | undefined;
  userAgent?: string | undefined;
  failedHosts?: Set<string> | undefined;
  cache?: Map<string, FetchSourceResult> | undefined;
}

export interface PacketResult {
  playbookId: string;
  name: string;
  sources: Array<{
    url: string;
    storedHash: string;
    accessedOn?: string | undefined;
    currentHash?: string | undefined;
    rawHash?: string | undefined;
    fetchDate?: string | undefined;
    status: 'match' | 'changed' | 'failed' | 'skipped';
    error?: string | undefined;
    snippets: string[];
  }>;
  channels: Playbook['channels'];
}

function findPlaybookFile(playbooksDir: string, idOrPath: string): string | null {
  if (existsSync(idOrPath)) return idOrPath;

  const targetId = idOrPath.replace(/\.ya?ml$/, '').split(/[/\\]/).pop() || idOrPath;
  const regions = ['GLOBAL', 'US', 'UK', 'EU', 'IN'];

  for (const r of regions) {
    const candidateYaml = join(playbooksDir, r, `${targetId}.yaml`);
    if (existsSync(candidateYaml)) return candidateYaml;
    const candidateYml = join(playbooksDir, r, `${targetId}.yml`);
    if (existsSync(candidateYml)) return candidateYml;
  }

  // Also check root if files are directly in playbooksDir
  const directCandidate = join(playbooksDir, `${targetId}.yaml`);
  if (existsSync(directCandidate)) return directCandidate;

  // Search recursively one level in
  if (existsSync(playbooksDir)) {
    const entries = readdirSync(playbooksDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const subCandidate = join(playbooksDir, ent.name, `${targetId}.yaml`);
        if (existsSync(subCandidate)) return subCandidate;
      }
    }
  }

  return null;
}

function wrapText(text: string, width: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function packetPlaybook(
  playbooksDir: string,
  idOrPath: string,
  options: PacketOptions = {},
): Promise<PacketResult> {
  const filePath = findPlaybookFile(playbooksDir, idOrPath);
  if (!filePath) {
    throw new Error(`Playbook "${idOrPath}" not found in ${playbooksDir}`);
  }

  const raw = readFileSync(filePath, 'utf8');
  const playbook = parse(raw) as Playbook;

  if (!playbook || !playbook.id) {
    throw new Error(`Invalid playbook content in ${filePath}`);
  }

  const failedHosts = options.failedHosts || new Set<string>();
  const userAgent = options.userAgent || getUserAgent();
  const cache = options.cache || new Map<string, FetchSourceResult>();

  const sourcesResult: PacketResult['sources'] = [];

  for (const src of playbook.sources || []) {
    if (src.retrieval === 'manual') {
      sourcesResult.push({
        url: src.url,
        storedHash: src.sha256 || 'none (manual)',
        accessedOn: src.accessed_on,
        status: 'skipped',
        error: 'Manual retrieval source; skipped automated fetch',
        snippets: [],
      });
      continue;
    }

    let result: FetchSourceResult | null = null;
    let status: 'match' | 'changed' | 'failed' | 'skipped' = 'failed';
    let error: string | undefined;
    let snippets: string[] = [];

    let hostname = '';
    try {
      hostname = new URL(src.url).hostname;
    } catch {
      hostname = '';
    }

    if (failedHosts.has(hostname)) {
      status = 'skipped';
      error = `Host ${hostname} was previously marked as failed or disallowed`;
    } else {
      try {
        result = await fetchSource(src.url, {
          userAgent,
          failedHosts,
          cache,
        });

        const isMatch = result.hash === src.sha256 || result.rawHash === src.sha256;
        status = isMatch ? 'match' : 'changed';
        snippets = extractKeywordSnippets(result.normalizedText);
      } catch (err) {
        status = 'failed';
        error = (err as Error).message;
      }
    }

    sourcesResult.push({
      url: src.url,
      storedHash: src.sha256 || '',
      accessedOn: src.accessed_on,
      currentHash: result?.hash,
      rawHash: result?.rawHash,
      fetchDate: result?.fetchDate,
      status,
      error,
      snippets,
    });
  }

  const packetResult: PacketResult = {
    playbookId: playbook.id,
    name: playbook.name,
    sources: sourcesResult,
    channels: playbook.channels,
  };

  if (!options.quiet) {
    printPacketReport(playbook, packetResult);
  }

  return packetResult;
}

function printPacketReport(playbook: Playbook, packet: PacketResult) {
  const colWidth = 44;
  const divider = '='.repeat(colWidth * 2 + 3);
  const colDivider = '-'.repeat(colWidth);

  console.log(`\n${divider}`);
  console.log(`PLAYBOOK PACKET: ${packet.playbookId} (${packet.name})`);
  console.log(`Status: ${playbook.status} | Revision: ${playbook.revision || 1} | Verified: ${playbook.verified_on || 'never'}`);
  console.log(`${divider}\n`);

  console.log('--- SOURCES & HASH VERIFICATION ---');
  for (const [idx, s] of packet.sources.entries()) {
    console.log(`[Source ${idx + 1}] ${s.url}`);
    console.log(`  Stored Hash:  ${s.storedHash} (accessed ${s.accessedOn || 'unknown'})`);
    if (s.status === 'match') {
      console.log(`  Current Hash: ${s.currentHash} (fetched ${s.fetchDate}) [✓ MATCH]`);
    } else if (s.status === 'changed') {
      console.log(`  Current Hash: ${s.currentHash} (fetched ${s.fetchDate}) [⚠ HASH CHANGED]`);
    } else {
      console.log(`  Fetch Status: ✗ ${s.status.toUpperCase()} (${s.error || 'could not load'})`);
    }
  }

  console.log(`\n${divider}`);
  console.log(
    'CHANNELS & PLAYBOOK STEPS'.padEnd(colWidth) +
      ' | ' +
      'OFFICIAL SOURCE PAGE TEXT (RELEVANT)'.padEnd(colWidth),
  );
  console.log(`${colDivider} | ${colDivider}`);

  // Prepare left column lines (Channels & steps)
  const leftLines: string[] = [];
  for (const ch of packet.channels) {
    leftLines.push(`[Channel: ${ch.channel}]`);
    if (ch.entry_url) leftLines.push(`Entry: ${ch.entry_url}`);
    if (ch.source) leftLines.push(`Source: ${ch.source}`);
    if (ch.steps && ch.steps.length > 0) {
      leftLines.push('Steps:');
      for (const [i, st] of ch.steps.entries()) {
        const action = typeof st === 'string' ? st : st.action;
        const wrapped = wrapText(`${i + 1}. ${action}`, colWidth - 2);
        for (const w of wrapped) leftLines.push(`  ${w}`);
      }
    } else {
      leftLines.push('Steps: (none)');
    }
    if (ch.notes) {
      const wrapped = wrapText(`Notes: ${ch.notes}`, colWidth - 2);
      for (const w of wrapped) leftLines.push(`  ${w}`);
    }
    leftLines.push('');
  }

  // Prepare right column lines (Source snippets)
  const rightLines: string[] = [];
  const allSnippets: string[] = [];
  for (const s of packet.sources) {
    for (const snip of s.snippets) {
      if (!allSnippets.includes(snip)) {
        allSnippets.push(snip);
      }
    }
  }

  if (allSnippets.length > 0) {
    rightLines.push('Keyword matches: [cancel/subscription/plan/close/delete/billing]');
    for (const snip of allSnippets) {
      const wrapped = wrapText(`• "${snip}"`, colWidth - 2);
      for (const w of wrapped) rightLines.push(w);
      rightLines.push('');
    }
  } else {
    rightLines.push('(No matching snippets retrieved from sources)');
  }

  const maxRows = Math.max(leftLines.length, rightLines.length);
  for (let r = 0; r < maxRows; r++) {
    const left = (leftLines[r] || '').padEnd(colWidth);
    const right = (rightLines[r] || '').padEnd(colWidth);
    console.log(`${left} | ${right}`);
  }

  console.log(`${divider}\n`);
}
