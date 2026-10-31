// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export const SPEC_VERSION = '0.1.0';

export const REGIONS = ['US', 'UK', 'EU', 'IN', 'GLOBAL'] as const;
export type Region = typeof REGIONS[number];

export const CHANNELS = [
  'direct',
  'apple',
  'google-play',
  'carrier-billing',
  'paypal',
  'bank-mandate',
  'other',
] as const;
export type Channel = typeof CHANNELS[number];

export const CATEGORIES = [
  'streaming-video',
  'streaming-music',
  'cloud-storage',
  'software',
  'vpn-security',
  'fitness-health',
  'news-media',
  'gaming',
  'education',
  'telecom-bundle',
  'delivery-membership',
  'finance-tools',
  'other',
] as const;
export type Category = typeof CATEGORIES[number];

export const TAGS = [
  'phone-required',
  'chat-only',
  'email-only',
  'retention-offer',
  'survey-wall',
  'hidden-entry',
  'captcha',
  'app-required',
  'in-person',
  'fee-on-exit',
  'long-notice',
] as const;
export type Tag = typeof TAGS[number];

export const VERIFICATION_METHODS = [
  'first-hand',
  'official-help-page',
  'community-report',
] as const;
export type VerificationMethod = typeof VERIFICATION_METHODS[number];

export const STATUSES = [
  'draft',
  'active',
  'stale',
  'broken',
  'discontinued',
] as const;
export type Status = typeof STATUSES[number];

export const BANNED_LEGAL_PHRASES = [
  'legal advice',
  'legally entitled',
  'under the law',
  'legal right',
  'your lawyer',
  'our lawyer',
  'legal action',
  'take legal action',
  'lawsuit',
  'seek legal',
  'we advise legally',
  'statutory right',
] as const;
