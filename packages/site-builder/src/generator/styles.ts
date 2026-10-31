// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export function generateMainCss(): string {
  return `/* SPDX-FileCopyrightText: 2026 CancelSpec contributors */
/* SPDX-License-Identifier: AGPL-3.0-or-later */

:root {
  --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
  --text-muted: #595959;
  --border-color: #d1d5db;
  --surface-color: #f9fafb;
  --surface-alt: #f3f4f6;
  --link-color: #0b57d0;
  --link-hover: #0842a0;
  --focus-ring: #0256d0;
  --danger-color: #b3261e;
  --danger-bg: #fdf2f2;
  --warning-color: #7a4100;
  --warning-bg: #fef7ed;
  --success-color: #137333;
  --success-bg: #e6f4ea;
  --badge-bg: #e5e7eb;
  --badge-text: #1f2937;
  --max-width: 960px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #121212;
    --text-color: #e4e4e7;
    --text-muted: #a1a1aa;
    --border-color: #3f3f46;
    --surface-color: #18181b;
    --surface-alt: #27272a;
    --link-color: #70aaff;
    --link-hover: #9ec5fe;
    --focus-ring: #9ec5fe;
    --danger-color: #f28b82;
    --danger-bg: #3c1e1e;
    --warning-color: #fdd663;
    --warning-bg: #382c16;
    --success-color: #81c995;
    --success-bg: #1e3825;
    --badge-bg: #27272a;
    --badge-text: #e4e4e7;
  }
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-family: var(--font-family);
  font-size: 100%;
  line-height: 1.5;
  color: var(--text-color);
  background-color: var(--bg-color);
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Accessibility: Skip to main content link */
.skip-link {
  position: absolute;
  top: -9999px;
  left: 1rem;
  background: var(--surface-color);
  color: var(--link-color);
  padding: 0.75rem 1.25rem;
  z-index: 9999;
  border: 2px solid var(--focus-ring);
  border-radius: 4px;
  font-weight: 600;
  text-decoration: none;
}

.skip-link:focus {
  top: 1rem;
}

/* Focus styles with high contrast */
:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Layout */
header {
  border-bottom: 1px solid var(--border-color);
  background-color: var(--surface-color);
  padding: 1rem;
}

.header-container {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.site-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color);
  text-decoration: none;
}

nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

nav a {
  color: var(--link-color);
  text-decoration: none;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

nav a:hover {
  text-decoration: underline;
}

main {
  flex: 1;
  max-width: var(--max-width);
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1rem;
}

footer {
  border-top: 1px solid var(--border-color);
  background-color: var(--surface-color);
  padding: 2rem 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.footer-container {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

/* Typography & Headings */
h1 {
  font-size: 2rem;
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.5rem;
  line-height: 1.3;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.25rem;
}

h3 {
  font-size: 1.2rem;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

p {
  margin-top: 0;
  margin-bottom: 1rem;
}

a {
  color: var(--link-color);
  text-decoration: underline;
}

a:hover {
  color: var(--link-hover);
}

/* Badges & Tags */
.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 4px;
  background-color: var(--badge-bg);
  color: var(--badge-text);
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.badge-difficulty-1 { background-color: var(--success-bg); color: var(--success-color); }
.badge-difficulty-2 { background-color: var(--success-bg); color: var(--success-color); }
.badge-difficulty-3 { background-color: var(--warning-bg); color: var(--warning-color); }
.badge-difficulty-4 { background-color: var(--warning-bg); color: var(--warning-color); }
.badge-difficulty-5 { background-color: var(--danger-bg); color: var(--danger-color); }

/* Buttons & Inputs */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 0.625rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--surface-color);
  color: var(--text-color);
  text-decoration: none;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--link-color);
  color: #ffffff;
  border-color: var(--link-color);
}

.btn-primary:hover {
  background-color: var(--link-hover);
  color: #ffffff;
  text-decoration: none;
}

input[type="text"], input[type="search"], select {
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-color);
  color: var(--text-color);
  width: 100%;
}

/* Steps list */
ol.steps-list {
  padding-left: 1.5rem;
  margin-bottom: 1.5rem;
}

ol.steps-list li {
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;
}

/* Card components */
.card {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  background-color: var(--surface-color);
}

.hero-box {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}

.two-paths {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin: 2rem 0;
}

@media (min-width: 640px) {
  .two-paths {
    grid-template-columns: 1fr 1fr;
  }
}

.path-box {
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  background-color: var(--surface-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* Table styles */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  background-color: var(--surface-alt);
  font-weight: 600;
}

/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Banner */
.banner {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  border-left: 4px solid var(--border-color);
  background-color: var(--surface-alt);
}

.banner-warning {
  border-left-color: var(--warning-color);
  background-color: var(--warning-bg);
  color: var(--warning-color);
}

.banner-danger {
  border-left-color: var(--danger-color);
  background-color: var(--danger-bg);
  color: var(--danger-color);
}

.banner-success {
  border-left-color: var(--success-color);
  background-color: var(--success-bg);
  color: var(--success-color);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  min-height: 44px;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  min-height: 36px;
}

.btn-primary {
  background-color: var(--link-color);
  color: #ffffff !important;
}

.btn-primary:hover {
  background-color: var(--link-hover);
}

.btn-outline {
  background-color: transparent;
  border-color: var(--border-color);
  color: var(--text-color);
}

.btn-outline:hover {
  background-color: var(--surface-alt);
}

.btn-ghost {
  background-color: transparent;
  border-color: transparent;
  color: var(--link-color);
}

.btn-ghost:hover {
  background-color: var(--surface-alt);
}

/* Form controls */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

.form-group select, .form-group input {
  width: 100%;
  max-width: 480px;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: 1rem;
  min-height: 44px;
}

/* Tables */
.table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.table th, .table td {
  padding: 0.75rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.row-cancelled td {
  opacity: 0.6;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Forced colors mode (High Contrast) */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid Highlight;
  }
  .badge {
    border: 1px solid CanvasText;
  }
}

/* Print Stylesheet (Requirement: A11Y acceptance) */
@media print {
  header, footer, nav, .skip-link, .no-print {
    display: none !important;
  }
  body {
    background: #ffffff !important;
    color: #000000 !important;
    font-size: 12pt;
  }
  main {
    max-width: 100% !important;
    padding: 0 !important;
  }
  a {
    color: #000000 !important;
    text-decoration: underline !important;
  }
  a[href^="http"]:after {
    content: " (" attr(href) ")";
    font-size: 0.85em;
  }
  .card, .banner {
    border: 1px solid #666666 !important;
    background: none !important;
  }
}
`;
}
