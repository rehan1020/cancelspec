// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {
  Category,
  Channel,
  Outcome,
  PlaybookKind,
  Status,
  Tag,
  VerificationMethod,
} from './constants.js';

export interface ChannelStepObject {
  action: string;
  link?: string;
}

export type ChannelStep = string | ChannelStepObject;

export interface PlaybookChannel {
  channel: Channel;
  entry_url?: string;
  steps: ChannelStep[];
  notes?: string;
  source?: string;
}

export interface Fact {
  value: string | boolean;
  source: string;
  accessed_on: string;
}

export interface Source {
  url: string;
  accessed_on: string;
  sha256?: string;
}

export interface Playbook {
  // Identity
  id: string;
  name: string;
  aliases?: string[];
  category: Category;
  website: string;
  kind?: PlaybookKind;
  outcome?: Outcome;

  // Matching
  merchant_patterns: string[];

  // Channels
  channels: PlaybookChannel[];

  // Friction
  tags?: Tag[];
  accessible_alternative?: string;

  // Facts
  notice_period?: Fact;
  refund_window?: Fact;
  auto_renews?: Fact;

  // Provenance
  contributors: string[];
  reviewers: string[];
  verified_on: string;
  verification_method: VerificationMethod;
  sources: Source[];
  revision: number;

  // Status
  status: Status;
  status_reason: string;
}

export interface DerivedPlaybookFields {
  difficulty: number;
  accessible_to_cancel: boolean;
  staleness_days: number;
  matcher_key: string;
}

export interface CompiledPlaybook extends Playbook, DerivedPlaybookFields {
  region: string;
  kind: PlaybookKind;
  outcome: Outcome;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
