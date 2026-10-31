<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP12 Release Pipeline and Dry-Run Automation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP12 — Release Pipeline and Dry-Run

## Context

Section 9, Section 12, and Section 13 of `docs/PLAN.md` define the release engineering and data operations pipeline:
1. Versioning: Semantic versions for spec (`0.1.0`), calendar versions (`YYYY.MM.N`) for data and bundle releases.
2. Automated Release Checklist:
   - Playbook linting passes on 100% of corpus.
   - Zero playbooks in `draft` status reach production bundles.
   - Staleness audit ensures no playbooks older than 180 days are released without review.
   - Bundle compilation determinism.
3. Supply chain security:
   - CycloneDX 1.5 SBOM generated via `npm sbom`.
   - SHA-256 checksums file `SHA256SUMS.txt` for bundle integrity verification.
   - Package tarball dry-run (`npm pack --dry-run`).
4. GitHub Release Automation:
   - Triggered on signed tags (`v*`).
   - Bundles, SBOM, and checksum assets attached automatically to GitHub releases.

## Approach

- Created `scripts/release-dry-run.ts` to execute end-to-end dry-run release simulation locally and in CI.
- Updated `.github/workflows/release.yml` with steps for SBOM generation, checksum calculation, bundle publishing, and GitHub release creation.
- Added automated verification in `tests/release.test.ts`.

## Verification

- `tests/release.test.ts` passing.
- Validated CycloneDX SBOM output and SHA-256 checksum verification.
- REUSE 3.3 compliance verified across 161 files.
