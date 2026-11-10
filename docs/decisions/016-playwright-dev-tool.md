<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: 016 Pinned Playwright Dev-Only Fetch Tooling

**Date**: 2026-11-10  
**Status**: Accepted  
**Deciders**: Project Maintainers  

## Context

Some official cancellation and subscription management help pages rely on client-side JavaScript rendering (Single-Page Applications or dynamic content loaders), returning empty or incomplete markup to plain HTTP GET requests.

CancelSpec adheres to a strict "no memory-based content" policy: cancellation playbooks must only be drafted from visible text extracted directly from official help documentation. To draft accurate playbooks for JS-rendered documentation without guessing or human memory, maintainers require tooling capable of evaluating client scripts in a controlled headless environment.

## Decision

Add `playwright` (version `1.65.0`) to root `devDependencies` with an exact pinned version (no `^` or `~` ranges).

- **Scope**: Strictly limited to development-time fetch tooling (`scripts/fetch-targets.js`) and never imported into runtime workspace packages (`packages/*`).
- **Zero Runtime Code**: Playwright is never bundled, packaged, or shipped in production artifacts, static site builds, npm packages, or browser distributions.
- **Bot & Block Policy**: The tool adheres to host `robots.txt`, identifies itself with the honest project User-Agent, and skips hosts returning HTTP errors (403, 429) or bot challenge pages without evasion.
- **Ephemeral Extraction**: Normalized visible text from the main content area is hashed (SHA-256) and inspected in memory; raw page content is not committed to the repository.

## Consequences

- Maintainers can fetch and verify official cancellation help documentation that requires JavaScript execution.
- Production and client security guarantees remain unchanged: 100% zero third-party dependencies shipped to end users.
