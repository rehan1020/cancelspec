<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP6 Synthetic Fixtures Generator Implementation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP6 — Synthetic Fixtures & Generator

## Context

WP6 implements a reproducible pseudo-random fixture generator and synthetic bank statements representing US, UK, EU, and IN banking layouts for testing statement parsing, grouping, recurrence detection, and matching.

## Approach

1. **Deterministic PRNG (Pseudo-Random Number Generator)**:
   - Uses a Linear Congruential Generator (LCG) or Mulberry32 with an explicit integer seed.
   - Identical seeds yield byte-for-byte identical synthetic statements and expected result JSONs across platforms.

2. **Regional Formats & Descriptor Styles**:
   - **US**: MM/DD/YYYY, single signed amount or Debit/Credit columns, descriptors with `*` (e.g. `NETFLIX.COM* 1234`, `SPOTIFY USA*`).
   - **UK**: DD/MM/YYYY, Direct Debit (`DD`) and Faster Payments (`FP`), e.g. `NOW TV DIRECT DEBIT`, `BBC SELECT DD`.
   - **EU**: DD/MM/YYYY or YYYY-MM-DD, comma as decimal separator (`1.234,56`), SEPA Lastschrift / Direct Debit descriptors.
   - **IN**: DD-MM-YYYY or DD/MM/YYYY, INR amounts with lakh notation (`1,23,456.78`), UPI AutoPay, ACH, and SI mandate descriptors (e.g. `UPI/HOTSTAR@HDFC/AUTOPAY`).

3. **Seeded Recurring Subscriptions & Noise**:
   - Varied cadences: weekly, biweekly, monthly, quarterly, semiannual, annual.
   - Edge cases: slight price adjustment, skipped/missed month, cancellation mid-period.
   - Realistic noise transactions: groceries, fuel, rent, salary credits, transfers, refunds, retail purchases.

4. **Output Structure**:
   - `fixtures/<region>-statement.csv` (or `.tsv`)
   - `fixtures/<region>-expected.json` (expected merchant keys, cadence buckets, charge counts, amount ranges)
   - Generator script runnable via `scripts/generate-fixtures.ts` or programmatic library.

## Alternatives rejected

- Using real, anonymized statements: Strictly forbidden by PRIV-1, PRIV-2, and Legal-1. Synthetic data ensures absolute zero leak of real personal or financial records.

## Risks

- Precision/recall drift when generator parameters change: Generator code is version-controlled and seeded tests ensure zero test regressions.
