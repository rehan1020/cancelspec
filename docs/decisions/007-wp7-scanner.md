<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP7 Scanner Engine Implementation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP7 — Scanner Engine (Stages 1-12)

## Context

WP7 implements the statement scanner engine across Stages 1 through 12, designed to execute purely in-memory inside a browser Web Worker or background task without network or storage access.

## Approach

1. **Pure in-memory modular stages**:
   - **Stage 1 (Intake)**: Streaming or chunked text intake, BOM detection, delimiter inference (`,`, `\t`, `;`, `|`), preamble line skipping, quoted CSV row parsing with linear state machine.
   - **Stage 2 (Column Mapping)**: Automatic scoring of date, description, amount, and debit/credit columns with confidence metrics.
   - **Stage 3 (Date Parsing)**: Multi-format parsing (ISO, DD/MM/YYYY, MM/DD/YYYY, D MMM YYYY), inferring day-first vs month-first.
   - **Stage 4 (Amount Parsing)**: Robust decimal separators (comma vs period), lakh notation, parentheses/minus signs, debit/credit polarity detection.
   - **Stage 5 (Normalization)**: Leverages `@cancelspec/core` normalization.
   - **Stage 6 (Grouping & Merging)**: Exact grouping using `Map`, token-set Jaccard similarity >= 0.8, prefix matching.
   - **Stage 7 (Recurrence Detection)**: Cadence windows (weekly 6-8d, biweekly 12-16d, monthly 26-35d/same DOM, quarterly 89-94d, semiannual 175-190d, annual 358-373d). Amount stability analysis allowing single price step.
   - **Stage 8 (Confidence Scoring)**: 0-100 composite score (regularity 35, charge count 20, stability 25, playbook match 20). Classified into `likely` (>=60), `possible` (40-59), and hidden (<40). Overdue detection (flagged if >1.5 cadences since latest statement date).
   - **Stage 9 (Playbook Matching)**: Pattern matching against `AliasIndex` (exact 1.0, prefix 0.9, token-set Jaccard >= 0.8).
   - **Stage 10 (Output & Annualization)**: Annualized calculations, totals per currency without cross-currency conversion, sorted by annualized cost.
   - **Stage 11 (Privacy & Safety)**: Never logs statement content; error messages describe parse structure only.
   - **Stage 12 (Web Worker Protocol)**: Worker message protocol (`SCAN_START`, `SCAN_PROGRESS`, `SCAN_COMPLETE`, `MAPPING_REQUIRED`, `SCAN_ERROR`).

2. **Security & Privacy Enforcements**:
   - Zero imports of `fetch`, `XMLHttpRequest`, `localStorage`, `sessionStorage`, `indexedDB`.
   - Linear-time parser preventing catastrophic backtracking (ReDoS).

## Alternatives rejected

- **PapaParse**: Third-party library; not on the allowlist. Our authored streaming CSV parser is lightweight, zero-dependency, and strictly enforces Section 6 intake constraints.

## Risks

- Ambiguous dates (e.g. 05/06/2026): Inferred based on range analysis of other dates in the statement; offers confidence metric.
