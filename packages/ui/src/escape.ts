// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ESCAPE_MAP[m] || m);
}

export function escapeAttribute(str: string): string {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ESCAPE_MAP[m] || m);
}
