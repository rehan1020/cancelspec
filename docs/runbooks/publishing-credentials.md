<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Runbook: Publishing Credentials Rotation & Revocation

## Context

CancelSpec uses GitHub Actions Trusted Publishing (OIDC) wherever supported (PyPI and npm trusted publishing with provenance) to eliminate long-lived static API tokens per Section 9 of `docs/PLAN.md`.

In the event of a suspected credential leak, unauthorized access, or routine rotation, follow this procedure.

## Procedures

### 1. npm Granular Access Tokens
1. Log into `npmjs.com` as the organization administrator with mandatory 2FA.
2. Navigate to **Account Settings > Access Tokens**.
3. Identify the active publish token or OIDC authorization.
4. Click **Revoke Token** immediately.
5. If using granular automation tokens:
   - Generate a new Granular Access Token scoped strictly to `@cancelspec` organization packages with `Read and Write` permission.
   - Restrict allowed IP addresses if applicable.
   - Update the GitHub Repository Secret `NPM_TOKEN` under **Settings > Secrets and variables > Actions > Environments > release**.

### 2. GitHub Personal Access Tokens & Deploy Keys
1. Navigate to **Settings > Deploy Keys** or maintainer developer settings.
2. Revoke any leaked keys or PATs immediately.
3. Review the GitHub Security Audit Log for any unexpected commits or release triggers.

### 3. Verification Post-Rotation
1. Run the release dry-run script locally:
   ```bash
   npx vitest run tests/release.test.ts
   ```
2. In the next release workflow, verify that GitHub OIDC token generation succeeds without manual token reliance.
