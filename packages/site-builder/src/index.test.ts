// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest';
import * as siteBuilder from './index.js';

describe('@cancelspec/site-builder', () => {
  it('loads the module', () => {
    expect(siteBuilder).toBeDefined();
  });
});
