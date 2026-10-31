<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Runbook: Security Vulnerability Reports

## Context

Per `SECURITY.md`, CancelSpec maintains a private vulnerability reporting route via GitHub Private Vulnerability Reporting and the security contact in `project.config` (`security@cancelspec.org`).

Commitments:
- Initial response within 48 hours.
- Fix and disclosure coordinated within 14 business days.

## Response Procedure

### 1. Initial Triage (Hours 0-48)
1. Acknowledge report receipt to the finder within 48 hours.
2. Review report against CancelSpec threat model:
   - Client-side data leaks or violations of strict CSP (`connect-src 'none'`).
   - In-memory persistence breaches (storage API usage).
   - Denial-of-service / ReDoS via hostile statement files or regex backtracking.
   - Supply chain or dependency integrity issues.
3. Attempt local reproduction on a dedicated branch.

### 2. Private Remediation (Days 2-7)
1. Open a draft GitHub Security Advisory in the repository.
2. Invite the reporter and core maintainers as collaborators on the advisory workspace.
3. Develop fix with accompanying automated regression tests in `tests/privacy.test.ts` or relevant package.
4. Verify all automated gates pass: `npm test && npx vitest run tests`.

### 3. Release & Disclosure (Days 7-14)
1. Request a CVE identifier through GitHub's CNA program.
2. Merge the security advisory fix into `main`.
3. Build and deploy updated static site to both hosting providers immediately.
4. Publish the Security Advisory publicly and credit the finder.
