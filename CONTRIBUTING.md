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

Follow the format rules in the specification:

#### Format Rules: File and Field Rules

| Item | Rule |
|---|---|
| Path and header | `playbooks/REGION/ID.yaml` (REGION is US, UK, EU, IN, or GLOBAL). Header: `# SPDX-FileCopyrightText: 2026 CancelSpec contributors` and `# SPDX-License-Identifier: CC-BY-NC-SA-4.0` |
| `id` | Lowercase kebab-case ASCII, matching file name |
| `name`, `aliases` | Plain text. Channel guides carry no aliases |
| `category` | One of: `streaming-video`, `streaming-music`, `cloud-storage`, `software`, `vpn-security`, `fitness-health`, `news-media`, `gaming`, `education`, `telecom-bundle`, `delivery-membership`, `finance-tools`, `other` |
| `website` | Domain or https URL of the brand; no placeholders |
| `kind`, `outcome` | `service` or `channel-guide`; `cancel`, `downgrade`, or `close-account` (defaults: service, cancel) |
| `merchant_patterns` | Uppercase letters, digits, spaces, and `*` only. Literal text of >= 6 characters and a word of >= 4 characters after processor prefixes. Optional for both draft and active playbooks |
| `pattern_source` | https URL referencing one of the sources with a sha256 hash. Required when `merchant_patterns` are present; must be omitted when `merchant_patterns` is empty |
| `channels` | At least one. Each has `channel` (`direct`, `apple`, `google-play`, `carrier-billing`, `paypal`, `bank-mandate`, `amazon`, `roku`, `other`), optional `entry_url` (https, required for direct channels with steps), `steps`, optional `notes`, and `source` |
| Steps | Plain text, 200 characters or fewer, no HTML or Markdown; a step may also be `action` plus an https `link` |
| Channel `source` | Required when the channel has steps, and it must equal one URL in `sources` |
| Empty steps | Allowed only in a draft, with a `notes` text explaining why |
| `tags` | Subset of: `phone-required`, `chat-only`, `email-only`, `retention-offer`, `survey-wall`, `hidden-entry`, `captcha`, `app-required`, `in-person`, `fee-on-exit`, `long-notice`. Must be absent or empty for drafts authored by `ai-draft` |
| Facts (`notice_period`, `refund_window`, `auto_renews`) | Each is `value` (text or true/false), `source` (https, must equal a URL in `sources`), `accessed_on` (date). Never use "None"; omit when unknown |
| `contributors`, `reviewers` | Contributors: at least one handle. Reviewers: a list; `active` needs at least one human, and `ai-draft` is never a reviewer |
| `sources` | At least one: `url`, `accessed_on`, optional `sha256` (64 hex characters, required for automated sources to leave draft), optional `retrieval` (`automated` [default] or `manual`). Manual sources need no sha256, are skipped by packet and recheck, and show an informational lint note. Reject manual sources in any playbook whose contributors include ai-draft, and require a human reviewer plus verification_method first-hand or official-help-page for any active playbook that has one. At least one source host must match website domain or an allowlisted official help host |
| `content_seal` | 64-character lowercase hex SHA-256 seal computed over normalized channels, steps, facts, and patterns. Set by verify upon activation. Required for active playbooks; rejected if missing or mismatched ('content changed after verification; re-run verify'). Draft playbooks unaffected |
| `verified_on`, `verification_method` | Date; `official-help-page`, `first-hand`, `community-report`, or `ai-assisted` |
| `revision`, `status`, `status_reason` | Integer >= 1; `draft`, `active`, `stale`, `broken`, or `discontinued`; plain text |
| Banned | Legal phrases such as "legal advice" or "under the law" in any text |

#### How to Write the Content

| Do | Don't |
|---|---|
| One action per step, starting with a verb | Filler like "Confirm to finish" or "Confirm your choice" unless the official page states a confirmation |
| Use button, menu, and page names exactly as the official page prints them (*Finish Cancellation*, *Manage your plan*) | Rename labels for readability |
| Put the URL in `entry_url` or a step `link` when the page gives one | Invent a URL or point to a blog |
| Describe only what the fetched page states | Fill in from memory |
| Write original wording (no 8 consecutive words copied) | Copy sentences verbatim |
| For a billing branch with no page of its own, use `steps: []` plus a note | Write Apple or Google Play steps from a vendor page that doesn't contain them |
| Billing-branch note, exact form: "Subscriptions billed through Apple are cancelled through Apple; see the Apple Subscriptions guide." (same pattern for Google Play, PayPal, carrier, bank mandate, Amazon, Roku) | Free-form unsupported notes |

#### Who Sets What (Provenance and Roles)

| Field | Agent draft | Human at verification |
|---|---|---|
| Steps, channels, facts, sources, hash | Set from fetched page | Check each against live page; fix |
| `tags`, `accessible_alternative` | **Leave out**: official pages rarely state friction | Add from first-hand experience |
| `merchant_patterns`, `pattern_source` | Empty unless an official page lists descriptor; pattern_source points to that source | Add from your own statement (descriptor text only, no amounts or dates) or verify official source |
| `contributors` | `ai-draft` | Replace with your handle |
| `reviewers` | Empty (`[]`) | Your handle |
| `verified_on`, `verification_method` | Fetch date, `official-help-page` | Today's date; `first-hand` if you tested it, `official-help-page` if you reviewed page |
| `status`, `status_reason` | `draft`, "AI-drafted, awaiting human verification." | `active`, "Verified by HANDLE on DATE" |
| `revision` | 1 | Increment on every later change |

### 4. Human Verification Command

To verify a draft playbook and promote it to `status: active`:

```bash
# Run verification (warns if merchant patterns are absent, but does not block activation):
npx cancelspec verify playbooks/REGION/service-id.yaml --handle yourhandle --method first-hand
```

The verification command replaces `ai-draft` in contributors with your handle, adds your handle to reviewers, records today's verification date, prints a warning if merchant patterns are absent, sets `status: active`, and computes `content_seal` (a cryptographic SHA-256 seal over normalized channels, steps, facts, and patterns). Any later modification to content without re-running verify causes validation to fail.

### 5. AI-Assisted Check Command

To perform an AI-assisted verification check on a draft playbook against official sources:

```bash
npx cancelspec check-ai playbooks/REGION/service-id.yaml
```

The `check-ai` command requires valid SHA-256 hashes on every source, sets `status: active`, `reviewers: [claude-ai]`, `verification_method: ai-assisted`, `verified_on: today`, `status_reason: "AI-assisted check, not yet confirmed by a person."`, and computes `content_seal`.

### 6. Verify with the Linter

Run the strict playbook linter before submitting:

```bash
npx cancelspec lint playbooks/US/acme-cloud.yaml --strict
```

The linter validates YAML schema compliance, link reachability, reading grade level, and flags prohibited legal advice wording.

### 6. Submit Your Pull Request

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
- **Scope Boundaries:** Edit only the files a task names; never rewrite wording for style; list every changed file in the pull request description and flag any that were not named.
- **Zero Runtime Third-Party Code:** All runtime client JS, CSS, and SVG shipped to users must be authored directly in this repository.
- **Strict Privacy Invariant:** The scanner tool page enforces `connect-src 'none'`. No client scripts may ever make network requests or write to persistent storage (`localStorage`, `sessionStorage`, `document.cookie`).
- **Synthetic Data Only:** Never commit real bank statements or financial identifiers. All test fixtures must use the seeded generator (`npm test --workspace=@cancelspec/scanner`).
- **SPDX Headers:** Every file must carry a REUSE-compliant SPDX license header.

## Code of Conduct

All contributors are expected to uphold a welcoming, respectful environment as outlined in our [Code of Conduct](CODE_OF_CONDUCT.md).
