// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { join } from 'node:path';
import { buildSite } from '@cancelspec/site-builder';

export function setup() {
  const playbooksDir = join(process.cwd(), 'playbooks');
  const sharedSiteDir = join(process.cwd(), 'dist/test-gates-site');

  buildSite({
    playbooksDir,
    outDir: sharedSiteDir,
    quiet: true,
    referenceDate: new Date('2026-10-31T00:00:00.000Z'),
    includeDrafts: true,
  });
}
