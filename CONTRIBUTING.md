<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Contributing to CancelSpec

Thank you for helping people cancel subscriptions!

## Adding a playbook

You can add a new cancellation playbook in about 10 minutes:

1. Run `npx cancelspec new` to scaffold a new playbook.
2. Verify the cancellation steps yourself or from an official help page.
3. Fill in all required fields.
4. Run `npx cancelspec lint` to check your playbook.
5. Open a pull request.

## Rules

- **DCO sign-off required**: Add `Signed-off-by: Your Name <your@email>` to your commits, or use `git commit -s`.
- **Synthetic data only**: Never include real bank statements, account numbers, or personal information.
- **No copied text**: Write steps in your own words. Do not copy from official help pages.
- **Original verification**: Record how you verified the steps (first-hand, official help page, or community report) with source URLs and dates.
- **Privacy**: Pseudonymous handles are welcome. We recommend using GitHub's noreply email address.

## Code contributions

- Follow the architecture in `docs/PLAN.md`.
- Every file needs SPDX license headers.
- Write tests alongside code.
- Keep code small and boring: small files, typed boundaries, no clever abstractions.

## Code of Conduct

All contributors must follow the [Code of Conduct](CODE_OF_CONDUCT.md).
