// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { RecurrenceResult } from './types.js';

export interface ConfidenceAssessment {
  score: number; // 0 - 100
  tier: 'likely' | 'possible' | 'hidden';
  regularityPoints: number;
  chargeCountPoints: number;
  amountStabilityPoints: number;
  playbookMatchPoints: number;
}

export function computeConfidenceScore(
  recurrence: RecurrenceResult,
  hasPlaybookMatch: boolean,
): ConfidenceAssessment {
  const regularityPoints = recurrence.regularityScore; // max 35
  const chargeCountPoints = recurrence.chargeCountScore; // max 20
  const amountStabilityPoints = recurrence.amountStabilityScore; // max 25
  const playbookMatchPoints = hasPlaybookMatch ? 20 : 0; // max 20

  const total = Math.min(
    100,
    regularityPoints + chargeCountPoints + amountStabilityPoints + playbookMatchPoints,
  );

  let tier: 'likely' | 'possible' | 'hidden' = 'hidden';
  if (total >= 60) {
    tier = 'likely';
  } else if (total >= 40) {
    tier = 'possible';
  }

  return {
    score: total,
    tier,
    regularityPoints,
    chargeCountPoints,
    amountStabilityPoints,
    playbookMatchPoints,
  };
}
