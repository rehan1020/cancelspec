<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Runbook: Legal & Takedown Requests

## Context

CancelSpec publishes factual, informational cancellation navigation guides under nominative fair use. We do not host proprietary brand logos, copyrighted promotional text, or trade secrets. However, third parties or service providers may occasionally send legal inquiries, trademark claims, or correction requests.

Our committed timeline per `TAKEDOWN.md` and Section 14 of `docs/PLAN.md` is:
- **Acknowledge:** Within 3 business days.
- **Fact-check & resolve:** Within 7 business days.

## Handling Inquiries

### Step 1: Receipt and Initial Logging
1. Notices arrive at the dedicated email specified in `project.config` (`takedown@cancelspec.org`) or via platform processes (GitHub / Cloudflare).
2. Send an immediate acknowledgment confirming receipt and providing our 7-day review window.
3. Open a confidential tracking issue in the private maintainer tracker with personal contact information redacted.

### Step 2: Evaluation Criteria
Evaluate the claim against our factual standards:
- **Factual inaccuracy:** (e.g., service claims cancellation steps changed or fee structure is wrong).
  - Check live provider website and terms.
  - If verified inaccurate: Update the playbook immediately, set `verified_on: TODAY`, and increment `revision`.
- **Trademark complaint:** (e.g., objection to use of name).
  - Verify nominative fair use: Service names appear solely as plain text to identify the service being cancelled.
  - Confirm zero brand logos, trade dress, or misleading endorsements exist.
  - If a specific logo or promotional slogan was accidentally included in a PR, remove it immediately.
- **Copyright claim:** (e.g., claim of verbatim copied text).
  - Check whether text matches original documentation verbatim.
  - Re-write steps into concise, plain English action verbs according to our style guidelines.

### Step 3: Resolution & Public Transparency Log
1. Push corrections to `main` with a clear commit message referencing the issue.
2. Reply to the claimant detailing the resolution.
3. Record the outcome in `docs/takedown-log.md` with all claimant personal details redacted:
   - Date received
   - Service affected
   - Nature of request (inaccuracy, trademark, copyright)
   - Action taken (corrected, clarified, or no change warranted)
