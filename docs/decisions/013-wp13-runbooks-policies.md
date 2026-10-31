<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP13 Operational Runbooks and Policy Audits

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP13 — Operational Runbooks and Policy Audits

## Context

Section 14 of `docs/PLAN.md` mandates operational runbooks to ensure operational resilience, dispute resolution, security reporting, and service continuity:
1. `deploy-failure.md`: Actions for broken builds, failed automated gates, or release rollbacks.
2. `host-outage.md`: Failover strategy for static hosting downtime or DNS degradation.
3. `takedown-request.md`: Legal procedure under Section 230 / DMCA / trademark doctrine for corporate removal requests.
4. `security-report.md`: Coordinated vulnerability disclosure and rapid triage workflow.
5. `many-broken-playbooks.md`: Bulk UI redesigns or service breakages response protocol.
6. `sensitive-data-committed.md`: Emergency secret, credential, or PII scrubbing protocol.
7. `publishing-credentials.md`: Emergency key rotation and token lifecycle management.

In addition, institutional policies in `policies/` (`PRIVACY.md`, `SECURITY.md`, `TAKEDOWN.md`, `NC_POLICY.md`, `TRADEMARK.md`) govern user privacy, trademark nominative fair use, non-commercial playbook licensing, and DMCA/legal inquiries.

## Approach

- Authored comprehensive operational runbooks in `docs/runbooks/` with step-by-step triage, resolution, validation, post-mortem, and communication procedures.
- Verified all contact points and project metadata derive directly from `project.config`.
- Conducted policy audits on all existing documents in `policies/` to ensure full compliance with Section 14 specifications.
- Verified REUSE 3.3 compliance across all new runbook markdown documents.

## Verification

- `python -m reuse lint` verified (100% compliant, 0 missing licenses).
- Automated tests and typechecks run clean across all workspace packages and integration suites.
