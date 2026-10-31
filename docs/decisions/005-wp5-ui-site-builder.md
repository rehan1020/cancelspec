<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Decision: WP5 UI & Site Builder Implementation

**Date**: 2026-10-31
**Status**: Accepted
**Packet**: WP5 — Site Builder & UI Helpers

## Context

WP5 implements the `ui` DOM helper library and the `site-builder` static site generator that compiles the community playbook dataset into pre-rendered static HTML, CSS, search index, sitemap, robots.txt, and hosting headers (`_headers`).

## Approach

1. **`@cancelspec/ui` Package**:
   - Small zero-dependency DOM helper library:
     - `escapeHtml`: Pure text escaping function for SSG and safe rendering.
     - `createElement`: DOM node builder using `document.createElement`, `setAttribute`, and `textContent` (never `innerHTML`).
     - `LiveAnnouncer`: Screen-reader live region (`aria-live`) manager.
     - `FocusManager`: Trap and restore focus helper for accessible dialogs and previews.
     - `Store`: Minimal in-memory state store without persistent storage.

2. **`@cancelspec/site-builder` Package**:
   - Pure function templates returning escaped HTML strings.
   - Zero client-side JavaScript required for content and service pages (A11Y-2).
   - Generates all required routes:
     - Home (`/index.html`)
     - Tool (`/tool/index.html`)
     - Service pages (`/services/:region/:id/index.html`)
     - Service indexes (`/services/index.html`, `/services/category/:name/index.html`, `/services/region/:code/index.html`)
     - Search fallback page (`/search/index.html`)
     - Hall of Shame (`/hall-of-shame/index.html`)
     - Methodology (`/methodology/index.html`)
     - Spec docs (`/spec/index.html`)
     - Contribute (`/contribute/index.html`)
     - Policies (`/policies/:name/index.html`)
     - Changelog (`/changelog/index.html`)
     - Search index (`/search-index.json`)
     - Sitemap (`/sitemap.xml`)
     - Robots (`/robots.txt`)
     - 404 page (`/404.html`)
     - Cloudflare headers file (`/_headers`)
   - Embeds strict CSP meta tags on every page and writes Cloudflare `_headers` with strict headers.
   - Clean, lightweight system-font CSS (`/styles/main.css`) including print stylesheets.

## Alternatives rejected

- **Client-rendered service pages**: Rejected; A11Y-2 explicitly mandates that service pages work fully without JavaScript.
- **Framework SSG (Astro, 11ty, Next)**: Violates third-party policy (shipped product contains no third-party code). In-repo template functions give 100% control, deterministic output, and zero runtime dependencies.

## Risks

- Search index size: Service list search index is kept compact (<50 KB) containing id, name, category, and region.
