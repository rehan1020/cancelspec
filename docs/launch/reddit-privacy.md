<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Reddit r/privacy Launch Post

**Title**: We built CancelSpec: a free, open-source subscription cancellation tool that makes zero network calls and stores nothing

**Subreddit**: r/privacy  
**Links**: https://cancelspec.org | https://github.com/cancelspec/cancelspec  

---

Hello r/privacy,

Most subscription-tracking apps require you to link your bank account via Plaid/Yodlee or upload unredacted financial statements to their servers. In return, they harvest your spending history, monetize financial insights, or upsell loan products.

We built **CancelSpec** as a privacy-respecting alternative.

### Our Privacy Model

CancelSpec is designed with mathematical privacy constraints tested continuously in our CI pipeline:

1. **Zero Network Calls (`connect-src 'none'`)**:
   The statement scanner runs inside a client-side Web Worker. Once the static HTML and worker bundle are delivered, no network requests are made. You can literally disconnect your Wi-Fi or turn on Airplane mode after loading the page, and the scanner works identically.

2. **Zero Storage Footprint**:
   CancelSpec does not write to `localStorage`, `sessionStorage`, `document.cookie`, `IndexedDB`, or the `Cache API`. Transactions are processed in volatile worker memory and discarded immediately when the tab is closed.

3. **Zero Third-Party Code**:
   There are no Google Fonts, no Cloudflare CDN script injections, no Google Analytics, no telemetry, and no external runtime dependencies. Every byte of JS and CSS is authored in-tree.

4. **100% Synthetic Test Data**:
   All tests and demonstration fixtures in the repository use PRNG-generated synthetic data. No real bank accounts or financial records ever touch our repository.

5. **Audited & REUSE Compliant**:
   Our automated test suite includes dedicated privacy gates (`tests/privacy.test.ts`) that intercept browser APIs and fail the build if any storage or network activity occurs.

You can inspect the source code, verify our Content Security Policy headers, or run it entirely on your local machine using our static builder.
