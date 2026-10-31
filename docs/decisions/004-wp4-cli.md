<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP4 CLI Implementation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP4 — CLI

## Context

WP4 implements the command-line interface for CancelSpec (`lint`, `new`, `build`, `release-check`).

## Approach

1. **Pure Node.js CLI without external arg-parsing dependencies**:
   - Parses `process.argv` directly (`util.parseArgs` or lightweight custom parser) keeping zero runtime third-party dependencies.

2. **Commands**:
   - `lint [paths...]`: Validates specified playbook files or all files in `playbooks/`. Checks schema, alias collisions within regions, link protocols, banned phrases, and readability.
   - `new <region> <service-id> [service-name]`: Generates a valid playbook scaffold at `playbooks/<region>/<service-id>.yaml`. Acceptance criterion: newly scaffolded file passes `cancelspec lint` immediately without error.
   - `build`: Runs playbook loading, generates release bundles (`dist/bundle.latest.json` and versioned bundle).
   - `release-check`: Comprehensive release gate check verifying schema, no draft playbooks, staleness audits, bundle hashes.

3. **Executable binary**:
   - Registered in `package.json` under `"bin": { "cancelspec": "./dist/cli.js" }`.
   - Built to run seamlessly with `npx cancelspec <command>` or `npm run cli <command>`.

## Alternatives rejected

- **Commander/Yargs**: Violates allowlist of Section 3 (no third-party dependencies without decision record, especially since Node 20+ has built-in `util.parseArgs`).

## Risks

- Terminal colors across different OS shells: Use standard ANSI escape sequences with `NO_COLOR` / TTY detection.
