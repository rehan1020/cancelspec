// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { REGIONS, type Region } from '@cancelspec/spec';

export interface ScaffoldOptions {
  name?: string | undefined;
  category?: string | undefined;
  website?: string | undefined;
  force?: boolean | undefined;
}

function titleCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function scaffoldPlaybook(
  playbooksDir: string,
  regionInput: string,
  serviceId: string,
  options: ScaffoldOptions = {},
): { filePath: string; content: string } {
  const region = regionInput.toUpperCase() as Region;
  if (!REGIONS.includes(region)) {
    throw new Error(
      `Invalid region "${regionInput}". Must be one of: ${REGIONS.join(', ')}`,
    );
  }

  const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabRegex.test(serviceId)) {
    throw new Error(
      `Invalid service ID "${serviceId}". Must be lowercase kebab-case ASCII (e.g. "my-service").`,
    );
  }

  const name = options.name || titleCase(serviceId);
  const website = options.website || `https://${serviceId.replace(/-/g, '')}.TODO-fill-domain`;
  const pattern = `${serviceId.replace(/-/g, ' ').toUpperCase()}*`;

  const content = `# SPDX-FileCopyrightText: 2026 CancelSpec contributors
# SPDX-License-Identifier: CC-BY-NC-SA-4.0

id: ${serviceId}
name: ${name}
category: software
website: ${website}
merchant_patterns:
  - ${pattern}
channels:
  - channel: direct
    entry_url: ${website}/account
    steps:
      - Log into your account on the web dashboard.
      - Go to Account or Billing settings.
      - Select Cancel Subscription and confirm.
contributors:
  - ai-draft
reviewers: []
verified_on: TODO-fill-verified-on
verification_method: TODO-fill-verification-method
sources:
  - url: https://${serviceId.replace(/-/g, '')}.TODO-fill-domain/help
    accessed_on: TODO-fill-access-date
revision: 1
status: draft
status_reason: AI-drafted, awaiting human verification.
`;

  const targetDir = join(playbooksDir, region);
  const filePath = join(targetDir, `${serviceId}.yaml`);

  if (existsSync(filePath) && !options.force) {
    throw new Error(`Playbook already exists at ${filePath}. Use --force to overwrite.`);
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');

  return { filePath, content };
}
