// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Playbook } from '@cancelspec/spec';

/**
 * Difficulty rubric v0:
 * - 4-6 steps: 1 pt; 7 or more steps: 2 pts
 * - phone-required: 2 pts
 * - chat-only: 1 pt
 * - retention-offer: 1 pt
 * - survey-wall: 0.5 pts
 * - hidden-entry: 1 pt
 * - captcha: 1 pt
 * - app-required: 1 pt
 *
 * Points map to bands 1-5:
 * 0 - 1.0  => 1
 * 1.5 - 2.5 => 2
 * 3.0 - 4.0 => 3
 * 4.5 - 5.5 => 4
 * >= 6.0    => 5
 */
export function computeDifficulty(playbook: Playbook): number {
  let points = 0;

  // Max steps across channels
  let maxSteps = 0;
  for (const channel of playbook.channels) {
    if (channel.steps && channel.steps.length > maxSteps) {
      maxSteps = channel.steps.length;
    }
  }

  if (maxSteps >= 7) {
    points += 2;
  } else if (maxSteps >= 4) {
    points += 1;
  }

  const tags = new Set(playbook.tags || []);

  if (tags.has('phone-required')) points += 2;
  if (tags.has('chat-only')) points += 1;
  if (tags.has('retention-offer')) points += 1;
  if (tags.has('survey-wall')) points += 0.5;
  if (tags.has('hidden-entry')) points += 1;
  if (tags.has('captcha')) points += 1;
  if (tags.has('app-required')) points += 1;

  if (points <= 1.0) return 1;
  if (points <= 2.5) return 2;
  if (points <= 4.0) return 3;
  if (points <= 5.5) return 4;
  return 5;
}

/**
 * accessible_to_cancel is false when phone-required, captcha, or app-required applies
 * and no accessible_alternative exists.
 */
export function isAccessibleToCancel(playbook: Playbook): boolean {
  const tags = new Set(playbook.tags || []);
  const hasBarrier =
    tags.has('phone-required') ||
    tags.has('captcha') ||
    tags.has('app-required');

  if (!hasBarrier) {
    return true;
  }

  // If there is an accessible alternative stated, it is accessible
  return Boolean(
    playbook.accessible_alternative && playbook.accessible_alternative.trim().length > 0,
  );
}

export function computeStalenessDays(verifiedOn: string, referenceDate: Date = new Date()): number {
  const verified = new Date(verifiedOn);
  const diffMs = referenceDate.getTime() - verified.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}
