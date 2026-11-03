// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node inspect-page.js <id>');
  process.exit(1);
}

const html = readFileSync(join(process.cwd(), `scratch/fetched-pages/${id}.html`), 'utf8');
const text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                 .replace(/<[^>]+>/g, ' ')
                 .replace(/\s+/g, ' ');

// Look for cancel keywords and print surrounding text
const idx = text.toLowerCase().indexOf('cancel');
if (idx !== -1) {
  console.log(text.slice(Math.max(0, idx - 100), idx + 2500));
} else {
  console.log('No cancel found in text. First 2000 chars:');
  console.log(text.slice(0, 2000));
}
