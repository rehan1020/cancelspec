// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from 'vitest';
// @ts-expect-error fetch-targets is an ESM JS script
import { failedHosts, fetchUrl, fetchRenderedUrl } from '../scripts/fetch-targets.js';

describe('fetch-targets failed host skip behavior', () => {
  it('skips subsequent fetchUrl requests to a previously failed host', async () => {
    const testHost = 'failed-test-host.invalid';
    const testUrl = `https://${testHost}/cancel`;

    failedHosts.add(testHost);

    await expect(fetchUrl(testUrl)).rejects.toThrow(`Host ${testHost} was previously marked as failed`);
  });

  it('skips subsequent fetchRenderedUrl requests to a previously failed host', async () => {
    const testHost = 'failed-render-host.invalid';
    const testUrl = `https://${testHost}/cancel`;

    failedHosts.add(testHost);

    await expect(fetchRenderedUrl(testUrl)).rejects.toThrow(`Host ${testHost} was previously marked as failed`);
  });
});
