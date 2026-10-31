<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP10 Content Refinement (Hall of Shame & Methodology)

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP10 — Content Refinement

## Context

Section 8 and Section 15 of `docs/PLAN.md` dictate the editorial and architectural rules for consumer guidance:
1. **Hall of Shame (`/hall-of-shame/`)**:
   - Must be derived 100% objectively from verified playbook friction tags (`phone-required`, `chat-only`, `survey-wall`, etc.).
   - Absolutely no subjective or defamatory editorial remarks.
   - Highlights accessibility barriers (`accessible_to_cancel = false`) for users needing non-voice/non-CAPTCHA options.
   - Summarizes cataloged friction tag frequencies.
2. **Methodology Page (`/methodology/`)**:
   - Transparently documents Difficulty Rubric v0 (points and bands 1-5).
   - Details `accessible_to_cancel` criteria.
   - Details the 3-tier evidence hierarchy (First-hand, Official help page, Community report).
   - Documents staleness policy (180-day warning, 365-day archive review) and broken playbook triage (3 reports flag broken).
   - Clear informational disclaimer (no legal advice, nominative fair use of marks).

## Approach

- Updated `renderHallOfShamePage` with readable badge mapping (`TAG_LABELS`), accessibility status indicators, and summary frequency statistics.
- Updated `renderMethodologyPage` with clear sectioning, full rubric scoring tables, evidence hierarchy standards, and privacy architecture disclosures.
- Verified WCAG 2.2 AA accessibility via `axe-core` on both pages with 0 violations.

## Verification

- `npm test` passing with all 128 tests green.
- REUSE 3.3 compliance verified.
