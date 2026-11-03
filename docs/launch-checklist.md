<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Production Launch Readiness Checklist (Template)

**Project**: CancelSpec  
**Milestone**: WP14 — Launch Readiness (Phase D)  
**Verification Date**: NOT DONE  
**Sign-off Status**: NOT DONE — Pending Maintainer Review  

---

## 1. Corpus and Data Quality

- [ ] **NOT DONE**: 100 playbooks verified by human contributors; none in draft.
- [ ] **NOT DONE**: Zero playbooks in `draft` status in release bundle for v1.0.0.
- [ ] **NOT DONE**: All playbooks verified within the last 180 days.
- [ ] **NOT DONE**: Multi-region mix active across US, UK, EU, IN, and GLOBAL.
- [ ] **NOT DONE**: Every active playbook reviewed by a human maintainer (`reviewers` non-empty, no `ai-draft` handle).

---

## 2. Privacy, Security, and Code Quality

- [ ] **NOT DONE**: Privacy guarantees verified (zero network requests during/after scan, zero browser storage writes).
- [ ] **NOT DONE**: Zero third-party shipped runtime dependencies confirmed in production assets.
- [ ] **NOT DONE**: Automated test suites pass 100% in clean checkout.
- [ ] **NOT DONE**: Strict Content Security Policy confirmed on primary and mirror hosts.
- [ ] **NOT DONE**: Reproducible bit-identical build confirmed across repeated builds.

---

## 3. Accessibility and Performance Budgets

- [ ] **NOT DONE**: Axe-core WCAG 2.2 AA audit verified on all generated static pages.
- [ ] **NOT DONE**: Service pages verified functional with JavaScript disabled.
- [ ] **NOT DONE**: Transfer size budgets verified (Home <= 60 KB, Tool <= 300 KB, CSS <= 30 KB).
- [ ] **NOT DONE**: 5-participant non-technical human usability study completed and documented in `docs/usability-report.md`.

---

## 4. Hosting, Domains, and Distribution

- [ ] **NOT DONE**: Primary host (Cloudflare Pages) configured by maintainer.
- [ ] **NOT DONE**: Mirror host (GitHub Pages) deployed and verified.
- [ ] **NOT DONE**: Custom domain DNS and HTTPS certificates active.
- [ ] **NOT DONE**: Release dry-run and CycloneDX SBOM generated.
- [ ] **NOT DONE**: Production launch sign-off approved by maintainer.
