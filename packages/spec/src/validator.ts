// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  ALLOWLISTED_OFFICIAL_HELP_HOSTS,
  BANNED_LEGAL_PHRASES,
  CATEGORIES,
  CHANNELS,
  OUTCOMES,
  PLAYBOOK_KINDS,
  STATUSES,
  TAGS,
  VERIFICATION_METHODS,
  type Category,
  type Channel,
  type Outcome,
  type PlaybookKind,
  type Status,
  type Tag,
  type VerificationMethod,
} from './constants.js';
import type {
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from './types.js';

const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HTML_TAG_REGEX = /<[a-zA-Z/][^>]*>/;
const MARKDOWN_LINK_REGEX = /\[.*?\]\(.*?\)/;
const MARKDOWN_FORMAT_REGEX = /(\*\*|__|~~|`)/;
const MERCHANT_PATTERN_REGEX = /^[A-Z0-9\s*_.\-+]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsHtmlOrMarkdown(text: string): boolean {
  return (
    HTML_TAG_REGEX.test(text) ||
    MARKDOWN_LINK_REGEX.test(text) ||
    MARKDOWN_FORMAT_REGEX.test(text)
  );
}

function containsPlaceholders(text: string): boolean {
  return /\bexample\.com\b|\bTODO\b/i.test(text);
}

function extractDomain(urlOrDomain: string): string {
  try {
    const raw = urlOrDomain.startsWith('http') ? urlOrDomain : `https://${urlOrDomain}`;
    const hostname = new URL(raw).hostname.toLowerCase();
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const p2 = parts[parts.length - 2];
      const p1 = parts[parts.length - 1];
      if (parts.length >= 3 && p2 && p1 && p2.length <= 3 && p1.length <= 2) {
        return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return urlOrDomain.toLowerCase();
  }
}

function sourceMatchesWebsite(sourceUrl: string, websiteUrl: string): boolean {
  const siteDomain = extractDomain(websiteUrl);
  const srcDomain = extractDomain(sourceUrl);
  if (srcDomain === siteDomain) return true;
  if (siteDomain && srcDomain.endsWith(`.${siteDomain}`)) return true;
  try {
    const srcHost = new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`).hostname.toLowerCase();
    const allowed = ALLOWLISTED_OFFICIAL_HELP_HOSTS[siteDomain];
    if (allowed && (allowed.includes(srcDomain) || allowed.includes(srcHost))) return true;
  } catch {
    // ignore
  }
  return false;
}

function isValidHttpsUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return 1;
  const matches = clean.match(/[aeiouy]{1,2}/g);
  let count = matches ? matches.length : 1;
  if (clean.endsWith('e') && !clean.endsWith('le')) {
    count = Math.max(1, count - 1);
  }
  return count;
}

export function estimateFleschKincaidGrade(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  const sentenceCount = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);

  const grade =
    0.39 * (words.length / sentenceCount) +
    11.8 * (totalSyllables / words.length) -
    15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

export function validatePlaybook(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!isPlainObject(data)) {
    return {
      valid: false,
      errors: [{ path: '', message: 'Playbook must be an object' }],
      warnings: [],
    };
  }

  // Check for unknown top-level keys
  const allowedKeys = new Set([
    'id',
    'name',
    'aliases',
    'kind',
    'outcome',
    'category',
    'website',
    'merchant_patterns',
    'channels',
    'tags',
    'accessible_alternative',
    'notice_period',
    'refund_window',
    'auto_renews',
    'contributors',
    'reviewers',
    'verified_on',
    'verification_method',
    'sources',
    'revision',
    'status',
    'status_reason',
  ]);

  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      errors.push({ path: key, message: `Unknown property: ${key}` });
    }
  }

  // 1. Identity
  // id
  if (typeof data.id !== 'string' || !data.id) {
    errors.push({ path: 'id', message: 'id is required and must be a string' });
  } else if (!KEBAB_CASE_REGEX.test(data.id)) {
    errors.push({
      path: 'id',
      message: 'id must be lowercase kebab-case ASCII (e.g. "netflix", "adobe-creative-cloud")',
    });
  }

  // name
  if (typeof data.name !== 'string' || !data.name.trim()) {
    errors.push({ path: 'name', message: 'name is required and must be non-empty' });
  } else {
    if (containsHtmlOrMarkdown(data.name)) {
      errors.push({ path: 'name', message: 'name must be plain text without HTML or Markdown' });
    }
    checkBannedPhrases('name', data.name, errors);
  }

  // aliases
  if (data.aliases !== undefined) {
    if (!Array.isArray(data.aliases)) {
      errors.push({ path: 'aliases', message: 'aliases must be an array of strings' });
    } else {
      data.aliases.forEach((alias, idx) => {
        if (typeof alias !== 'string' || !alias.trim()) {
          errors.push({ path: `aliases[${idx}]`, message: 'alias must be a non-empty string' });
        } else if (containsHtmlOrMarkdown(alias)) {
          errors.push({ path: `aliases[${idx}]`, message: 'alias must be plain text' });
        }
      });
    }
  }

  // kind
  if (data.kind !== undefined) {
    if (typeof data.kind !== 'string' || !PLAYBOOK_KINDS.includes(data.kind as PlaybookKind)) {
      errors.push({
        path: 'kind',
        message: `Invalid kind "${data.kind}". Must be one of: ${PLAYBOOK_KINDS.join(', ')}`,
      });
    } else if (data.kind === 'channel-guide') {
      if (Array.isArray(data.aliases) && data.aliases.length > 0) {
        errors.push({
          path: 'aliases',
          message: 'Channel guides cannot carry service aliases',
        });
      }
    }
  }

  // outcome
  if (data.outcome !== undefined) {
    if (typeof data.outcome !== 'string' || !OUTCOMES.includes(data.outcome as Outcome)) {
      errors.push({
        path: 'outcome',
        message: `Invalid outcome "${data.outcome}". Must be one of: ${OUTCOMES.join(', ')}`,
      });
    }
  }

  // category
  if (!data.category || typeof data.category !== 'string') {
    errors.push({ path: 'category', message: 'category is required' });
  } else if (!CATEGORIES.includes(data.category as Category)) {
    errors.push({
      path: 'category',
      message: `Invalid category "${data.category}". Must be one of: ${CATEGORIES.join(', ')}`,
    });
  }

  // website
  if (typeof data.website !== 'string' || !data.website.trim()) {
    errors.push({ path: 'website', message: 'website is required' });
  } else if (!isValidHttpsUrl(data.website) && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.website)) {
    errors.push({ path: 'website', message: 'website must be a valid domain or https URL' });
  } else if (containsPlaceholders(data.website)) {
    errors.push({ path: 'website', message: 'website cannot contain placeholder domain' });
  }

  // 2. Matching
  // merchant_patterns
  if (!Array.isArray(data.merchant_patterns)) {
    errors.push({
      path: 'merchant_patterns',
      message: 'merchant_patterns must be an array',
    });
  } else if (data.status !== 'draft' && data.merchant_patterns.length === 0) {
    errors.push({
      path: 'merchant_patterns',
      message: 'merchant_patterns is required and must contain at least one pattern for non-draft playbooks',
    });
  } else {
    data.merchant_patterns.forEach((pattern, idx) => {
      if (typeof pattern !== 'string' || !pattern.trim()) {
        errors.push({
          path: `merchant_patterns[${idx}]`,
          message: 'merchant_pattern must be a non-empty string',
        });
      } else {
        if (!MERCHANT_PATTERN_REGEX.test(pattern)) {
          errors.push({
            path: `merchant_patterns[${idx}]`,
            message: 'merchant_pattern must be uppercase and only contain letters, numbers, spaces, and wildcard *',
          });
        }
        if (pattern !== pattern.toUpperCase()) {
          errors.push({
            path: `merchant_patterns[${idx}]`,
            message: 'merchant_pattern must be uppercase',
          });
        }
        const literal = pattern.replace(/\*/g, '').trim();
        if (literal.length < 6) {
          errors.push({
            path: `merchant_patterns[${idx}]`,
            message: `merchant_pattern literal text must be at least 6 characters (got ${literal.length} for "${pattern}")`,
          });
        }

        // Minimum-literal rule on normalized pattern (after processor prefixes are stripped)
        if (data.kind !== 'channel-guide') {
          const stripped = pattern
            .replace(/\*/g, ' ')
            .trim()
            .replace(/^(GOOGLE|GOOGLE PLAY|APPLE\.COM|APPLE|APPLE BILL|PAYPAL|SQUARE|SQ)\b\s*/i, '')
            .trim();
          const words = stripped.split(/\s+/).filter(Boolean);
          const hasWordGe4 = words.some((w) => w.replace(/[^A-Z0-9]/g, '').length >= 4);
          if (!hasWordGe4) {
            errors.push({
              path: `merchant_patterns[${idx}]`,
              message: `merchant_pattern normalized literal must contain at least one word of 4 or more characters after processor prefixes are stripped (got "${stripped}")`,
            });
          }
        }
      }
    });
  }

  // 3. Channels
  const availableSourceUrls: string[] = Array.isArray(data.sources)
    ? data.sources
        .filter(isPlainObject)
        .map((s) => (typeof s.url === 'string' ? s.url : ''))
        .filter(Boolean)
    : [];

  if (!Array.isArray(data.channels) || data.channels.length === 0) {
    errors.push({
      path: 'channels',
      message: 'channels is required and must contain at least one channel',
    });
  } else {
    data.channels.forEach((ch, idx) => {
      validateChannel(ch, `channels[${idx}]`, errors, warnings, data.status as Status, availableSourceUrls);
    });
  }

  // 4. Friction
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push({ path: 'tags', message: 'tags must be an array' });
    } else {
      data.tags.forEach((tag, idx) => {
        if (!TAGS.includes(tag as Tag)) {
          errors.push({
            path: `tags[${idx}]`,
            message: `Invalid tag "${tag}". Must be one of: ${TAGS.join(', ')}`,
          });
        }
      });
    }
  }

  if (data.accessible_alternative !== undefined) {
    if (typeof data.accessible_alternative !== 'string') {
      errors.push({
        path: 'accessible_alternative',
        message: 'accessible_alternative must be a string',
      });
    } else {
      if (containsHtmlOrMarkdown(data.accessible_alternative)) {
        errors.push({
          path: 'accessible_alternative',
          message: 'accessible_alternative must be plain text',
        });
      }
      checkBannedPhrases('accessible_alternative', data.accessible_alternative, errors);
    }
  }

  // 5. Facts
  if (data.notice_period !== undefined) {
    validateFact(data.notice_period, 'notice_period', errors);
  }
  if (data.refund_window !== undefined) {
    validateFact(data.refund_window, 'refund_window', errors);
  }
  if (data.auto_renews !== undefined) {
    validateFact(data.auto_renews, 'auto_renews', errors);
  }

  // 6. Provenance
  if (!Array.isArray(data.contributors) || data.contributors.length === 0) {
    errors.push({
      path: 'contributors',
      message: 'contributors is required and must contain at least one handle',
    });
  }

  if (!Array.isArray(data.reviewers)) {
    errors.push({
      path: 'reviewers',
      message: 'reviewers is required and must be an array of handles',
    });
  }

  if (typeof data.verified_on !== 'string' || !isValidDate(data.verified_on)) {
    errors.push({
      path: 'verified_on',
      message: 'verified_on is required and must be a valid date in YYYY-MM-DD format',
    });
  }

  if (!data.verification_method || typeof data.verification_method !== 'string') {
    errors.push({ path: 'verification_method', message: 'verification_method is required' });
  } else if (!VERIFICATION_METHODS.includes(data.verification_method as VerificationMethod)) {
    errors.push({
      path: 'verification_method',
      message: `Invalid verification_method "${data.verification_method}". Must be one of: ${VERIFICATION_METHODS.join(', ')}`,
    });
  }

  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    errors.push({
      path: 'sources',
      message: 'sources is required and must contain at least one source',
    });
  } else {
    data.sources.forEach((src, idx) => {
      validateSource(src, `sources[${idx}]`, errors);
    });

    const hasMatchingSource = (data.sources as Array<{ url?: string }>).some(
      (src) => src && typeof src.url === 'string' && sourceMatchesWebsite(src.url, data.website as string),
    );
    if (!hasMatchingSource && typeof data.website === 'string' && data.website.trim()) {
      errors.push({
        path: 'sources',
        message: `At least one source host must match the service website domain ("${extractDomain(data.website as string)}")`,
      });
    }
  }

  if (typeof data.revision !== 'number' || !Number.isInteger(data.revision) || data.revision < 1) {
    errors.push({
      path: 'revision',
      message: 'revision is required and must be an integer >= 1',
    });
  }

  // 7. Status
  if (!data.status || typeof data.status !== 'string') {
    errors.push({ path: 'status', message: 'status is required' });
  } else if (!STATUSES.includes(data.status as Status)) {
    errors.push({
      path: 'status',
      message: `Invalid status "${data.status}". Must be one of: ${STATUSES.join(', ')}`,
    });
  } else if (data.status !== 'draft') {
    // Draft promotion rule: A playbook with a missing verification method or verified_on date cannot leave draft
    if (!data.verified_on || !isValidDate(data.verified_on as string)) {
      errors.push({
        path: 'status',
        message: 'A playbook cannot leave draft status without a valid verified_on date',
      });
    }
    if (!data.verification_method) {
      errors.push({
        path: 'status',
        message: 'A playbook cannot leave draft status without a verification_method',
      });
    }

    // Require sha256 and accessed_on fetch date on every source before leaving draft
    if (Array.isArray(data.sources)) {
      data.sources.forEach((src, idx) => {
        if (!isPlainObject(src) || typeof src.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(src.sha256)) {
          errors.push({
            path: `sources[${idx}].sha256`,
            message: 'A playbook cannot leave draft status without a valid 64-character hex sha256 digest on every source',
          });
        }
        if (!isPlainObject(src) || typeof src.accessed_on !== 'string' || !isValidDate(src.accessed_on)) {
          errors.push({
            path: `sources[${idx}].accessed_on`,
            message: 'A playbook cannot leave draft status without an accessed_on fetch date on every source',
          });
        }
      });
    }

    if (data.status === 'active') {
      if (!Array.isArray(data.reviewers) || data.reviewers.length === 0) {
        errors.push({
          path: 'reviewers',
          message: 'An active playbook must have at least one human reviewer',
        });
      }
      if (Array.isArray(data.contributors) && data.contributors.includes('ai-draft')) {
        errors.push({
          path: 'status',
          message: 'A playbook with "ai-draft" as contributor cannot have status "active"',
        });
      }
      if (Array.isArray(data.reviewers) && data.reviewers.includes('ai-draft')) {
        errors.push({
          path: 'reviewers',
          message: '"ai-draft" cannot be a reviewer',
        });
      }
    }
  }

  if (typeof data.status_reason !== 'string' || !data.status_reason.trim()) {
    errors.push({
      path: 'status_reason',
      message: 'status_reason is required and must be a non-empty string',
    });
  } else {
    if (containsHtmlOrMarkdown(data.status_reason)) {
      errors.push({ path: 'status_reason', message: 'status_reason must be plain text' });
    }
    checkBannedPhrases('status_reason', data.status_reason, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateChannel(
  channelData: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  status?: Status,
  availableSourceUrls: string[] = [],
): void {
  if (!isPlainObject(channelData)) {
    errors.push({ path, message: 'channel must be an object' });
    return;
  }

  const allowedChannelKeys = new Set(['channel', 'entry_url', 'steps', 'notes', 'source']);
  for (const key of Object.keys(channelData)) {
    if (!allowedChannelKeys.has(key)) {
      errors.push({ path: `${path}.${key}`, message: `Unknown channel property: ${key}` });
    }
  }

  if (!channelData.channel || typeof channelData.channel !== 'string') {
    errors.push({ path: `${path}.channel`, message: 'channel type is required' });
  } else if (!CHANNELS.includes(channelData.channel as Channel)) {
    errors.push({
      path: `${path}.channel`,
      message: `Invalid channel "${channelData.channel}". Must be one of: ${CHANNELS.join(', ')}`,
    });
  }

  if (channelData.entry_url !== undefined) {
    if (typeof channelData.entry_url !== 'string' || !isValidHttpsUrl(channelData.entry_url)) {
      errors.push({
        path: `${path}.entry_url`,
        message: 'entry_url must be a valid https URL',
      });
    }
  }

  if (channelData.source !== undefined) {
    if (typeof channelData.source !== 'string' || !isValidHttpsUrl(channelData.source)) {
      errors.push({
        path: `${path}.source`,
        message: 'channel source must be a valid https URL',
      });
    } else if (!availableSourceUrls.includes(channelData.source)) {
      errors.push({
        path: `${path}.source`,
        message: `channel source "${channelData.source}" must point to one of the playbook's sources`,
      });
    }
  }

  if (!Array.isArray(channelData.steps)) {
    errors.push({
      path: `${path}.steps`,
      message: 'steps is required and must be an array',
    });
  } else if (channelData.steps.length === 0) {
    if (status !== 'draft') {
      errors.push({
        path: `${path}.steps`,
        message: 'steps must contain at least one step for non-draft playbooks',
      });
    } else if (!channelData.notes) {
      errors.push({
        path: `${path}.steps`,
        message: 'steps in draft playbooks may only be empty if notes explaining the unsourced steps is provided',
      });
    }
  } else {
    if (!channelData.source) {
      if (status === 'draft') {
        warnings.push({
          path: `${path}.source`,
          message: 'channel with steps should specify a source URL pointing to one of the playbook\'s sources',
        });
      } else {
        errors.push({
          path: `${path}.source`,
          message: 'A channel with steps must carry a source pointing to one of the playbook\'s sources before leaving draft status',
        });
      }
    }

    channelData.steps.forEach((step, sIdx) => {
      const stepPath = `${path}.steps[${sIdx}]`;
      let action = '';

      if (typeof step === 'string') {
        action = step;
      } else if (isPlainObject(step)) {
        if (typeof step.action !== 'string') {
          errors.push({ path: `${stepPath}.action`, message: 'step action is required' });
        } else {
          action = step.action;
        }
        if (step.link !== undefined) {
          if (typeof step.link !== 'string' || !isValidHttpsUrl(step.link)) {
            errors.push({ path: `${stepPath}.link`, message: 'step link must be an https URL' });
          }
        }
      } else {
        errors.push({ path: stepPath, message: 'step must be a string or step object' });
        return;
      }

      if (action) {
        if (action.length > 200) {
          errors.push({
            path: `${stepPath}.action`,
            message: `step action exceeds 200 characters (length: ${action.length})`,
          });
        }
        if (containsHtmlOrMarkdown(action)) {
          errors.push({
            path: `${stepPath}.action`,
            message: 'step action must be plain text without HTML or Markdown',
          });
        }
        checkBannedPhrases(`${stepPath}.action`, action, errors);

        // Readability check
        const grade = estimateFleschKincaidGrade(action);
        if (grade > 8.0) {
          warnings.push({
            path: `${stepPath}.action`,
            message: `Step readability grade (${grade}) exceeds target of grade 8.0`,
          });
        }
      }
    });
  }

  if (channelData.notes !== undefined) {
    if (typeof channelData.notes !== 'string') {
      errors.push({ path: `${path}.notes`, message: 'notes must be a string' });
    } else {
      if (containsHtmlOrMarkdown(channelData.notes)) {
        errors.push({ path: `${path}.notes`, message: 'notes must be plain text' });
      }
      checkBannedPhrases(`${path}.notes`, channelData.notes, errors);
    }
  }
}

function validateFact(factData: unknown, path: string, errors: ValidationError[]): void {
  if (!isPlainObject(factData)) {
    errors.push({ path, message: 'fact must be an object' });
    return;
  }
  if (factData.value === undefined || (typeof factData.value !== 'string' && typeof factData.value !== 'boolean')) {
    errors.push({ path: `${path}.value`, message: 'fact value must be a string or boolean' });
  } else if (typeof factData.value === 'string') {
    if (factData.value.trim().toLowerCase() === 'none') {
      errors.push({ path: `${path}.value`, message: 'Do not use "None"; omit the fact field when unknown' });
    }
    if (containsPlaceholders(factData.value)) {
      errors.push({ path: `${path}.value`, message: 'fact value cannot contain placeholder text' });
    }
  }
  if (typeof factData.source !== 'string' || !isValidHttpsUrl(factData.source)) {
    errors.push({ path: `${path}.source`, message: 'fact source must be an https URL' });
  } else if (containsPlaceholders(factData.source)) {
    errors.push({ path: `${path}.source`, message: 'fact source cannot contain placeholder domain' });
  }
  if (typeof factData.accessed_on !== 'string' || !isValidDate(factData.accessed_on)) {
    errors.push({ path: `${path}.accessed_on`, message: 'fact accessed_on must be a date (YYYY-MM-DD)' });
  }
}

function validateSource(sourceData: unknown, path: string, errors: ValidationError[]): void {
  if (!isPlainObject(sourceData)) {
    errors.push({ path, message: 'source must be an object' });
    return;
  }
  if (typeof sourceData.url !== 'string' || !isValidHttpsUrl(sourceData.url)) {
    errors.push({ path: `${path}.url`, message: 'source url must be an https URL' });
  } else if (containsPlaceholders(sourceData.url)) {
    errors.push({ path: `${path}.url`, message: 'source url cannot contain placeholder domain' });
  }
  if (typeof sourceData.accessed_on !== 'string' || !isValidDate(sourceData.accessed_on)) {
    errors.push({ path: `${path}.accessed_on`, message: 'source accessed_on must be a date (YYYY-MM-DD)' });
  }
  if (sourceData.sha256 !== undefined) {
    if (typeof sourceData.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sourceData.sha256)) {
      errors.push({
        path: `${path}.sha256`,
        message: 'source sha256 must be a 64-character lowercase hex SHA-256 digest',
      });
    }
  }
}

function checkBannedPhrases(path: string, text: string, errors: ValidationError[]): void {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_LEGAL_PHRASES) {
    if (lower.includes(phrase)) {
      errors.push({
        path,
        message: `Contains banned legal phrase: "${phrase}"`,
      });
    }
  }
}
