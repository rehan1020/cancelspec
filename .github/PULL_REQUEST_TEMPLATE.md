<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

## Description

<!-- Describe the changes made in this PR (new playbook, playbook correction, code improvement). -->

## Privacy & Test Data Warning

- [ ] **Synthetic data only:** I certify that this pull request contains **no real account numbers, no real banking statements, and no personal email addresses**. All test fixtures use synthetic data generated via our seeded generator.

## Playbook Reviewer Checklist (Section 15)

If this PR adds or edits a cancellation playbook in `playbooks/`:

- [ ] 1. **Schema & Linter:** Passes `npx cancelspec lint` with zero warnings or errors.
- [ ] 2. **Verified steps:** Steps match a live check or cited official source.
- [ ] 3. **Actionable writing:** One action per step, starts with a verb, reading grade 8 or below.
- [ ] 4. **Friction tags:** Every added friction tag is factual and verified in the primary cancellation flow.
- [ ] 5. **HTTPS links:** Links are HTTPS and point strictly to verified official domains.
- [ ] 6. **Original phrasing:** Text is written in your own words (not verbatim copied from copyrighted text).
- [ ] 7. **No brand assets:** Contains zero brand logos, marketing imagery, or promotional slogans.
- [ ] 8. **Sources:** Facts have valid `source` HTTPS URLs and `accessed_on` ISO dates.
- [ ] 9. **Billing channels:** Supported channels (direct, Apple, Google Play, bank mandate) are cataloged.
- [ ] 10. **Provenance:** `verified_on` date and `verification_method` are recorded.

## Licensing & DCO Sign-off

- [ ] Every file includes an SPDX header or is annotated in `REUSE.toml` (`python -m reuse lint` passes).
- [ ] Code is licensed under AGPL-3.0-or-later; Playbooks are CC BY-NC-SA 4.0; Spec/schema is CC BY 4.0.

### Developer Certificate of Origin (DCO)

By submitting this contribution, you certify that:
1. You created the contribution in whole or in part, or have the right to submit it under the respective open-source license.
2. The contribution does not infringe any third-party patents, copyrights, or trade secrets.
3. You agree that this record is public and permanent.

Signed-off-by: Your Name <your-email@example.com>
