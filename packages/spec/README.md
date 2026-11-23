<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# @cancelspec/spec

This package contains the CancelSpec playbook specification, TypeScript types, constants, and schema validator.

## 1. File and Field Rules

| Item | Rule |
|---|---|
| Path and header | `playbooks/REGION/ID.yaml` (REGION is `US`, `UK`, `EU`, `IN`, or `GLOBAL`). Two header comment lines: `# SPDX-FileCopyrightText: 2026 CancelSpec contributors` and `# SPDX-License-Identifier: CC-BY-NC-SA-4.0` |
| `id` | Lowercase kebab-case ASCII, matching the file name |
| `name`, `aliases` | Plain text. Channel guides carry no aliases |
| `category` | One of: `streaming-video`, `streaming-music`, `cloud-storage`, `software`, `vpn-security`, `fitness-health`, `news-media`, `gaming`, `education`, `telecom-bundle`, `delivery-membership`, `finance-tools`, `other` |
| `website` | Domain or https URL of the brand; no placeholders |
| `kind`, `outcome` | `service` or `channel-guide`; `cancel`, `downgrade`, or `close-account` (defaults: service, cancel) |
| `merchant_patterns` | Uppercase letters, digits, spaces, and `*` only. Literal text of >= 6 characters and a word of >= 4 characters after processor prefixes. Optional for both draft and active playbooks |
| `pattern_source` | https URL referencing one of the sources with a sha256 hash. Required when `merchant_patterns` are present; must be omitted when `merchant_patterns` is empty |
| `channels` | At least one. Each has `channel` (`direct`, `apple`, `google-play`, `carrier-billing`, `paypal`, `bank-mandate`, `amazon`, `roku`, `other`), optional `entry_url` (https, required for direct channels with steps), `steps`, optional `notes`, and `source` |
| Steps | Plain text, 200 characters or fewer, no HTML or Markdown; a step may also be `action` plus an https `link` |
| Channel `source` | Required when the channel has steps, and it must equal one URL in `sources` |
| Empty steps | Allowed only in a draft, with a `notes` text explaining why |
| `tags` | Subset of: `phone-required`, `chat-only`, `email-only`, `retention-offer`, `survey-wall`, `hidden-entry`, `captcha`, `app-required`, `in-person`, `fee-on-exit`, `long-notice`. Must be absent or empty for drafts authored by `ai-draft` |
| Facts (`notice_period`, `refund_window`, `auto_renews`) | Each is `value` (text or true/false), `source` (https, must equal a URL in `sources`), `accessed_on` (date). Never the word "None"; omit when unknown |
| `contributors`, `reviewers` | Contributors: at least one handle. Reviewers: a list; `active` needs at least one human, and `ai-draft` is never a reviewer |
| `sources` | At least one: `url`, `accessed_on`, and `sha256` (64 hex characters, required to leave draft). At least one source host must match website domain or an allowlisted official help host |
| `verified_on`, `verification_method` | Date; `official-help-page`, `first-hand`, or `community-report` |
| `revision`, `status`, `status_reason` | Integer 1 or more; `draft`, `active`, `stale`, `broken`, or `discontinued`; plain text |
| Banned | Legal phrases such as "legal advice" or "under the law" in any text |

## 2. How to Write the Content

| Do | Don't |
|---|---|
| One action per step, starting with a verb | Filler like "Confirm to finish" or "Confirm your choice" unless the page states a confirmation |
| Use button, menu, and page names exactly as the official page prints them (*Finish Cancellation*, *Manage your plan*) | Rename labels for readability |
| Put the URL in `entry_url` or a step `link` when the page gives one | Invent a URL or point to a blog |
| Describe only what the fetched page states | Fill in from memory |
| Write original wording (no 8 consecutive words copied) | Copy sentences verbatim |
| For a billing branch with no page of its own, use `steps: []` plus a note | Write Apple or Google Play steps from a vendor page that doesn't contain them |
| Billing-branch note, exact form: "Subscriptions billed through Apple are cancelled through Apple; see the Apple Subscriptions guide." (same pattern for Google Play, PayPal, carrier, bank mandate, Amazon, Roku) | Free-form unsupported notes |

## 4. Who Sets What (Provenance and Roles)

| Field | Agent draft | Human at verification |
|---|---|---|
| Steps, channels, facts, sources, hash | Set from the fetched page | Check each against the live page; fix |
| `tags`, `accessible_alternative` | **Leave out**: official pages rarely state friction | Add from first-hand experience |
| `merchant_patterns`, `pattern_source` | Empty unless an official page lists descriptor; pattern_source points to that source | Add from your own statement (descriptor text only, no amounts or dates) or verify official source |
| `contributors` | `ai-draft` | Replace with your handle |
| `reviewers` | Empty (`[]`) | Your handle |
| `verified_on`, `verification_method` | Fetch date, `official-help-page` | Today's date; `first-hand` if you tested it, `official-help-page` if you reviewed page |
| `status`, `status_reason` | `draft`, "AI-drafted, awaiting human verification." | `active`, "Verified by HANDLE on DATE" |
| `revision` | 1 | Increment on every later change |
