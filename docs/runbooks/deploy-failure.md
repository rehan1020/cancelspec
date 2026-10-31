<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Runbook: Deploy Failure & Output Hash Mismatch

## Context

CancelSpec is continuously deployed to two independent static hosts (GitHub Pages and Cloudflare Pages). Every deployment executes the identical deterministic static build command:

```bash
npm ci
npm run build
node packages/cli/dist/cli.js build --site
```

The daily CI job (`daily.yml`) fetches the homepage, one service page, and the data bundle hash from both hosts and alerts if output hashes mismatch.

## Failure Scenarios

### Scenario A: GitHub Actions Deploy Job Fails
1. Check the GitHub Actions run logs for the failing job.
2. If failure is a build error:
   - Run `npm run build && npx vitest run tests` locally to reproduce.
   - Fix the underlying code or test failure on a feature branch, obtain review, and merge to `main`.
3. If failure is an infrastructure/runner issue (e.g., GitHub Pages API timeout):
   - Re-run the failed GitHub Actions job.

### Scenario B: Cloudflare Pages Git Build Fails
1. Log into the Cloudflare Dashboard and view the build logs for the CancelSpec project.
2. Confirm the build command matches `node packages/cli/dist/cli.js build --site` and output directory is `site`.
3. Verify Node LTS version is set to 20 or higher (`NODE_VERSION=20`).

### Scenario C: Hash Mismatch Between Hosts
1. Triggered by `daily.yml` alert when bundle hashes differ across hosts.
2. Verify that both hosts have deployed the same git commit SHA:
   - Check Cloudflare Pages latest deployment commit.
   - Check GitHub Pages deployment commit.
3. If one host is stuck on an older deployment, trigger a manual redeployment.
4. If commits match but hashes differ, run the reproducibility test locally:
   ```bash
   npx vitest run tests/reproducible_build.test.ts
   ```
