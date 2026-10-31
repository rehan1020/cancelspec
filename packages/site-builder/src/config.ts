// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ProjectConfig {
  project: {
    name: string;
    slug: string;
    scope: string;
    description: string;
    version: string;
    specVersion: string;
  };
  repo: {
    url: string;
    defaultBranch: string;
  };
  site: {
    url: string;
    title: string;
    tagline: string;
    footer: string;
  };
  contact: {
    security: string;
    conduct: string;
    takedown: string;
    general: string;
  };
}

export function loadProjectConfig(rootOrPath?: string): ProjectConfig {
  let configPath: string;
  if (rootOrPath?.endsWith('.config')) {
    configPath = rootOrPath;
  } else {
    configPath = join(rootOrPath || process.cwd(), 'project.config');
  }

  const content = readFileSync(configPath, 'utf8');
  return JSON.parse(content) as ProjectConfig;
}
