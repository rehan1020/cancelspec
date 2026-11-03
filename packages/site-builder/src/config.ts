// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

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

function findProjectConfigPath(startDir = process.cwd()): string | null {
  let curr = resolve(startDir);
  while (true) {
    const candidate = join(curr, 'project.config');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

export function loadProjectConfig(rootOrPath?: string): ProjectConfig {
  let configPath: string;
  if (rootOrPath?.endsWith('.config')) {
    configPath = rootOrPath;
  } else if (rootOrPath) {
    configPath = join(rootOrPath, 'project.config');
  } else {
    configPath = findProjectConfigPath() || join(process.cwd(), 'project.config');
  }

  const content = readFileSync(configPath, 'utf8');
  return JSON.parse(content) as ProjectConfig;
}
