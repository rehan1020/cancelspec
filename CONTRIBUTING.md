<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Contributing to CancelSpec

Thank you for helping people cancel unwanted subscriptions! CancelSpec is a 100% open-source, community-driven project with an uncompromising commitment to privacy and accessibility.

## Adding a Playbook in ~10 Minutes

Adding a service cancellation playbook takes only a few minutes using the CLI:

### 1. Scaffold the Playbook File

Run the `new` command with your region, service ID, and display name:

```bash
# Usage: npx cancelspec new <REGION> <service-id> [name]
# Valid regions: GLOBAL, US, UK, EU, IN

npx cancelspec new US acme-cloud "Acme Cloud"
```

This creates a pre-populated playbook template at `playbooks/US/acme-cloud.yaml`.

### 2. Research & Verify the Cancellation Steps

Verify the cancellation steps using one of three approved methods:
- **First-hand verification:** You navigated the cancellation flow yourself on a live account or trial.
- **Official help page:** You retrieved the official support documentation directly from the provider's HTTPS domain.
- **Community report:** A verified report submitted via an issue.

> **AI-Assisted Drafting Policy:** AI assistants may draft steps *only* from support pages they actually read. Set `verification_method: official-help-page` with the exact URL and date accessed. Never invent cancellation steps. All unconfirmed drafts must retain `status: draft`.

### 3. Edit the YAML Fields

- **Plain language:** One action per step. Sentences must be 20 words or fewer and start with a verb (e.g. `Click "Billing".`). Aim for reading grade 8 or below.
- **No copied text:** Express instructions in your own phrasing; do not copy marketing or copyright text verbatim.
- **Merchant patterns:** Add the exact descriptor strings seen on bank statements (e.g. `ACME* CLOUD 1234`).
- **Tag friction:** If the service requires calling support, filling exit surveys, or solving CAPTCHAs, tag them with `phone-required`, `survey-wall`, `captcha`, etc.
- **Accessibility:** If the flow requires a voice phone call, CAPTCHA, or mobile app without an accessible web alternative, specify `accessible_alternative: null`.

### 4. Verify with the Linter

Run the strict playbook linter before submitting:

```bash
npx cancelspec lint playbooks/US/acme-cloud.yaml --strict
```

The linter validates YAML schema compliance, link reachability, reading grade level, and flags prohibited legal advice wording.

### 5. Submit Your Pull Request

Open a pull request on GitHub. Ensure your commit includes a Developer Certificate of Origin (DCO) sign-off line:

```bash
git commit -s -m "feat(playbook): add US/acme-cloud cancellation playbook"
```

---

## Contributor Ladder

CancelSpec recognizes active community contributors through three tiers:

1. **Contributor:** Authors pull requests, adds playbooks, or updates outdated instructions.
2. **Reviewer:** Contributors with at least 5 merged playbooks with zero accuracy issues. Reviewers are empowered to review community PRs and verify accuracy.
3. **Region Maintainer:** Coordinates playbook coverage, triage, and quarterly staleness sweeps for an entire geographic region (`GLOBAL`, `US`, `UK`, `EU`, or `IN`).

---

## Code Contributions

We welcome improvements to our TypeScript core, browser Web Worker scanner, static site generator, and CLI tools:

```bash
npm ci              # Install dependencies
npm run build       # Build all monorepo packages
npm test            # Run all unit tests and automated gates
npm run typecheck   # Typecheck monorepo packages
python -m reuse lint # Verify REUSE 3.3 licensing compliance
```

### Key Engineering Rules
- **Zero Runtime Third-Party Code:** All runtime client JS, CSS, and SVG shipped to users must be authored directly in this repository.
- **Strict Privacy Invariant:** The scanner tool page enforces `connect-src 'none'`. No client scripts may ever make network requests or write to persistent storage (`localStorage`, `sessionStorage`, `document.cookie`).
- **Synthetic Data Only:** Never commit real bank statements or financial identifiers. All test fixtures must use the seeded generator (`npm test --workspace=@cancelspec/scanner`).
- **SPDX Headers:** Every file must carry a REUSE-compliant SPDX license header.

## Code of Conduct

All contributors are expected to uphold a welcoming, respectful environment as outlined in our [Code of Conduct](CODE_OF_CONDUCT.md).
