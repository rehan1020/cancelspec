<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Runbook: Hosting Setup & Mirror Configuration

**Audience**: Maintainers and infrastructure operators  
**Scope**: Primary hosting (Cloudflare Pages), mirror hosting (GitHub Pages), and custom domain transitions  
**Prerequisites**: Maintainer access to Cloudflare and GitHub repository settings  

---

## 1. Hosting Architecture Overview

CancelSpec operates as a 100% static, client-side web application and data repository. It requires zero server-side compute, zero server-side databases, and zero tracking pixels.

To ensure resilience and zero hosting costs, CancelSpec is architected to deploy to two distinct targets from a single build artifact:
1. **Primary Host**: Cloudflare Pages (`*.pages.dev` or custom domain)
2. **Mirror Host**: GitHub Pages (hosted under a repository subpath, e.g. `/<repo>/`)
3. **Local / Offline**: Functional directly from a local folder or unpacked ZIP archive (`file:///.../site/index.html`)

All internal asset links (`<link rel="stylesheet">`, `<script>`, `<img>`) and navigation links (`<a href="...">`, `<form action="...">`) are compiled to **relative paths** (`./` or `../`), allowing identical static outputs to function at root, under a subpath, and on local disk.

---

## 2. Cloudflare Pages Configuration (Primary Host)

When configuring Cloudflare Pages for the primary site:

| Configuration Field | Exact Setting | Notes |
| --- | --- | --- |
| **Framework preset** | `None` | Do not select Next.js, Hugo, or others |
| **Build command** | `npm ci && npm run build && npm run build:site` | Compiles monorepo packages, extracts bundles, and runs static site generator |
| **Build output directory** | `site` | Target directory where `cancelspec build --site` outputs HTML/CSS/JS |
| **Root directory** | `/` | Repository root |
| **Node.js Version** | `22` | Set environment variable `NODE_VERSION=22` in Pages dashboard |

### Headers and Security
Cloudflare Pages automatically processes the `_headers` file generated in `site/_headers`, which applies:
- Strict Content-Security-Policy (`connect-src 'none'` for `/tool/*`)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Access-Control-Allow-Origin: *` for `/data/*` release bundles

---

## 3. GitHub Pages Configuration (Secondary Mirror)

GitHub Pages acts as an automated fallback mirror updated via GitHub Actions:

1. In the GitHub repository, navigate to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Deployments trigger automatically on pushes to `main` via `.github/workflows/main-deploy.yml`.

### Deployment Safety Gates
The `main-deploy` workflow enforces three automated gates:
1. **Configuration Gate**: Refuses deployment if `project.config` contains placeholder `REPLACE_ME` values.
2. **Reproducible Build Gate**: Builds twice into separate directories and confirms 100% bit-identical file hashes before deploying.
3. **Smoke Test Gate**: Following deployment, executes automated HTTP requests to verify the home page, data bundle (`/data/bundle.latest.json`), and service routes load with HTTP 200.

---

## 4. Custom Domain Transition Guide

When moving from default platform subdomains (`*.pages.dev` or `*.github.io`) to a custom domain (e.g., `cancelspec.org`), **zero code changes are required**:

1. **Update `project.config`**:
   ```json
   {
     "site": {
       "url": "https://cancelspec.org"
     }
   }
   ```
2. **DNS Configuration**:
   - For Cloudflare Pages: Add a CNAME record pointing your domain to `<project>.pages.dev`.
   - For GitHub Pages: Add a CNAME record pointing to `<username>.github.io` and configure custom domain in repo settings.
3. **Automatic Updates**:
   During the next build:
   - Canonical URLs (`<link rel="canonical" href="...">`) on all pages derive from `site.url`.
   - `sitemap.xml` URLs derive from `site.url`.
   - `robots.txt` sitemap directive derives from `site.url`.
   - Internal links remain relative, continuing to function seamlessly.
