<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# AGENTS.md

## Project overview

CancelSpec is a free, open-source, browser-only subscription cancellation tool and community dataset. See `docs/PLAN.md` for the full specification.

## Architecture

This is a TypeScript monorepo using npm workspaces. Packages are in `packages/` with one-way dependencies:

```
spec → core → scanner
              ↓
ui → site-builder → cli
```

- **spec**: Schema, enums, validator. No dependencies.
- **core**: Playbook loader, normalization, scoring. Depends on spec.
- **scanner**: Statement parsing, matching. Depends on core. Runs in a Web Worker.
- **ui**: DOM helpers. No dependencies.
- **site-builder**: Static site generator. Depends on core, ui.
- **cli**: CLI commands. Depends on spec, core, site-builder.

## Key rules

1. **Privacy first**: No network requests during/after scan. No storage. No third-party requests.
2. **No third-party shipped code**: All runtime JS/CSS/SVG authored in this repo.
3. **REUSE compliance**: Every file needs SPDX headers.
4. **Names from config**: All project names, URLs, contacts come from `project.config`.
5. **No real data**: Fixtures are synthetic only.
6. **No innerHTML/eval**: Use textContent for untrusted content.

## Build and test

```bash
npm ci
npm run build
npm test
npm run typecheck
```

## File conventions

- TypeScript source in `packages/*/src/`
- Playbooks in `playbooks/REGION/service-id.yaml`
- Tests alongside source or in `tests/` for e2e
- Every file has SPDX license headers
