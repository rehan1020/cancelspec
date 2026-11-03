<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: 015 Pinned jsdom Test-Only DevDependency

**Date**: 2026-11-01  
**Status**: Accepted  
**Deciders**: Project Maintainers  

## Context

Running DOM-dependent automated test suites (including client app DOM rendering, accessibility audits via `axe-core`, and UI component tests) in a headless Node.js CI environment requires a standards-compliant DOM implementation.

While CancelSpec strictly prohibits shipping third-party dependencies in production browser bundles (Zero Third-Party Runtime Code, PRIV-3), development and testing infrastructure requires simulated browser APIs.

## Decision

Add `jsdom` (version `29.1.1`) and `@types/jsdom` (version `30.0.0`) to root `devDependencies` with exact pinned versions (no `^` or `~` ranges).

- `jsdom` is strictly scoped to `devDependencies` and never included in `packages/*/src` runtime bundles or static site outputs.
- `package-lock.json` commits the exact dependency tree to ensure 100% reproducible test environments across local clean checkouts and CI runners.

## Consequences

- Automated test suites (`axe-core`, scanner client UI, checklist rendering) execute reliably in clean `npm ci` environments.
- Zero runtime impact: zero third-party code is shipped to users or published bundles.
