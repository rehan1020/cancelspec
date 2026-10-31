# CancelSpec: Production Build Plan

Version 1.0 | 2026-10-30 | Working name only. Every name is config-driven and may change.

## 0. How to use this document

- Sections 1-18 are the source of truth for the build. Save them as docs/PLAN.md in the repo.
- Section 19 is the prompt for the coding agent.
- Section 18 lists assumptions the agent follows unless the maintainer overrides them.

## 1. Product definition

| Item | Definition |
| --- | --- |
| What it is | A free, open-source, browser-only tool plus a community dataset. A person drops in a bank statement (or picks services by hand), sees their recurring subscriptions, and gets step-by-step cancellation instructions. |
| Components | (1) Playbook dataset and spec. (2) Static reference website, one page per service. (3) In-browser scanner tool. (4) Release bundle and data packages. (5) Contributor tooling. |
| Users | Everyday people cancelling subscriptions; contributors adding playbooks; developers consuming the data. |
| Non-goals | Accounts, servers, databases, analytics, cookies. Bank or email linking. Credential handling. Automated cancelling or browser robots. Legal letters or legal advice. Payments or donations. Native or mobile apps. Languages other than English (strings stay externalized). |
| Success at 6 months | 100+ playbooks at launch and 300+ by month 6; 10+ outside contributors; 1+ tool consuming the bundle; scanner recall >= 90% and precision >= 85% on fixtures; zero privacy incidents; median time from landing to first step under 30 seconds. |

## 2. Non-negotiable requirements

| ID | Requirement | Verified by |
| --- | --- | --- |
| PRIV-1 | No user data leaves the device. Zero network requests during or after a scan. | Playwright test with network blocked after load |
| PRIV-2 | Nothing derived from a statement is persisted: no cookies, localStorage, sessionStorage, IndexedDB, or Cache API writes. | Storage audit test |
| PRIV-3 | No third-party requests on any page: no CDNs, fonts, scripts, images, analytics, or embeds. | CI crawl of the built site; all requests same-origin |
| PRIV-4 | Strict Content-Security-Policy on every page. Tool page uses connect-src none. | CSP lint test |
| OPEN-1 | Code AGPL-3.0-or-later with attribution terms; corpus CC BY-NC-SA 4.0; spec text and schema CC BY 4.0; REUSE compliant. | REUSE check in CI |
| OPEN-2 | Reproducible builds: two clean builds yield identical output hashes. | CI job |
| OPEN-3 | Output is plain static files, deployable on any static host and usable offline from a zip. | Offline test |
| A11Y-1 | WCAG 2.2 AA on every page and tool state. | axe in CI plus manual checklist |
| A11Y-2 | Service pages work fully without JavaScript. | No-JS test |
| A11Y-3 | Playbook steps read at grade 8 or below, one action per step. | Readability lint (warning) plus review |
| A11Y-4 | Fast on low-end phones within the budgets in section 11. | Budget test |
| FREE-1 | Recurring cost is zero. No paid dependency or service. | Review |
| LEGAL-1 | No legal-advice wording, no logos, no personal data collection. | Content lint plus review |
| SOLO-1 | Maintenance after launch fits about 3 hours per week through automation. | Ops review |

## 3. Third-party policy (decision D1)

Interpretation: the shipped product contains no third-party code and calls no third-party service. Build-time tools are allowed from a short, pinned allowlist.

| Area | Rule |
| --- | --- |
| Shipped output | All JavaScript, CSS, and SVG authored in this repo. System font stack. No frameworks, icon packs, or CSS libraries. |
| Build and test allowlist | Node.js LTS with npm workspaces; TypeScript; esbuild; Vitest; Playwright with its browsers; axe-core; one YAML parser (build-time only); Python 3 with the REUSE tool (CI only). Anything else needs a written decision record. |
| Installs | Exact version pins, committed lockfile, integrity hashes, npm ci only, install scripts disabled, license check on every dependency. |
| CI actions | First-party GitHub actions only, pinned to full commit SHAs. No third-party actions. |
| Hosting | Static files only on Cloudflare Pages (primary) and GitHub Pages (fallback). No Functions, Workers, or server code. |

## 4. Architecture

Everything is static. A build step turns playbooks into a website and a data bundle. The scanner runs in the visitor's browser inside a Web Worker.

| Package | Responsibility | Constraints |
| --- | --- | --- |
| spec | Schema definition, enums, version constant, validator, conformance fixtures | No dependencies; pure functions |
| core | Playbook loader, merchant normalization, alias index, difficulty scoring, bundle writer | Depends on spec only; deterministic output |
| scanner | Statement intake, parsing, recurrence detection, matching; runs in a Web Worker | Depends on core; no network, no storage, no globals; no logging of content |
| ui | Small DOM helper library: element builder with escape-by-default text, state store, live-region announcer, focus manager | No dependencies; never uses innerHTML |
| site-builder | Static site generator: templates are functions returning escaped HTML; routing, sitemap, search index, headers file | Depends on core and ui; deterministic output |
| cli | Commands: lint, new, build, release-check | Depends on spec, core, site-builder |

Dependency direction is one-way (spec, core, scanner, ui, site-builder, cli). CI fails on cycles.

| Path | Contents |
| --- | --- |
| packages/\* | The packages above |
| site/ | Content pages, templates, styles, tool page source, static assets |
| playbooks/REGION/ | One YAML file per service per region |
| fixtures/ | Synthetic statements and expected results, plus generator configuration |
| tests/ | End-to-end, accessibility, privacy, and budget tests |
| docs/ | PLAN.md, decision records, contributor guide, spec docs |
| policies/ | Privacy, takedown, security, NC policy, trademark, conduct |
| scripts/ | Build, release, and CI helper scripts |
| project.config | Single source for project name, package scope, repo URL, site URL, contact addresses |

| Build output | Description |
| --- | --- |
| Site | Pre-rendered HTML, CSS, JS, search index, sitemap, robots, headers file |
| Release bundle | One versioned data file with every published playbook and its derived fields |
| Scanner index | Alias and merchant-pattern index compiled into the scanner worker |
| Data packages | The bundle plus a tiny loader, for npm and PyPI |
| Changelog | Diff of playbooks against the previous release |

## 5. Data design

Files: playbooks/REGION/SERVICE-ID.yaml. Regions: US, UK, EU, IN, GLOBAL. One file per service per region. Service IDs are lowercase kebab-case ASCII and unique within a region.

| Group | Field | Required | Rules |
| --- | --- | --- | --- |
| Identity | id, name | yes | name is plain text |
| Identity | aliases | no | List of other names people use |
| Identity | category | yes | Enum below |
| Identity | website | yes | Official domain as text; never used for tracking |
| Matching | merchant\_patterns | yes | Statement descriptor strings, uppercase; only the star wildcard |
| Channels | channels | yes | List; each has channel (enum), steps (ordered list of plain-text actions, 200 characters max each, optional https link), entry\_url, notes |
| Friction | tags | no | Enum list below |
| Friction | accessible\_alternative | no | Plain text describing a non-phone, non-CAPTCHA route if one exists |
| Facts | notice\_period, refund\_window, auto\_renews | no | Each fact carries source URL and date |
| Provenance | contributors, reviewers | yes | Handles; pseudonyms allowed |
| Provenance | verified\_on, verification\_method | yes | Method enum below |
| Provenance | sources | yes | URLs with accessed dates |
| Provenance | revision | yes | Integer, increments on each change |
| Status | status, status\_reason | yes | Enum below |
| Derived (build only) | difficulty, accessible\_to\_cancel, staleness\_days, matcher\_key | never authored | Computed by core |

| Enum | Values |
| --- | --- |
| channel | direct, apple, google-play, carrier-billing, paypal, bank-mandate, other |
| category | streaming-video, streaming-music, cloud-storage, software, vpn-security, fitness-health, news-media, gaming, education, telecom-bundle, delivery-membership, finance-tools, other |
| tags | phone-required, chat-only, email-only, retention-offer, survey-wall, hidden-entry, captcha, app-required, in-person, fee-on-exit, long-notice |
| verification\_method | first-hand, official-help-page, community-report |
| status | draft, active, stale, broken, discontinued |

Rules:

- Text fields are plain text only: no HTML, no Markdown. Links appear only in dedicated link fields and must be https.
- Draft playbooks never reach the site or the bundle. A playbook with a missing verification method or verified\_on date cannot leave draft.
- Authoring YAML is restricted to a strict subset (maps, lists, strings, integers, booleans, dates). The linter rejects anchors, tags, and merge keys.
- Spec versions use semantic versioning. Data releases use calendar versions (YYYY.MM.N). Breaking schema changes need a decision record and a migration note.
- Difficulty is computed, never hand-written (rubric in section 6).

## 6. Scanner specification

| Stage | Rules and default parameters |
| --- | --- |
| 1. Intake | Accept .csv, .tsv, .txt (OFX in phase 2). Maximum 20 MB and 200,000 rows. Read through the File API inside a dedicated Worker. Detect BOM, UTF-8, UTF-16, fallback windows-1252. Detect delimiter by consistency over the first 50 lines. Support quoted fields and embedded newlines. Skip preamble lines before the header and ignore trailing summary lines. |
| 2. Column mapping | Score columns for date (90% or more parse as dates), description (longest average text), amount (90% or more numeric), and debit/credit pairs. If confidence is under 0.8, show a mapping form with a 5-row preview. Choices are never stored. |
| 3. Dates | ISO, DD/MM/YYYY, MM/DD/YYYY, DD-MMM-YYYY, D MMM YYYY, YYYY/MM/DD, two-digit years. Infer day-first or month-first from values above 12. If still ambiguous, default to day-first and show a toggle. |
| 4. Amounts | Handle 1,234.56 and 1.234,56 and 1 234,56 and lakh grouping 1,23,456.78. Parentheses, trailing minus, and CR/DR suffixes. Infer sign convention (most amounts negative means charges are negative); debit/credit columns map debit to outflow. Offer a toggle. |
| 5. Normalize | Uppercase, Unicode NFKC. Remove digit runs of 4 or more, dates, reference tokens, and noise words (POS, PURCHASE, DEBIT, CARD, UPI, NEFT, IMPS, ACH, SEPA, DD, SI, AUTOPAY, RECURRING, PAYMENT, TXN, REF). Detect processor prefixes (PayPal, Google, Apple, Square) and keep them as billing-channel hints. For UPI handles keep the local part and drop the bank handle. Produce a merchant key of at most 6 tokens. |
| 6. Group | Group by exact key. Merge groups when token-set similarity is 0.8 or higher, or one key is a prefix of the other (at least 6 characters or 2 tokens). Never merge across currencies. |
| 7. Recurrence | Sort by date; collapse same-day duplicates; compute day intervals. Cadence windows: weekly 7 plus or minus 1; biweekly 14 plus or minus 2; monthly 26-35 days or same day-of-month plus or minus 3 or month-end; quarterly 89-94; semiannual 175-190; annual 358-373. A cadence applies when 70% of intervals fit. Minimum charges: 3 for weekly and biweekly, 2 otherwise. A single annual charge counts only when it matches a playbook, and is labeled possible. Amount stability: 70% of charges within 10% of the median (or within 1.00 for amounts under 10); allow one price step. Discard groups with more than 3 distinct amounts and high variance (likely retail). |
| 8. Confidence | Score 0-100: regularity 35, charge count 20 (capped at 6), amount stability 25, playbook match 20. Show likely at 60 or more; possible at 40-59 (collapsed section); hide below 40. Flag may have ended when the last charge is overdue by more than 1.5 cadences relative to the latest statement date. |
| 9. Match | Compare merchant keys with the compiled alias and merchant-pattern index: exact 1.0, prefix 0.9, token-set 0.8 or higher. Accept at 0.8. Ties show all choices with region labels. |
| 10. Output | Annualized cost equals typical amount times periods per year. Totals per currency; no conversion. Sort by annualized cost. |
| 11. Safety | Plain-language errors; never echo raw rows; no console logging of content; on reset or tab close terminate the Worker and drop all references. |
| 12. Performance | 5,000 rows in under 2 seconds on a mid-range phone class; 100,000 rows in under 10 seconds on desktop; UI stays responsive. |

Difficulty rubric v0 (versioned in spec, tunable):

| Signal | Points |
| --- | --- |
| 4-6 steps / 7 or more steps | 1 / 2 |
| phone-required | 2 |
| chat-only | 1 |
| retention-offer | 1 |
| survey-wall | 0.5 |
| hidden-entry | 1 |
| captcha | 1 |
| app-required | 1 |

Score bands map to 1-5. accessible\_to\_cancel is false when phone-required, captcha, or app-required applies and no accessible\_alternative exists.

## 7. Tool UI and content design

| Screen | Behavior |
| --- | --- |
| Start | Two paths: pick services by hand, or scan a statement. One-sentence privacy statement. File picker plus optional drop zone. A noscript message explains that the tool needs JavaScript and links to the service pages. |
| Mapping (only when needed) | Column and date-format selectors with a 5-row preview and live validation messages. |
| Results | Sortable table: service, cadence, cost per year, difficulty, action. Sections: Likely, Possible (collapsed), Not in our data yet. Totals per currency. Actions: See how to cancel (opens the service page in a new tab with noopener), Not a subscription, Already cancelled. State lives in memory only. |
| Checklist | Printable list with checkboxes and totals; plain-text copy button. |
| Unmatched | Each item offers Suggest this playbook: a link to a prefilled GitHub issue form containing only the cleaned merchant key and the cadence bucket. The exact text to be sent is shown before the link is followed. |
| Errors | Plain language, say what happened and what to try; never reveal file contents. |

Accessibility acceptance (applies to every page and state):

- One h1 per page, ordered headings, landmarks, skip link, visible focus with 3:1 contrast, targets at least 24 px (aim for 44 px), contrast 4.5:1 for text.
- No color-only signals; difficulty shown as text and number. Respect prefers-reduced-motion, prefers-color-scheme, and forced-colors.
- Reflow at 400% zoom, text-spacing overrides, no horizontal scroll for content.
- Live-region announcements for scan progress, result counts, and errors. Real table semantics; sort buttons expose state.
- Links that open a new tab say so in their text. Print stylesheet on service pages and the checklist.

Content rules: plain English, sentences of 20 words or fewer, each step starts with a verb and has one action, no idioms, no brand voice, describe buttons by their visible label and purpose.

## 8. Site specification

| Page | URL | Notes |
| --- | --- | --- |
| Home | / | Search box plus the two tool paths |
| Tool | /tool/ | Scanner page; strictest CSP |
| Service page | /services/REGION/ID/ | See anatomy below |
| Service indexes | /services/, /services/category/NAME/, /services/region/CODE/ | Static link lists; work without JavaScript |
| Search | /search/ | Small same-origin index; link-list fallback without JavaScript |
| Hall of Shame | /hall-of-shame/ | Generated from tags only; links to methodology |
| Methodology | /methodology/ | Difficulty rubric and verification standards |
| Spec docs | /spec/ | Fields, enums, versioning |
| Contribute | /contribute/ | How to add or fix a playbook |
| Policies | /policies/NAME/ | Privacy, takedown, NC policy, trademark, security |
| Changelog | /changelog/ | Per-release diff |
| Data | /data/bundle.VERSION.json and /data/latest | Release bundle |
| Support files | 404, sitemap.xml, robots.txt |  |

Service page anatomy: title in the form How to cancel NAME (REGION); last-verified date, method, and status banner; Where do you pay? sections as anchored headings (no JavaScript); numbered steps; friction tags in text; difficulty and accessibility flag; facts with sources; Is this wrong? link to a prefilled issue with only the service id; attribution and license line; print stylesheet.

SEO basics: unique title and description per page, canonical URL, breadcrumbs, sitemap. No tracking. Page budget: service page 100 KB or less with zero required JavaScript.

CSP by page type (set in the headers file on Cloudflare, mirrored as meta tags for GitHub Pages):

| Page type | Policy summary |
| --- | --- |
| Tool page | default-src none; script-src self; worker-src self; style-src self; img-src self and data; connect-src none; base-uri none; form-action none |
| Content pages | Same, except connect-src self (search index only) |

## 9. Security and supply chain

| Control | Detail |
| --- | --- |
| Repository | Branch protection on main; pull request and passing checks required; linear history; CODEOWNERS for spec, policies, and each region of playbooks; 2FA on every account; secret scanning and push protection on; private vulnerability reporting on. |
| CI permissions | Read-only default token; minimal per-job permissions; deploy and publish jobs sit in protected environments; no secrets exposed to builds from forks. |
| Dependencies | Section 3 rules; native dependency alerts reviewed weekly; updates arrive as manual pull requests; license allowlist enforced in CI. |
| Build integrity | Reproducible-build check; SBOM from npm's built-in sbom command attached to each release; GitHub artifact attestations for release files; npm and PyPI trusted publishing with provenance (no long-lived tokens). |
| Response headers | Referrer-Policy no-referrer; X-Content-Type-Options nosniff; Permissions-Policy denying camera, microphone, geolocation, and similar; Cross-Origin-Opener-Policy same-origin; Cross-Origin-Resource-Policy same-origin; frame-ancestors none. GitHub Pages cannot set headers, so meta CSP covers what it can and the limitation is documented. |
| Code safety | No innerHTML, eval, or Function constructor; escape-by-default templates; Map and Set instead of plain objects for untrusted keys; linear-time patterns only; hard input size limits; Worker terminated on reset; data-driven links must be https. |

| Threat | Control |
| --- | --- |
| Malicious or malformed statement file | Size caps, parser fuzzing, no eval, Worker isolation |
| Hostile merchant strings (markup, script) | textContent only; tests with hostile strings |
| Malicious playbook pull request (phishing or malware links) | https-only links, link check, official-domain flag for reviewers, human review |
| Compromised dependency | Zero shipped third-party code; pins; no install scripts; provenance |
| Compromised maintainer account | 2FA, branch protection, environment approvals |
| Lookalike org or clone sites | Official URL stated in README, site footer, and package readmes; signed releases |
| Host takeover or outage | Two hosts; all data in git; static portable output |

## 10. Privacy engineering and evidence

- Contract: the project collects nothing and stores nothing. Request logs (IP, user agent) exist only at the hosting provider, which the project cannot read; PRIVACY.md says so in one screen.
- Automated evidence: tests named no-network-during-scan, no-storage-writes, no-third-party-requests, csp-lint, and no-cookies run on every pull request. /policies/privacy/ explains how a visitor can verify the same claims with browser developer tools (Network and Application tabs).
- Contributors: pseudonymous handles allowed; pull request template warns against personal information; noreply commit emails recommended; test-data policy requires synthetic data only; a CI lint flags strings resembling account numbers or personal emails in fixtures.
- Suggest-a-playbook, Is-this-wrong, and parsing-problem links carry only a service id, a cleaned merchant key with cadence bucket, or column header names; the user sees the exact text before following the link.
- No analytics ever. Adoption is read from stars, issues, and package download counts only.

## 11. Testing and quality

| Layer | Scope | Threshold |
| --- | --- | --- |
| Unit | Spec, core, every scanner stage (Vitest) | Line coverage 90% or more for scanner, 85% or more for spec and core |
| Property and fuzz | Date parsing, amount parsing, delimiter detection, pattern linearity; seeded in-repo random generator; 10,000 cases per property | No failures; runtime within CI budget |
| Fixture accuracy | Synthetic statements for US, UK, EU, IN | Recall 90% or more, precision 85% or more; any regression fails |
| End to end | Playwright on Chromium, Firefox, WebKit plus a small-phone viewport: manual picker, scan, mapping form, result actions, checklist, errors | All pass |
| Privacy | Section 10 tests | Required |
| Accessibility | axe on every page and tool state; keyboard-only script; 400% zoom; forced-colors; reduced-motion; manual screen-reader checklist per release (NVDA with Firefox, VoiceOver with Safari, TalkBack), best effort | No new violations |
| Content | Playbook linter: schema, links, alias collisions, step length, readability warning, banned legal-advice phrases | Required |
| Budgets | Service page 100 KB or less; home 60 KB or less; tool page including Worker and index 300 KB or less (transfer size) | Required |
| Reproducibility | Build twice, compare hashes | Required |
| Offline | Serve the built output from a local zip with the network disabled; run the basic flow | Required |

Fixture generator (seeded, reproducible):

| Aspect | Specification |
| --- | --- |
| Statements | 6-18 months, 300-5,000 rows per file, fictional account holders and numbers |
| Seeded subscriptions | 5-20 per statement across weekly, biweekly, monthly, quarterly, semiannual, annual cadences; price changes; a missed month; trial-to-paid conversions; cancelled mid-statement |
| Noise | Groceries, fuel, rent, salary credits, transfers, refunds, duplicates, FX fees, one-off online purchases |
| Descriptor styles | US card descriptors with asterisks; UK direct debit and faster payments; EU SEPA and Lastschrift; IN UPI autopay, ACH, and SI mandates |
| Layouts | Single signed amount, debit/credit split, varied date formats, delimiters, encodings, preamble lines, trailing summaries |
| Outputs | Statement file plus an expected-results file (merchant key, cadence, charge count) |

Flaky tests are quarantined with a linked issue and fixed within 7 days.

## 12. CI/CD and operations

| Workflow | Trigger | Jobs | Required |
| --- | --- | --- | --- |
| pr-check | Pull request | Install with npm ci; lint; type-check; unit, property, and fixture tests; build; REUSE; DCO; link check on changed files; privacy, accessibility, budget, and end-to-end tests | Yes |
| main-deploy | Push to main | Full pr-check; reproducible-build check; deploy to both hosts; post-deploy smoke test | n/a |
| release | Tag vYYYY.MM.N | Build; SBOM; attestations; publish npm and PyPI; GitHub release with bundle and changelog | Protected-environment approval |
| weekly | Cron | Staleness check; full link check; dependency alert review; open issues for failures | No |
| daily | Cron | Fetch home page, one service page, and the bundle hash from both hosts; open an issue on failure | No |

- CI target: under 10 minutes, with caches keyed to the lockfile.
- Deployment (decision D4): GitHub Pages through the official Pages actions; Cloudflare Pages through its Git integration running the same build script on merges to main only (stays inside the free build allowance). Both outputs are compared by hash in the daily job.
- Rollback: redeploy the previous tag on both hosts; data is always recoverable from git.
- Flow: trunk-based; one pull request per work packet; squash merge.
- Monitoring: no telemetry; the daily job is the only monitor.
- Runbooks (docs/runbooks/): deploy failure, host outage, takedown request, security report, many broken playbooks at once, sensitive data committed by mistake (history rewrite steps), publishing credential concern.

## 13. Release management and data operations

| Item | Rule |
| --- | --- |
| Versions | Spec semantic versions; data calendar versions YYYY.MM.N; packages follow the data release; every release is a signed tag |
| Release steps | Freeze main; run release-check; review changelog; tag; approve environment; publish; announce |
| Staleness | verified\_on older than 180 days shows a stale banner automatically; older than 365 days drops out of search results and is queued for archive review |
| Broken playbooks | Three independent reports mark a playbook broken; target is verification within 14 days (a goal, not a service commitment) |
| Review rules | New service needs two reviewers; edits need one; reviewer checklist in section 15 |
| Contributor ladder | Contributor, then reviewer (five merged playbooks with no accuracy problems), then region maintainer |
| Discontinued services | Kept with a reason and shown as discontinued; scanner still matches them but flags the status |
| Automation for the 3 hours per week budget | Auto-labeling, link checks, staleness jobs, issue forms, release-check, saved replies; triage 1 hour, review 1.5 hours, release 1 hour monthly |

## 14. Governance, licensing, and policies

| File | Purpose |
| --- | --- |
| LICENSES directory, LICENSE files per layer, NOTICE | REUSE-compliant license map |
| ATTRIBUTION.md | Copy-paste credit text for code and data: name, canonical URL, license link |
| GOVERNANCE.md | Maintainer ladder; decisions through public issues and RFCs; no relicensing without a public RFC and notice to contributors |
| CONTRIBUTING.md | DCO sign-off; add a playbook in about 10 minutes; synthetic data only; no copied text |
| CODE\_OF\_CONDUCT.md | Conduct standard and enforcement contact |
| SECURITY.md | Private reporting route; response goals |
| PRIVACY.md | One-screen statement per section 10 |
| TAKEDOWN.md | Contact; acknowledge within 3 days; fact-check; correct or remove valid claims within 7 days; outcome logged publicly with personal details redacted; platform notices follow GitHub and Cloudflare processes |
| NC\_POLICY.md | Allowed: personal use, nonprofits, schools, researchers, free ad-free tools and trackers, internal staff use. Not allowed: paid products or services, ad-supported or affiliate sites, selling or bundling the data. Commercial rights request: default answer is no because contributors hold copyright. |
| TRADEMARK.md | Name and logo rules; forks may not imply endorsement; service names appear only as plain text for identification |
| ACCESSIBILITY.md | Statement, known issues, how to report a barrier |

Footer disclaimer on every page: informational only, not legal advice; service names belong to their owners and are used for identification.

## 15. Playbook seeding and quality

| Item | Rule |
| --- | --- |
| Launch mix (100) | About 40 global services plus 60 regional (US 20, UK 15, EU 10, IN 15), ranked by prevalence |
| Workflow | Pick from queue; scaffold with the new command; verify; write steps; tag friction; open pull request; review |
| Verification order | First-hand (own account or free trial) preferred; official help page acceptable with URL and accessed date; community report lowest and flagged |
| AI-assisted drafting | An agent may draft only from pages it actually read; sets verification\_method to official-help-page with the real URL and date; never invents steps; every draft stays status draft until a human confirms it |
| Throughput | About 3 playbooks per working day; quality before count |

Reviewer checklist:

1. Schema passes and no lint warnings are ignored.
2. Steps match the cited source or a live check.
3. One action per step, verbs first, grade 8 or below.
4. Each friction tag is justified.
5. Links are https and point to official domains.
6. Text is original, not copied.
7. No logos or brand assets.
8. Every fact has a source and date.
9. Billing-channel branches are complete (direct, Apple, Google Play, carrier, PayPal, bank mandate where relevant).
10. verified\_on and method are present.

## 16. Delivery plan

| Phase | Packets | Gate to leave the phase |
| --- | --- | --- |
| A. Foundations (about 1 week) | WP1-WP4 | CI green; 10 reference playbooks pass the linter; invalid fixtures rejected with clear messages |
| B. Product (about 2 weeks) | WP5-WP9 | Full tool flow works end to end on synthetic data; accuracy and speed targets met; privacy, accessibility, and budget gates required on main |
| C. Hardening (about 1 week) | WP10-WP13 | Release dry-run succeeds; docs and policies complete |
| D. Launch (about 1 week) | WP14 | Launch checklist complete; soft launch fixes closed |

Playbook seeding (30, then 100) runs in parallel from the end of WP2 through Phase C. Durations assume agent execution plus same-day human review; scale them if review is slower.

| WP | Goal | Deliverables | Acceptance | Needs the maintainer |
| --- | --- | --- | --- | --- |
| 1 | Bootstrap | Monorepo, project.config, license layers, REUSE, CI skeleton, AGENTS.md, policy stubs | CI green; REUSE passes | Create repo; set branch protection |
| 2 | Spec and validator | Schema, enums, lint rules, conformance fixtures | 10 reference playbooks valid; invalid set rejected | Review field list |
| 3 | Core | Loader, normalization, alias index, scoring, bundle writer | Unit tests; deterministic output | No |
| 4 | CLI | lint, new, build, release-check | New playbook scaffold passes lint in one command | No |
| 5 | Site builder | Templates, all pages, sitemap, search index, headers, print CSS | All pages build; service pages work without JavaScript | No |
| 6 | Fixtures | Generator, statements, expected results | Reproducible from a seed | No |
| 7 | Scanner | Stages 1-12 in a Worker | Recall 90% or more, precision 85% or more, speed targets | No |
| 8 | Tool UI | Start, mapping, results, checklist, unmatched, errors | End-to-end tests pass in three browsers | Review wording |
| 9 | Gates | Privacy, CSP, third-party crawl, storage audit, accessibility, budgets, reproducible build, offline | All enabled as required checks | Enable required checks |
| 10 | Hall of Shame and methodology | Tag-derived page and rubric page | No editorial text | Review methodology |
| 11 | Contribution kit | Issue forms, PR template, labels, staleness, link, and uptime jobs | Forms create labeled issues | Enable labels and issue forms |
| 12 | Release pipeline | Bundle, SBOM, attestations, trusted publishing, changelog, data packages | Dry-run release succeeds | Register registry accounts and publishers |
| 13 | Docs and policies | Contributor guide, spec docs, privacy verification page, accessibility statement | Policies match section 14 | Approve policy text |
| 14 | Launch readiness | Rehearsal, checklist, launch posts, demo capture | Checklist complete | Yes |

Definition of done for every packet: tests added and passing; documentation updated; all required checks green; deviations recorded in docs/decisions; no TODO without a linked issue; pull request report filled in.

Launch checklist:

- 100 playbooks verified and published; none in draft.
- All required checks green on main; both hosts deployed and matching.
- Policies live; contact addresses working; README states the free and no-data pledge and the official repository URL.
- Name, trademark, and handle clearance logged in docs/name-clearance.md.
- Usability test: 5 non-technical people, at least 4 complete a lookup unaided in under 2 minutes.
- Soft launch to about 10 reviewers; no critical issue open.
- Rollback rehearsed; launch posts drafted (Show HN, selfhosted, privacy, personal finance communities).

## 17. Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Playbook rot | High | High | Staleness jobs, breakage reports, region reviewers |
| AI-drafted steps are wrong | Medium | High | Draft status, human verification, required sources and dates |
| Takedown or cease-and-desist letter | Low-Medium | Medium | Facts only, no logos, rubric-based scores, takedown process, mirrors |
| Statement parsing fails for some banks | High | Medium | Mapping form, broad fixtures, parsing-problem link carrying only header names |
| Solo maintainer burnout | Medium | High | Automation, scope caps, no SLA, second maintainer recruitment, archive-mode policy |
| Few contributors or adopters | Medium | High | Issue-form contributions, tracker integration pull requests, launch posts |
| NC license limits spread | Medium | Medium | NC policy welcomes free open-source consumers; spec is CC BY |
| Name squatting and lookalikes | Medium | Medium | Official-URL statements, claimed handles, signed releases |
| Supply-chain compromise | Low | High | Zero shipped third-party code, pins, no install scripts, provenance |
| Free-tier policy change at a host | Medium | Medium | Two hosts, portable static output |
| Accessibility regressions | Medium | Medium | Required gates, manual checklist |
| Privacy claim broken by a bug | Low | Critical | Network-blocked tests, CSP, public verification steps |
| Defamation complaint about Hall of Shame | Low | Medium | Objective rubric, evidence links, as-of dates, correction process |
| Closed sites copy the corpus | Medium | Low-Medium | CC BY-NC-SA, provenance metadata; enforcement is best effort |

## 18. Decisions and assumptions

| ID | Decision | Default |
| --- | --- | --- |
| D1 | Meaning of no third party | No third-party code or services in shipped output; pinned build-time allowlist (section 3) |
| D2 | Project name | Provisional; all names come from project.config |
| D3 | YAML parsing | One build-time-only parser permitted; authoring limited to a strict subset |
| D4 | Deployment | GitHub Pages via official actions; Cloudflare Pages via Git integration on merges to main |
| D5 | Site generator | Custom in-repo builder rather than a framework, to keep zero shipped third-party code and a small surface; revisit if upkeep grows |
| D6 | Language | English only; strings externalized for later locales |
| D7 | Statement formats | CSV and TSV at launch; OFX next; PDF later |
| D8 | Repository home | Maintainer's personal account until an organization name is settled |
| D9 | Funding | No donations, no paid tier |
| D10 | Licensing | Code AGPL-3.0-or-later with attribution terms; corpus CC BY-NC-SA 4.0; spec text and schema CC BY 4.0 |

## 19. Part B: prompt for the coding agent

Save sections 1-18 as docs/PLAN.md in the repository first, then give the agent the text below.

```text
ROLE
You are the lead engineer for this project. Build it from scratch in this repository. docs/PLAN.md is the single source of truth. Work autonomously in small reviewable steps and keep a written trail.

MISSION
Deliver a free, open-source, browser-only tool and dataset. A person drops in a bank statement (or picks services by hand), sees their recurring subscriptions, and gets step-by-step cancellation instructions from a community playbook corpus. Nothing runs on a server. No user data is ever collected, sent, or stored.

NON-NEGOTIABLES (a failing check blocks the work)
1. Privacy: zero network requests during or after a scan; no persistence of anything derived from a statement; no third-party requests on any page; strict CSP; no analytics, cookies, or telemetry.
2. No third-party code in shipped output. All runtime JavaScript, CSS, and SVG are authored in this repo. Build-time tools come only from the allowlist in section 3 of the plan. Any other dependency needs a decision record in docs/decisions/ and the maintainer's approval.
3. Licensing: code AGPL-3.0-or-later with attribution terms; corpus CC BY-NC-SA 4.0; spec text and schema CC BY 4.0; every file REUSE-compliant.
4. Accessibility: WCAG 2.2 AA; service pages work without JavaScript; plain language; the size and speed budgets in section 11.
5. No legal-advice wording, no logos, no real personal or financial data anywhere. Fixtures are synthetic.
6. All names, URLs, and contact addresses come from project.config only.
7. Never invent playbook facts. Draft playbooks only from pages you actually read, record the real source URL and access date, and leave status as draft until a human confirms.

HOW TO WORK
- Read docs/PLAN.md fully before starting. Re-read the relevant section before each work packet.
- Execute the work packets in section 16 in order, one packet per branch and pull request. Do not start a packet until the previous one is merged and green.
- Before coding a packet, write a short implementation note in docs/decisions/ (approach, alternatives rejected, risks).
- Write tests alongside the code. Run every required check locally before opening the pull request.
- If the plan is silent or ambiguous, choose the simplest option that satisfies the non-negotiables, record it in docs/decisions/, and continue. Do not stop to ask unless a stop condition applies.
- Keep the code small and boring: small files, typed boundaries, no clever abstractions, no speculative features, no dead code.
- Never push to main directly. Never run destructive git commands. Never commit secrets, tokens, or real data. Never edit docs/PLAN.md except through an approved change.

STOP AND ASK THE MAINTAINER WHEN
- You need an account, credential, token, domain, or repository setting changed.
- A change would weaken any non-negotiable.
- You want a dependency outside the allowlist.
- You need legal or policy wording beyond the templates in section 14.
- A task requires verifying a real cancellation flow on a live service.
- You are about to deploy, publish a package, or announce anything.

SCANNER AND SECURITY RULES
- The scanner may not import or call any network or storage API. CI enforces this.
- Render all untrusted text with textContent only. No innerHTML, eval, or Function constructor.
- Use Map and Set for untrusted keys. Use linear-time patterns only. Enforce the size limits in section 6.
- Never log file contents or merchant strings.

DEFINITION OF DONE (every packet)
- Acceptance criteria for the packet in section 16 are met.
- Tests are added and all required checks are green.
- Documentation is updated and any deviation is recorded in docs/decisions/.
- No TODO without a linked issue.

PULL REQUEST REPORT FORMAT
- Packet and goal.
- What changed (short list).
- Tests added and results of each required check.
- Anything untested or uncertain.
- Decisions made and records written.
- Items that need the maintainer.

FIRST ACTIONS
1. Reply with a 10-line confirmation that lists the non-negotiables and the 14 work packets in order.
2. Start work packet 1.
```
