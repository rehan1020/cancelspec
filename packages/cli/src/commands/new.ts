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
  const website = options.website || `https://${serviceId.replace(/-/g, '')}.example.com`;
  const pattern = `${serviceId.replace(/-/g, ' ').toUpperCase()}*`;
  const today = new Date().toISOString().split('T')[0]!;

  const content = `id: ${serviceId}
name: ${name}
aliases: []
category: software
website: ${website}
merchant_patterns:
  - ${pattern}
channels:
  - channel: direct
    entry_url: ${website}/account
    steps:
      - Log into your account in a web browser.
      - Navigate to your Account or Billing settings.
      - Select Cancel Subscription and follow the prompts to confirm.
    notes: Initial cancellation steps verified from official documentation.
contributors:
  - contributor
reviewers: []
verified_on: '${today}'
verification_method: official-help-page
sources:
  - url: ${website}/help
    accessed_on: '${today}'
revision: 1
status: draft
status_reason: Initial scaffold created via CLI.
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
