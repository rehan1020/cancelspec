<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Show HN: CancelSpec – Free, browser-only subscription finder with zero network calls

> [!WARNING]
> DRAFT - DO NOT POST until the maintainer approves.

**Title**: Show HN: CancelSpec – Browser-only subscription cancellation tool (zero network requests, no storage)

**URL**: https://cancelspec.cancelspec.workers.dev  
**Repository**: https://github.com/rehan1020/cancelspec  

---

Hey Hacker News,

We built **CancelSpec** because finding and cancelling unwanted subscriptions shouldn't require surrendering your banking credentials to a venture-backed budgeting app or paying a 30% finder's fee to a cancellation intermediary.

CancelSpec is a 100% free, open-source static web application and community playbook dataset that runs entirely inside your browser.

### How it works:
1. **Drop in a bank statement**: Ingests your standard checking or credit card export (CSV/TSV).
2. **In-browser Web Worker parsing**: Normalizes transactions, infers column mapping, and runs a recurrence-detection engine (cadence clustering, date interval disjointness, amount variance bounds).
3. **Deterministic playbook matching**: Matches merchant statement descriptors against an embedded community index of subscription services.
4. **Actionable cancellation instructions**: Outputs step-by-step cancellation instructions with direct cancellation links, billing-channel branches (direct, App Store, Google Play, bank mandate), and friction scores.
5. **Printable checklist**: Mark services you want to cancel, calculate your annualized savings, and generate a printable or copyable checklist.

### Privacy and Architecture Guarantees:
- **Zero network requests**: No network calls occur during or after statement analysis. The tool page enforces `connect-src 'none'` via strict Content Security Policy.
- **Zero persistent storage**: No writes to `localStorage`, `sessionStorage`, `document.cookie`, `IndexedDB`, or `Cache API`. When you close the tab, your statement data vanishes from memory.
- **Zero third-party runtime code**: No analytics, no fonts from external CDNs, no tracking pixels, and no external runtime JavaScript libraries. Every line of runtime code and CSS is authored directly in our repository.
- **Static & reproducible**: Pre-compiled static site that builds deterministically with bit-identical hashes and deploys to GitHub Pages and Cloudflare Pages.
- **Accessibility**: Designed for WCAG 2.2 AA conformance, and all public service instruction pages function without JavaScript.

### The Dataset & Licensing:
- Code is licensed under **AGPL-3.0-or-later**.
- Cancellation playbooks are licensed under **CC BY-NC-SA 4.0** (preventing commercial lock-in while keeping the dataset open).
- The specification and schema are licensed under **CC BY 4.0**.
- We provide a CLI (`cancelspec`) for contributors to scaffold, lint, and verify new service playbooks in under 10 minutes.

We’d love feedback on the scanner's cadence detection heuristics, new bank statement formats to test, and suggestions for expanding the community playbook corpus!
