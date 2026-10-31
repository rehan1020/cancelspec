<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP9 Automated Gates (Privacy, A11Y, Budgets, Reproducibility, Offline)

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP9 — Automated Gates

## Context

Section 10, Section 11, and Section 16 of `docs/PLAN.md` define the automated acceptance gates that every commit and pull request must pass:
1. **Privacy engineering evidence**:
   - `no-network-during-scan`: Proves 0 HTTP/network calls during/after statement processing.
   - `no-storage-writes`: Proves 0 persistent writes (`localStorage`, `sessionStorage`, `document.cookie`).
   - `no-third-party-requests`: Proves 0 external scripts, styles, fonts, or tracking pixels across all pages.
   - `csp-lint`: Strict CSP verification (`connect-src 'none'`, `frame-ancestors 'none'`, `object-src 'none'`).
   - `no-cookies`: 0 `Set-Cookie` headers and 0 cookie manipulation.
2. **Accessibility gates (A11Y-1 to A11Y-4)**:
   - Automated WCAG 2.2 AA audit with `axe-core` across all 12 generated page types.
   - Heading hierarchy (exactly one `<h1>`, ordered `<h2>`, `<h3>`).
   - Skip links pointing to `#main-content`.
   - Responsive rules for `prefers-reduced-motion` and `forced-colors`.
3. **Size budget gates**:
   - Service page: <= 100 KB transfer size (with 0 required JavaScript).
   - Home page: <= 60 KB transfer size.
   - Tool page (including Worker and index): <= 300 KB transfer size.
   - CSS: <= 30 KB.
4. **Reproducible builds gate**:
   - Compares SHA-256 hashes of all generated files across two independent builds.
5. **Offline capability gate**:
   - Asserts all assets are strictly local/same-origin.

## Approach

1. **Integrated Test Suite**:
   - Created test modules in `tests/`: `privacy.test.ts`, `accessibility.test.ts`, `budgets.test.ts`, `reproducible_build.test.ts`, `offline.test.ts`.
   - Implemented `tests/global-setup.ts` in `vitest.config.ts` to build the shared test site once in Node before test execution, ensuring zero environment race conditions and preventing `esbuild` initialization conflicts with jsdom.

2. **Measured Results**:
   - Home page: 4.27 KB (Budget: <= 60 KB).
   - Service pages: ~5-8 KB with 0 `<script>` tags (Budget: <= 100 KB).
   - Tool page total transfer: 71.70 KB (Budget: <= 300 KB).
   - Main stylesheet: ~10 KB (Budget: <= 30 KB).
   - `axe-core`: 0 violations across all 12 page types.
   - Reproducible build: 100% bit-for-bit identical SHA-256 hashes across 44 files.
   - Privacy gates: All 5 checks passing.

## Verification

- `npm test` runs all package tests and all 41 gate tests in `tests/` (128 total tests passing).
- `npm run typecheck` passing with zero errors.
- REUSE 3.3 compliance: 151/151 files compliant.
