// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createScannerApp } from './app.js';

function init() {
  const container = document.getElementById('tool-app');
  if (container) {
    createScannerApp(container);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
