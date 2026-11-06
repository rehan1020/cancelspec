<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Reddit r/selfhosted Launch Post

> [!WARNING]
> DRAFT - DO NOT POST until the maintainer approves.

**Title**: CancelSpec: Self-hostable, zero-backend subscription cancellation finder and playbook directory

**Subreddit**: r/selfhosted  
**Links**: https://cancelspec.cancelspec.workers.dev | https://github.com/rehan1020/cancelspec  

---

Hey r/selfhosted,

If you prefer to keep your financial audits strictly under your own control, we’ve published **CancelSpec**.

CancelSpec is a browser-only, zero-backend static web application that lets you drop in your bank statement exports (CSV/TSV), detect recurring subscriptions, and view cancellation guides.

### Why it’s great for self-hosting:
- **Zero Backend**: CancelSpec is 100% static HTML, CSS, and client-side JavaScript. No Node.js runtime, no Python daemon, no database, and no redis container needed in production.
- **Microscopic Size Footprint**: The entire distribution directory (`dist/site`) is lightweight:
  - Homepage is ~4.3 KB.
  - The scanning tool (including Web Worker and embedded alias index) is ~71 KB.
  - Total global CSS is ~7 KB.
- **Zero Outbound Connections**: The static site has an embedded `connect-src 'none'` Content Security Policy. It makes no outgoing requests whatsoever.

### Hosting in 30 seconds:

#### Using Nginx / Caddy:
Simply point your static root to the built `dist/site/` directory:

```caddyfile
cancelspec.yourdomain.local {
    root * /var/www/cancelspec/dist/site
    file_server
    header {
        Content-Security-Policy "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; object-src 'none'"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}
```

#### Using Docker:
```bash
git clone https://github.com/rehan1020/cancelspec.git
cd cancelspec
npm ci && npm run build
node packages/cli/dist/cli.js build --site
docker run -d --name cancelspec -p 8080:80 -v $(pwd)/dist/site:/usr/share/nginx/html:ro nginx:alpine
```

You can build deterministically, keep your bank statements completely local on your home network, and inspect all source code under AGPL-3.0-or-later.
