// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from 'node:crypto';

function normalizeString(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'boolean' || typeof val === 'number') return String(val).trim();
  return '';
}

function normalizeStep(step: unknown): { action: string; link: string } {
  if (typeof step === 'string') {
    return { action: step.trim(), link: '' };
  }
  if (typeof step === 'object' && step !== null) {
    const s = step as Record<string, unknown>;
    return {
      action: normalizeString(s.action),
      link: normalizeString(s.link),
    };
  }
  return { action: '', link: '' };
}

function normalizeChannel(ch: unknown): {
  channel: string;
  entry_url: string;
  steps: Array<{ action: string; link: string }>;
  notes: string;
  source: string;
} {
  if (typeof ch !== 'object' || ch === null) {
    return { channel: '', entry_url: '', steps: [], notes: '', source: '' };
  }
  const c = ch as Record<string, unknown>;
  const steps = Array.isArray(c.steps) ? c.steps.map(normalizeStep) : [];
  return {
    channel: normalizeString(c.channel),
    entry_url: normalizeString(c.entry_url),
    steps,
    notes: normalizeString(c.notes),
    source: normalizeString(c.source),
  };
}

function normalizeFact(
  fact: unknown,
): { value: string; source: string; accessed_on: string } | null {
  if (typeof fact !== 'object' || fact === null) return null;
  const f = fact as Record<string, unknown>;
  if (f.value === undefined) return null;
  return {
    value: normalizeString(f.value),
    source: normalizeString(f.source),
    accessed_on: normalizeString(f.accessed_on),
  };
}

/**
 * Computes a deterministic SHA-256 seal over the normalized channels, steps, facts, and patterns.
 */
export function computeContentSeal(playbook: unknown): string {
  if (typeof playbook !== 'object' || playbook === null) {
    return createHash('sha256').update('').digest('hex');
  }

  const pb = playbook as Record<string, unknown>;

  const channels = Array.isArray(pb.channels)
    ? pb.channels.map(normalizeChannel)
    : [];

  const facts = {
    notice_period: normalizeFact(pb.notice_period),
    refund_window: normalizeFact(pb.refund_window),
    auto_renews: normalizeFact(pb.auto_renews),
  };

  const merchantPatterns = Array.isArray(pb.merchant_patterns)
    ? pb.merchant_patterns.map(normalizeString).filter(Boolean)
    : [];

  const patterns = {
    merchant_patterns: merchantPatterns,
    pattern_source: normalizeString(pb.pattern_source),
  };

  const canonical = {
    channels,
    facts,
    patterns,
  };

  const canonicalJson = JSON.stringify(canonical);
  return createHash('sha256').update(canonicalJson).digest('hex');
}
