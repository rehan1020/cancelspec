<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Reddit r/personalfinance Launch Post

> [!WARNING]
> DRAFT - DO NOT POST until the maintainer approves.

**Title**: CancelSpec – Free, private tool to find unwanted subscriptions in your bank statement and cancel them

**Subreddit**: r/personalfinance  
**Links**: https://cancelspec.cancelspec.workers.dev | https://github.com/rehan1020/cancelspec  

---

Hey r/personalfinance,

The average household wastes hundreds of dollars each year on "zombie subscriptions"—streaming services you forgot you signed up for, delivery memberships that auto-renewed, or introductory trials that quietly jumped to full price.

Most tools that help you identify these services either charge monthly subscription fees themselves or ask for your online banking username and password.

We created **CancelSpec** as a free, safe, and community-driven alternative.

### How to use it to audit your monthly budget:
1. Log into your bank or credit card portal and download your recent statement export as a CSV or TSV file.
2. Visit **https://cancelspec.cancelspec.workers.dev/tool/** and drop the file into the page.
3. The tool runs locally in your browser to cluster recurring payments by interval (monthly, quarterly, annual) and matches them against known subscription services.
4. Review your active recurring costs annualized by currency.
5. Click **"See how to cancel"** on any unwanted subscription to view step-by-step instructions. We include:
   - Direct web cancellation links (avoiding customer service phone queues where possible).
   - Platform instructions (App Store, Google Play, bank auto-pay mandates).
   - Cooling-off refund windows and notice periods.
   - Friction ratings showing which services impose retention loops or survey walls.
6. Generate a printable cancellation checklist and check them off one by one.

### Is it safe?
Yes. CancelSpec was built from day one with a strict zero-data pledge:
- Your statement never leaves your computer or phone.
- There are no servers processing your transactions—everything is calculated by a Web Worker inside your browser tab.
- Nothing is stored to your browser cookies or local storage.
- It is 100% free with no ads, affiliate links, or paid upgrades.

We hope this helps you reclaim control of your monthly cash flow!
