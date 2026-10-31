<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP2 Spec and Validator Implementation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP2 — Spec and Validator

## Context

WP2 defines the core schema, types, enums, constants, and validation logic for cancellation playbooks, along with conformance test fixtures (both valid and invalid).

## Approach

1. **Pure TypeScript without schema runtime libraries**: In accordance with the third-party policy (no unapproved dependencies) and spec constraints ("No dependencies; pure functions"), we implement a pure TypeScript validator with clear, actionable error messages.

2. **Strict types and enums**:
   - `Region`: `US`, `UK`, `EU`, `IN`, `GLOBAL`
   - `Channel`: `direct`, `apple`, `google-play`, `carrier-billing`, `paypal`, `bank-mandate`, `other`
   - `Category`: 13 specific categories per section 5
   - `Tag`: 11 specific friction tags per section 5
   - `VerificationMethod`: `first-hand`, `official-help-page`, `community-report`
   - `Status`: `draft`, `active`, `stale`, `broken`, `discontinued`

3. **Validation Rules**:
   - ID: lowercase kebab-case ASCII (`^[a-z0-9]+(-[a-z0-9]+)*$`)
   - Text fields: plain text only (no HTML tags, no markdown formatting)
   - Step actions: plain text, max 200 characters, optional https link
   - Links: https only
   - Merchant patterns: uppercase ASCII, numbers, spaces, only `*` wildcard
   - Dates: YYYY-MM-DD ISO format
   - Draft promotion check: non-draft playbooks must have `verified_on` and `verification_method`
   - Banned legal-advice phrases: flagged as errors
   - Readability check: warning if Flesch-Kincaid grade level > 8.0

4. **Conformance Fixtures**:
   - 10 valid reference playbooks representing US, UK, EU, IN, and GLOBAL services
   - Suite of invalid fixtures asserting descriptive failure messages for each constraint

## Alternatives rejected

- **Zod/Joi/Ajv**: Adds third-party runtime dependencies which are not in the approved allowlist in Section 3.
- **Permissive text fields**: Permitting Markdown or HTML would introduce XSS attack surfaces in downstream consumers.

## Risks

- Readability scoring (Flesch-Kincaid) is heuristic; treated as a lint warning rather than blocking error.
