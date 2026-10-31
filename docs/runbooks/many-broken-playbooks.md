<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Runbook: Mass Playbook Invalidation

## Context

A major platform or payment ecosystem redesign (e.g., Apple Subscription management interface overhaul, Google Play settings restructuring, or a major streaming service UI update) may invalidate multiple playbooks simultaneously.

## Procedures

### 1. Identify Scope & Affected Ecosystem
1. Identify all affected playbooks by running a search across channels or services:
   ```bash
   grep -rn "apple" playbooks/
   grep -rn "google-play" playbooks/
   ```
2. Determine whether the breakage affects:
   - Specific services (e.g. all playbooks for an entertainment conglomerate), or
   - An entire billing channel branch (e.g., the Apple iOS settings route changed from `Settings > Name > Subscriptions` to a new path).

### 2. Immediate Triage & Status Flagging
1. If steps are confirmed broken and new steps are not yet documented:
   - Edit affected playbooks to set `status: broken` and record `status_reason: "Platform redesign on YYYY-MM-DD; updated steps under community verification."`.
   - Re-build the site: `node packages/cli/dist/cli.js build --site`.
   - The site builder will automatically display an amber "Broken / Under Review" banner warning visitors.

### 3. Verification & Mass Update
1. Create a tracking issue on GitHub labeled `status: broken` and `priority: high`.
2. First-hand verify the new cancellation flow or locate the updated official documentation.
3. Update the steps, set `verified_on: TODAY`, increment `revision`, and revert status to `status: active`.
4. Run strict lint verification: `npx cancelspec lint playbooks/`.
5. Deploy updated playbooks.
