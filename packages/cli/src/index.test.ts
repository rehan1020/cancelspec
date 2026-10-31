// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect } from 'vitest';
import * as cli from './index.js';

describe('@cancelspec/cli', () => {
  it('loads the module', () => {
    expect(cli).toBeDefined();
  });
});
