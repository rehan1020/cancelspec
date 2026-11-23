<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# CancelSpec

**Free. Open source. No data collected. Ever.**

CancelSpec is a browser-only tool that helps you find and cancel your subscriptions. Drop in a bank statement or pick services by hand — get step-by-step cancellation instructions from a community-maintained dataset.

## Promises

- **No data leaves your device.** The scanner runs entirely in your browser. Zero network requests during or after a scan.
- **Nothing is stored.** No cookies, no localStorage, no tracking. Close the tab and everything is gone.
- **No third-party code.** Every line of JavaScript, CSS, and SVG is authored in this repository.
- **Free forever.** No paid tier, no donations, no ads.

## Verification standards

CancelSpec publishes cancellation guides with clear verification disclosures:
- **Human-verified**: Verified first-hand or against official documentation by community reviewers (`first-hand`, `official-help-page`, `community-report`).
- **AI-assisted check**: Checked against the official support page by an AI assistant (`claude-ai`). Every source carries a cryptographic SHA-256 hash and the playbook carries a `content_seal`. Service pages display: *"Checked against the official page on DATE by an AI assistant. Not yet confirmed by a person."*

## Official repository

The repository URL specified in `project.config` (**https://github.com/rehan1020/cancelspec**) is the only official repository.

## Quick start

```bash
# Install dependencies
npm ci

# Build all packages
npm run build

# Run tests
npm test

# Lint playbooks
npx cancelspec lint

# Add a new playbook
npx cancelspec new
```

## Project structure

```
packages/       TypeScript packages (spec, core, scanner, ui, site-builder, cli)
playbooks/      Cancellation playbooks by region (US, UK, EU, IN, GLOBAL)
site/           Website content, templates, and styles
fixtures/       Synthetic test statements
tests/          End-to-end and integration tests
docs/           Plan, decisions, and guides
policies/       Privacy, security, takedown, and other policies
scripts/        Build and CI helper scripts
```

## Licenses

- **Code**: AGPL-3.0-or-later
- **Playbook data**: CC BY-NC-SA 4.0
- **Specification**: CC BY 4.0

See [ATTRIBUTION.md](ATTRIBUTION.md) for how to give credit.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to get started. You can add a playbook in about 10 minutes.

## Disclaimer

Informational only, not legal advice. Service names belong to their owners and are used for identification.
