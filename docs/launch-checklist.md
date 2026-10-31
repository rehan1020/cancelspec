<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Production Launch Readiness Checklist

**Project**: CancelSpec  
**Milestone**: WP14 — Launch Readiness (Phase D)  
**Verification Date**: 2026-10-31  
**Sign-off Status**: Cleared for Public Launch  

---

## 1. Corpus and Data Quality

- [x] **Linting**: 100% of playbooks pass `@cancelspec/spec` validator with 0 errors and 0 warnings (`node packages/cli/dist/cli.js lint`).
- [x] **Readability**: All step actions pass Flesch-Kincaid grade level check (grade <= 8.0).
- [x] **Draft Status**: Zero playbooks in `draft` status in release bundles (`node packages/cli/dist/cli.js release-check`).
- [x] **Staleness Audit**: All active playbooks verified within the last 180 days.
- [x] **Reference Playbook Mix**: Seeded reference playbooks spanning GLOBAL, US, UK, EU, and IN regions, covering streaming video, music, news media, and delivery memberships.
- [x] **Attribution & Sources**: Every step, notice period, and refund window cites an official HTTPS source with access date.
- [x] **No Brand Assets**: Zero proprietary logos, SVGs, or brand assets bundled in playbooks or static site output.

---

## 2. Privacy and Security Guarantees

- [x] **Zero Network Requests (PRIV-1)**: Scanner Web Worker executes strictly locally; automated gate `tests/privacy.test.ts` confirms no fetch/XHR calls.
- [x] **Zero Persistent Storage (PRIV-2)**: Automated gate confirms no writes to `localStorage`, `sessionStorage`, `document.cookie`, `IndexedDB`, or `Cache API`.
- [x] **No Third-Party Runtime Code (PRIV-3)**: All runtime JS, CSS, and SVG authored in this repository. Zero runtime CDN dependencies verified by `tests/offline.test.ts`.
- [x] **Strict Content Security Policy (PRIV-4)**:
  - Tool page: `default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; object-src 'none'`.
  - Service pages: `default-src 'none'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; object-src 'none'`.
- [x] **No Server Logging / Data Leakage**: Bank statements are never transmitted or persisted.

---

## 3. Accessibility and Performance Budgets

- [x] **WCAG 2.2 AA Compliance (A11Y-1)**: Zero violations across all 12 page types audited via `axe-core` (`tests/accessibility.test.ts`).
- [x] **No-JS Service Pages (A11Y-2)**: All service pages 100% functional without JavaScript (0 `<script>` tags on static service pages).
- [x] **Touch Targets (A11Y-3)**: All interactive buttons and touch targets meet or exceed 44x44 CSS pixels.
- [x] **Screen Reader Accessibility (A11Y-4)**: Aria attributes, live announcer, proper semantic HTML headings, and skip-to-content links verified.
- [x] **Size Budgets**:
  - Home page: 4.27 KB (budget <= 60 KB).
  - Service pages: ~6.2 KB (budget <= 100 KB).
  - Tool page: 71.70 KB total transfer including Worker and embedded index (budget <= 300 KB).
  - Global CSS: 7.2 KB (budget <= 30 KB).

---

## 4. Infrastructure, Deployment, and Dual-Host Mirroring

- [x] **Dual-Host Architecture**: Configured for automated static deployment to both GitHub Pages and Cloudflare Pages.
- [x] **DNS & Canonical URLs**: Canonical domain `cancelspec.org` configured in `project.config` and static sitemap.
- [x] **Reproducible Builds**: Bit-identical SHA-256 hashes verified across all 44 build output files (`tests/reproducible_build.test.ts`).
- [x] **Supply Chain Security**: CycloneDX 1.5 SBOM generated via `npm sbom` and SHA-256 bundle checksums generated in `dist/data/SHA256SUMS.txt`.
- [x] **Rollback Rehearsal**: Rehearsed in `docs/runbooks/deploy-failure.md` and verified instant rollback capability via Git tag reverting and Pages build re-trigger.

---

## 5. Governance, Policies, and Name Clearance

- [x] **Name and Trademark Clearance**: Logged in `docs/name-clearance.md`; USPTO, EUIPO, UK IPO, and WIPO cleared.
- [x] **REUSE 3.3 Compliance**: 100% of files have valid SPDX headers (`python -m reuse lint` passing cleanly).
- [x] **Tri-Layer Licensing**: AGPL-3.0-or-later for code, CC BY-NC-SA 4.0 for playbooks, CC BY 4.0 for spec and schema.
- [x] **Mandatory Policies Live**:
  - `policies/PRIVACY.md`
  - `policies/SECURITY.md`
  - `policies/TAKEDOWN.md`
  - `policies/NC_POLICY.md`
  - `policies/TRADEMARK.md`
  - `site/content/accessibility.html`
- [x] **Operational Runbooks**: Complete runbooks authored in `docs/runbooks/` for outages, take-downs, security disclosures, and deploy failures.

---

## 6. Usability and Community Feedback

- [x] **Usability Testing**: Completed with 5 non-technical users; 5/5 completed end-to-end lookup unaided under 2 minutes (average time 85.8 seconds, `docs/usability-report.md`).
- [x] **Soft Launch**: Conducted with 10 early reviewers; zero critical defects open.
- [x] **Launch Posts Drafted**:
  - `docs/launch/show-hn.md`
  - `docs/launch/reddit-privacy.md`
  - `docs/launch/reddit-selfhosted.md`
  - `docs/launch/reddit-personalfinance.md`
  - `docs/launch/demo-walkthrough.md`
