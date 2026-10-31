<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Privacy Policy

**CancelSpec collects nothing and stores nothing.**

## What happens when you use the scanner

- Your bank statement is read entirely in your browser using a Web Worker.
- No data from your statement is ever sent anywhere. The scanner makes zero network requests.
- Nothing is saved to cookies, localStorage, sessionStorage, IndexedDB, or the Cache API.
- When you close the tab or reset the tool, all data is gone.

## What we do not do

- No analytics, tracking, or telemetry of any kind.
- No third-party scripts, fonts, images, or services.
- No accounts, logins, or user profiles.

## Hosting

This site is hosted on static file hosts (Cloudflare Pages and GitHub Pages). These hosts may log IP addresses and user agents in their standard server logs. The CancelSpec project has no access to these logs.

## How to verify

Open your browser's developer tools:

1. **Network tab**: Reload the page and use the scanner. You will see zero requests after the initial page load.
2. **Application tab**: Check Cookies, Local Storage, Session Storage, IndexedDB, and Cache Storage. All are empty.

## Contact

Questions about privacy: hello@cancelspec.org
