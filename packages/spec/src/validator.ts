// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  BANNED_LEGAL_PHRASES,
  CATEGORIES,
  CHANNELS,
  STATUSES,
  TAGS,
  VERIFICATION_METHODS,
  type Category,
  type Channel,
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
  }

  // 2. Matching
  // merchant_patterns
  if (!Array.isArray(data.merchant_patterns) || data.merchant_patterns.length === 0) {
    errors.push({
      path: 'merchant_patterns',
      message: 'merchant_patterns is required and must contain at least one pattern',
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
      }
    });
  }

  // 3. Channels
  if (!Array.isArray(data.channels) || data.channels.length === 0) {
    errors.push({
      path: 'channels',
      message: 'channels is required and must contain at least one channel',
    });
  } else {
    data.channels.forEach((ch, idx) => {
      validateChannel(ch, `channels[${idx}]`, errors, warnings);
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
): void {
  if (!isPlainObject(channelData)) {
    errors.push({ path, message: 'channel must be an object' });
    return;
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

  if (!Array.isArray(channelData.steps) || channelData.steps.length === 0) {
    errors.push({
      path: `${path}.steps`,
      message: 'steps is required and must contain at least one step',
    });
  } else {
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
  }
  if (typeof factData.source !== 'string' || !isValidHttpsUrl(factData.source)) {
    errors.push({ path: `${path}.source`, message: 'fact source must be an https URL' });
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
  }
  if (typeof sourceData.accessed_on !== 'string' || !isValidDate(sourceData.accessed_on)) {
    errors.push({ path: `${path}.accessed_on`, message: 'source accessed_on must be a date (YYYY-MM-DD)' });
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
