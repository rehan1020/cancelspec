<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP1 Bootstrap Implementation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP1 — Bootstrap

## Context

WP1 sets up the monorepo structure, configuration, licensing, CI skeleton, and policy stubs that all subsequent work packets depend on.

## Approach

1. **Monorepo with npm workspaces**: Six packages (spec, core, scanner, ui, site-builder, cli) in `packages/`. Dependencies use `workspace:*` protocol. One-way dependency graph enforced by TypeScript project references.

2. **project.config as JSON**: Chosen over YAML or TOML because JSON needs no parser dependency and is directly importable. All names, URLs, and contacts are centralized here.

3. **TypeScript with strict settings**: ES2022 target, strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` for maximum type safety. Bundler module resolution for esbuild compatibility.

4. **REUSE 3.3 compliance**: Three license layers (AGPL-3.0-or-later for code, CC-BY-NC-SA-4.0 for playbooks, CC-BY-4.0 for spec/docs). `.reuse/dep5` covers files that cannot carry inline headers (JSON, YAML, .gitkeep).

5. **CI skeleton with TODO placeholders**: All five workflows created (pr-check, main-deploy, release, weekly, daily) with first-party GitHub actions only (actions/checkout, actions/setup-node). Advanced checks are placeholder TODOs linked to future issues.

6. **Policy stubs**: All policy documents from section 14 created with basic structure. Will be finalized in WP13.

## Alternatives rejected

- **Turborepo/Lerna**: Adds third-party build-time dependency. npm workspaces are sufficient for this project size.
- **YAML for project.config**: Would require a parser dependency at the config-loading level. JSON is zero-dependency.
- **Separate repos per package**: Adds coordination overhead. Monorepo keeps everything atomic.

## Risks

- `workspace:*` protocol requires npm 7+. Mitigated by `engines` field requiring Node 20+.
- CODEOWNERS teams don't exist yet. Will be created when the GitHub org is set up.
