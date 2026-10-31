// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AliasIndex } from '@cancelspec/core/index_builder';
import { setupWorkerHandler, type WorkerInMessage } from '../worker.js';

// Pre-compiled alias index placeholder; replaced or augmented at bundle time
let embeddedIndex: AliasIndex | undefined = undefined;

try {
  // @ts-expect-error - injected during build if available
  if (typeof globalThis.__CANCELEMBEDDED_INDEX__ !== 'undefined') {
    // @ts-expect-error
    embeddedIndex = globalThis.__CANCELEMBEDDED_INDEX__;
  }
} catch {
  // Ignore
}

const handler = setupWorkerHandler(
  (msg) => {
    self.postMessage(msg);
  },
  () => embeddedIndex,
);

self.addEventListener('message', (e: MessageEvent<WorkerInMessage>) => {
  handler(e);
});
