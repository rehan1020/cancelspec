// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  computeContentSeal,
  validatePlaybook,
  type Playbook,
} from '@cancelspec/spec';
import { parse, stringify } from 'yaml';

export function checkAiPlaybook(
  filePath: string,
): { filePath: string; playbook: Playbook } {
  if (!existsSync(filePath)) {
    throw new Error(`Playbook not found at: ${filePath}`);
  }

  const raw = readFileSync(filePath, 'utf8');
  const data = parse(raw) as Playbook;

  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid playbook file content at: ${filePath}`);
  }

  // Require every source hash to be present
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    throw new Error(`check-ai requires at least one source in ${filePath}.`);
  }

  for (let i = 0; i < data.sources.length; i++) {
    const src = data.sources[i];
    if (!src || typeof src.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(src.sha256)) {
      throw new Error(
        `Source ${i + 1} (${src?.url || 'unknown'}) is missing a valid 64-character hex sha256 hash. check-ai requires hashes on every source.`,
      );
    }
  }

  // Set reviewers claude-ai, verification_method ai-assisted, verified_on today, status active
  const today = new Date().toISOString().slice(0, 10);
  data.status = 'active';
  data.reviewers = ['claude-ai'];
  data.verification_method = 'ai-assisted';
  data.verified_on = today;
  data.status_reason = 'AI-assisted check, not yet confirmed by a person.';

  // Compute content_seal
  data.content_seal = computeContentSeal(data);

  // Validate the updated playbook
  const result = validatePlaybook(data);
  if (!result.valid) {
    const errorDetails = result.errors
      .map((e) => `  - ${e.path ? e.path + ': ' : ''}${e.message}`)
      .join('\n');
    throw new Error(
      `check-ai validation failed for ${filePath}:\n${errorDetails}`,
    );
  }

  const yamlContent =
    '# SPDX-FileCopyrightText: 2026 CancelSpec contributors\n# SPDX-License-Identifier: CC-BY-NC-SA-4.0\n\n' +
    stringify(data, { lineWidth: 0 });

  writeFileSync(filePath, yamlContent, 'utf8');

  return { filePath, playbook: data };
}
