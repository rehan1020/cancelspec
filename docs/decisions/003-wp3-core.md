<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP3 Core Implementation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP3 — Core

## Context

WP3 implements the core engine of CancelSpec: playbook loader, normalization, alias index generation, difficulty scoring according to rubric v0, and deterministic release bundle creation.

## Approach

1. **Difficulty Scoring Rubric v0**:
   - Computes score based on step count and friction tags:
     - 4-6 steps: 1 point, 7+ steps: 2 points
     - phone-required: 2 points
     - chat-only: 1 point
     - retention-offer: 1 point
     - survey-wall: 0.5 points
     - hidden-entry: 1 point
     - captcha: 1 point
     - app-required: 1 point
   - Maps raw points to score bands 1-5.
   - `accessible_to_cancel`: Evaluates to `false` if `phone-required`, `captcha`, or `app-required` is present without an `accessible_alternative`, otherwise `true`.

2. **Merchant Normalization**:
   - NFKC Unicode normalization, uppercase.
   - Strips noise tokens (POS, PURCHASE, DEBIT, CARD, UPI, NEFT, IMPS, ACH, SEPA, DD, SI, AUTOPAY, RECURRING, PAYMENT, TXN, REF).
   - Removes digit sequences >= 4.
   - Extracts processor hints (PayPal, Google, Apple, Square).
   - Generates at most 6 uppercase tokens joined by space.

3. **Playbook Loader**:
   - Discovers all `.yaml` files in `playbooks/REGION/`.
   - Parses and validates each playbook.
   - Computes derived fields (`difficulty`, `accessible_to_cancel`, `staleness_days`, `matcher_key`).
   - Filters out `draft` playbooks from public distribution.
   - Sorts playbooks deterministically.

4. **Alias and Matcher Index**:
   - Inverts merchant patterns, service names, and aliases into normalized lookup maps for fast matching in the scanner.

5. **Bundle Writer**:
   - Generates deterministic JSON bundle with sorted keys and version metadata.

## Alternatives rejected

- Generating bundles with nondeterministic object key orders: Rejected because reproducible builds (OPEN-2) require identical hashes.

## Risks

- Time-dependent field `staleness_days`: Allows passing an explicit reference timestamp for reproducible builds.
