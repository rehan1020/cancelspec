// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  computeContentSeal,
  validatePlaybook,
  type Playbook,
  type HumanVerificationMethod,
  HUMAN_VERIFICATION_METHODS,
} from '@cancelspec/spec';
import { parse, stringify } from 'yaml';

export interface VerifyOptions {
  handle?: string | undefined;
  method?: string | undefined;
}

export function verifyPlaybook(
  filePath: string,
  options: VerifyOptions = {},
): { filePath: string; playbook: Playbook } {
  if (!options.handle || !options.handle.trim()) {
    throw new Error('--handle is required to verify a playbook.');
  }

  const handle = options.handle.trim();
  if (handle === 'ai-draft' || handle === 'claude-ai') {
    throw new Error(`"${handle}" cannot be used as a human verifier handle.`);
  }

  if (!existsSync(filePath)) {
    throw new Error(`Playbook not found at: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf8');
  const data = parse(raw) as Playbook;

  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid playbook file content at: ${filePath}`);
  }

  // Warn if no merchant patterns
  if (!Array.isArray(data.merchant_patterns) || data.merchant_patterns.length === 0) {
    console.warn(`Warning: Playbook "${data.id || filePath}" has no merchant patterns.`);
  }

  // Replace ai-draft and claude-ai in contributors
  const contributors = Array.isArray(data.contributors)
    ? data.contributors.filter((c) => c !== 'ai-draft' && c !== 'claude-ai')
    : [];
  if (!contributors.includes(handle)) {
    contributors.push(handle);
  }
  data.contributors = contributors;

  // Set reviewers (replaces claude-ai)
  const reviewers = Array.isArray(data.reviewers)
    ? data.reviewers.filter((r) => r !== 'ai-draft' && r !== 'claude-ai')
    : [];
  if (!reviewers.includes(handle)) {
    reviewers.push(handle);
  }
  data.reviewers = reviewers;

  // Set verified_on
  const today = new Date().toISOString().slice(0, 10);
  data.verified_on = today;

  // Set verification_method
  let method: HumanVerificationMethod = 'first-hand';
  if (options.method) {
    if (!HUMAN_VERIFICATION_METHODS.includes(options.method as HumanVerificationMethod)) {
      throw new Error(
        `Invalid human verification method "${options.method}". Must be one of: ${HUMAN_VERIFICATION_METHODS.join(', ')}`,
      );
    }
    method = options.method as HumanVerificationMethod;
  }
  data.verification_method = method;

  // Set status and status_reason
  data.status = 'active';
  data.status_reason = `Verified by ${handle} on ${today}`;
  data.content_seal = computeContentSeal(data);

  // Validate the updated playbook
  const result = validatePlaybook(data);
  if (!result.valid) {
    const errorDetails = result.errors
      .map((e) => `  - ${e.path ? e.path + ': ' : ''}${e.message}`)
      .join('\n');
    throw new Error(
      `Verification validation failed for ${filePath}:\n${errorDetails}`,
    );
  }

  const yamlContent =
    '# SPDX-FileCopyrightText: 2026 CancelSpec contributors\n# SPDX-License-Identifier: CC-BY-NC-SA-4.0\n\n' +
    stringify(data, { lineWidth: 0 });

  writeFileSync(filePath, yamlContent, 'utf8');

  return { filePath, playbook: data };
}
