<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP11 Contribution Kit and GitHub Governance

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP11 — Contribution Kit and Issue Workflows

## Context

Section 13, Section 14, and Section 15 of `docs/PLAN.md` require standardizing the community intake process:
1. **GitHub Issue Forms**:
   - New playbook proposals (`.github/ISSUE_TEMPLATE/01_new_playbook.yml`).
   - Broken playbook reports (`02_broken_playbook.yml`) with 3-report threshold notice.
   - Playbook corrections and friction tag proposals (`03_correction.yml`).
   - Global issue chooser (`config.yml`) disabling blank issues and directing security issues to private advisories.
2. **Pull Request Workflow (`.github/PULL_REQUEST_TEMPLATE.md`)**:
   - Mandatory Developer Certificate of Origin (DCO) sign-off.
   - Privacy acknowledgment certifying zero real account or banking data is present.
   - 10-point Reviewer Checklist from Section 15.
3. **Contributor Documentation (`CONTRIBUTING.md`)**:
   - 10-minute playbook authoring tutorial using `cancelspec new` and `cancelspec lint`.
   - Contributor Ladder (Contributor -> Reviewer after 5 merged playbooks -> Region Maintainer).
   - Strict AI-assisted authoring policy (must verify directly from sources read; no invented steps; draft flag preserved until confirmed).

## Approach

- Authored YAML issue forms with field validations, dropdown selectors for regions/categories, and explicit privacy checklists.
- Added GitHub PR template with DCO sign-off and Section 15 verification checklist.
- Refined `CONTRIBUTING.md` with clear CLI instructions, zero runtime third-party code rule, and REUSE licensing standards.

## Verification

- Issue templates, PR template, and contributor documentation verified against `docs/PLAN.md` requirements.
- REUSE 3.3 compliance verified across 158 files.
