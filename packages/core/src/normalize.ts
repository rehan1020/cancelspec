// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Channel } from '@cancelspec/spec';

const NOISE_WORDS = new Set([
  'POS',
  'PURCHASE',
  'DEBIT',
  'CARD',
  'UPI',
  'NEFT',
  'IMPS',
  'ACH',
  'SEPA',
  'DD',
  'SI',
  'AUTOPAY',
  'RECURRING',
  'PAYMENT',
  'TXN',
  'REF',
  'CR',
  'DR',
  'WWW',
  'COM',
  'NET',
  'ORG',
  'LTD',
  'INC',
  'LLC',
]);

export interface NormalizationResult {
  merchantKey: string;
  processorHint?: Channel | undefined;
  tokens: string[];
}

export function normalizeMerchant(rawDescriptor: string): NormalizationResult {
  if (!rawDescriptor || typeof rawDescriptor !== 'string') {
    return { merchantKey: '', tokens: [] };
  }

  // 1. Unicode NFKC and Uppercase
  let text = rawDescriptor.normalize('NFKC').toUpperCase();

  // 2. Detect processor hints
  let processorHint: Channel | undefined;
  if (/PAYPAL\b|PAYPAL\*/.test(text)) {
    processorHint = 'paypal';
    text = text.replace(/PAYPAL\b|PAYPAL\*/g, ' ');
  } else if (/GOOGLE\s*\*|GOOGLE\s+PLAY\b/.test(text)) {
    processorHint = 'google-play';
    text = text.replace(/GOOGLE\s*\*|GOOGLE\s+PLAY\b/g, ' ');
  } else if (/APPLE\.COM\b|APPLE\s*\*/.test(text)) {
    processorHint = 'apple';
    text = text.replace(/APPLE\.COM\b|APPLE\s*\*/g, ' ');
  } else if (/SQUARE\b|SQ\s*\*/.test(text)) {
    processorHint = 'other';
    text = text.replace(/SQUARE\b|SQ\s*\*/g, ' ');
  }

  // 3. For UPI handles: keep local part, drop @bank handle
  text = text.replace(/([A-Z0-9._-]+)@[A-Z0-9]+/g, '$1');

  // 4. Remove dates (e.g. 2026-10-31, 31/10/2026, 10/31/26)
  text = text.replace(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g, ' ');

  // 5. Remove digit runs of 4 or more (account masks, ref numbers, card numbers)
  text = text.replace(/\b\d{4,}\b/g, ' ');
  text = text.replace(/X{4,}\d*/g, ' ');
  text = text.replace(/\*{4,}\d*/g, ' ');

  // 6. Replace non-alphanumeric (except space) with spaces
  text = text.replace(/[^A-Z0-9\s]/g, ' ');

  // 7. Tokenize and filter noise words
  const rawTokens = text.trim().split(/\s+/).filter(Boolean);
  const filteredTokens: string[] = [];

  for (const token of rawTokens) {
    // Skip if single characters that are numbers or pure noise
    if (NOISE_WORDS.has(token)) {
      continue;
    }
    // Skip isolated single letters unless meaningful
    if (token.length === 1 && !/[A-Z]/.test(token)) {
      continue;
    }
    filteredTokens.push(token);
    if (filteredTokens.length >= 6) {
      break;
    }
  }

  const merchantKey = filteredTokens.join(' ');

  return {
    merchantKey,
    processorHint,
    tokens: filteredTokens,
  };
}

/**
 * Derives a normalized matcher key from a service ID or name
 */
export function deriveMatcherKey(idOrName: string): string {
  const norm = normalizeMerchant(idOrName);
  return norm.merchantKey || idOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
}
