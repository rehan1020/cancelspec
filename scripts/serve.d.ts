// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Server } from 'node:http';

export function createPreviewServer(options?: {
  root?: string;
  subpath?: string;
}): Server;
