<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP8 Tool UI and Client Application

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP8 — Tool UI and Client Application

## Context

Section 7 and Section 11 of the specification require a browser-only, zero-data tool UI with:
1. Two intake paths (drag-and-drop / file picker for CSV/TSV/TXT, or manual browsing).
2. Live accessibility announcements for scan progression and results (`aria-live="polite"`).
3. Column mapping preview form (5-row preview, selectors) when confidence < 0.8.
4. Results view:
   - Currency annualized totals.
   - Sortable real `<table>` columns.
   - Likely Subscriptions (>= 60 confidence) and Possible Subscriptions (40-59 confidence, collapsible).
   - In-memory action handlers ("See how to cancel", "Not a subscription", "Already cancelled").
   - Community suggestion for unmatched items with explicit privacy payload review.
5. Printable checklist view with print stylesheet (`@media print`) and copy-to-clipboard.
6. Plain-language error states without leaking file contents.
7. Strict privacy invariant: ZERO network requests (`connect-src 'none'`), ZERO persistence (`localStorage`, `sessionStorage`, `document.cookie`, `IndexedDB`).
8. Zero third-party runtime code in shipped output.

## Approach

1. **State Management & DOM Architecture**:
   - Implemented `createScannerApp` in `@cancelspec/scanner/client` using `@cancelspec/ui` DOM helpers (`el()`, `clearElement()`) ensuring safe `textContent` handling without `innerHTML` or `eval`.
   - Used in-memory `createStore` which automatically clears on reset or page unload.
   - Integrated `LiveAnnouncer` for screen-reader live region status notifications.

2. **Isolated Web Worker Execution**:
   - `scanner-worker.js` executes Stage 1-10 analysis purely in Web Worker memory.
   - Injected pre-compiled `AliasIndex` into the worker bundle at build time using `esbuild.define`, guaranteeing offline capability under strict CSP `connect-src 'none'`.
   - Main thread communicates strictly via structured cloning (`SCAN_START`, `SCAN_PROGRESS`, `SCAN_COMPLETE`, `MAPPING_REQUIRED`, `SCAN_ERROR`).

3. **Checklist & Actions**:
   - "Not a subscription" excludes the item in-memory and dynamically recalculates active currency totals.
   - "Already cancelled" applies visual distinction and adjusts active cost calculations.
   - Printable view styles hide site navigation and layout clutter under `@media print`.

4. **Zero-Persistence Verification**:
   - Unit tests spy on `Storage.prototype.setItem`, `Storage.prototype.getItem`, and `document.cookie` to assert zero storage calls across all user workflows.

## Alternatives rejected

- **Client-side Frameworks (React, Preact, Svelte)**: Rejected. Shipped output must contain zero third-party code. Native DOM builder (`el()`) from `@cancelspec/ui` is lightweight (<2KB), fast, and has zero external dependencies.
- **Dynamic Fetch of Alias Index**: Rejected due to CSP `connect-src 'none'`. Embedding the compiled index into the worker script achieves deterministic offline performance and complies with strict CSP.

## Verification

- `packages/scanner/src/client/app.test.ts`: All tests passing.
- `packages/site-builder/src/site_builder.test.ts`: Client bundling verified under 65 KB total transfer size (budget: 300 KB).
- REUSE 3.3 compliance verified.
