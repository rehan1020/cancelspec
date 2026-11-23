<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: 017 Manual Source Retrieval and Content Seal Verification

**Date**: 2026-11-18  
**Status**: Accepted  
**Deciders**: Project Maintainers  

## Context

Two operational challenges arose as CancelSpec expanded its catalog of cancellation playbooks:

1. **Uncrawlable Official Sources**: Certain services (such as LinkedIn) explicitly forbid automated HTTP access in their `robots.txt` or deploy anti-bot gating mechanisms. In accordance with CancelSpec's strict agent boundaries and ethics policies, automated crawlers and AI agents must never bypass access controls, spoof user agents, or scrape protected endpoints. However, users still require cancellation guidance. In these cases, a human must manually inspect the official help page in a standard browser.
2. **Post-Verification Integrity**: Once a human contributor verifies and activates a draft playbook, subsequent silent modifications to the cancellation steps, channels, facts, or merchant patterns could introduce errors or unreviewed instructions without tripping automated checks.

## Decision

1. **Manual Source Retrieval (`retrieval: manual`)**:
   - Add an optional `retrieval` field to the source schema with values `'automated'` (default) and `'manual'`.
   - Sources marked `'manual'` do not require a `sha256` checksum and are automatically skipped by automated audit commands (`packet`, `recheck`).
   - The playbook validator issues an informational note on playbooks with manual sources.
   - To prevent unverified AI content from entering production, any active playbook with manual sources is rejected if `ai-draft` is listed as a contributor. Active playbooks with manual sources strictly require at least one human reviewer and a `verification_method` of `first-hand` or `official-help-page`.

2. **Cryptographic Content Seal (`content_seal`)**:
   - The CLI verification command (`verify`) computes a canonical SHA-256 seal (`computeContentSeal`) over normalized channels, steps, facts, and merchant patterns upon promoting a playbook to `status: active`.
   - The playbook validator recomputes this hash during validation for all active playbooks. If `content_seal` is missing or does not match the recomputed digest, validation fails with `"content changed after verification; re-run verify"`.
   - Draft playbooks remain unaffected and do not require `content_seal`.

## Consequences

- AI agents and automated scripts can honestly record official sources that prohibit bot access without attempting evasion.
- Verified active playbooks are protected by a tamper-evident cryptographic seal, preventing unreviewed drift in cancellation instructions.
- All gating commands (`lint`, `release-check`, `verify`) uphold these integrity constraints across the repository.
