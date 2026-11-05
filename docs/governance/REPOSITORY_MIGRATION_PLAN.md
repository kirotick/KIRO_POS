# KIRO GitHub organisation and repository migration plan

Status: **PROPOSAL — awaiting owner approval. Nothing below has been changed on GitHub yet.**
Prepared 2026-11-05 from a read-only inspection of `kirotick/KIRO_POS`, the local checkout and the GitHub API.

---

## 1. What exists today (inspected, not assumed)

### GitHub

| Item | Today | Risk |
|---|---|---|
| Owner | Personal account `kirotick` (no organisation) | Code ownership tied to one person |
| Repositories | 1: `kirotick/KIRO_POS`, **public**, 23 commits, branch `main` only | All KIRO source readable by anyone |
| Branch protection / rulesets on `main` | **None** | Any push deploys to production unreviewed |
| Collaborators | `kirotick` (admin) only | No second reviewer exists |
| Secret scanning + push protection | On (free because the repo is public) | — |
| Dependabot alerts / security updates | **Off** | Vulnerable dependencies go unnoticed |
| Actions | Enabled, **all actions allowed**, default token read-only | Unpinned third-party actions |
| Environments | **0** (no approval gate before production) | — |
| Repository secrets | 1 (`NEON_API_KEY`) | — |
| Tags / releases | 0 | No versioned, rollback-able releases |
| `KIRO-TECHNOLOGIES` | Not taken (404 as user and as organisation) | Likely available |
| `paterp9999-png/KIRO_DATA` | Someone else's public repo seen at the start | Not ours; excluded |

### Code modules in `KIRO_POS`

| Folder | What it is | Live? | Commits |
|---|---|---|---|
| `web/site/*.html`, `dc-lite.js`, icons | Marketing website (8 pages), built by `tools/build-design-site.mjs` | Netlify `kiro-pos.netlify.app` | 15 |
| `web/site/app/` | **KIRO POS** web app (single file, IndexedDB, offline, service worker) | `/app/` | 5 |
| `web/site/lux/` | **KIRO LUX** shop (kitchen supplies) | `/lux/` | 2 |
| `web/site-v1/`, `web/single-file/` | Old website versions | No | 1 each |
| `server/node/` | Core API (Express + PostgreSQL): auth, staff, items, stock, sales, reports, AI, nightly report **and** PhonePe payments | No (Render blueprint) | 3 |
| `server/node/migrations/` | Database schema `001_phonepe`, `002_core`, `003_nightly` | Neon prod/qa/dev | 1 |
| `server/node/client/phonepe-pay.js` | Browser helper for the payment QR | No | 1 |
| `server/phonepe/`, `server/sqlite-reference/` | Python reference implementations | No | 1 |
| `admin-app/` | Owner/manager mobile app (Expo, React Native) | No | 2 |
| `ai-relay/` | Cloudflare Worker for website AI | No | 1 |
| `erp-validator/` | Input validation library | No | 1 |
| `desktop-saree/` | Saree-shop desktop app (Electron + SQLite) — a separate product line | No | 2 |
| `qa/`, `.github/workflows/` | QA system, CI | CI | 7 / 3 |
| `docs/`, `render.yaml`, `netlify.toml` | Deploy docs and config | — | — |

### Duplication, conflicts and security risks found

1. **Three website versions** (`web/site` live, `web/site-v1`, `web/single-file`). Only `web/site` is used.
2. **Billing/GST logic exists twice**: in the POS web app (JavaScript, IndexedDB) and in the core API (PostgreSQL `create_sale`). Rounding rules differ in shape (POS: per-component rounding + round-off line; API: GST-inclusive prices). No single owner today.
3. **Payments are mixed into the core API** (`handlers.js`, `phonepe.js`, `crypto.js`, `store.js`, migration `001_phonepe.sql`, `client/phonepe-pay.js`) plus Python reference copies.
4. Server auth is marked **"PLACEHOLDER AUTH"** in `src/auth.js` (HS256 JWT). Works and is tested, but needs review before production.
5. No PostgreSQL row-level security; tenant isolation is enforced in queries (tested over HTTP: Business B cannot read or change Business A).
6. The repo is public: no secrets are committed (scan clean), but business logic and infrastructure identifiers (e.g. Neon project id in a README) are visible.

---

## 2. Recommended structure (adjusted to what exists)

The 10-repository layout in the directive is the right **destination**, but creating 10 repos today for a one-person team, with three of them empty, adds overhead without adding safety. I recommend **7 repositories now, 3 later**, with clear owners and a rule that nothing is copied between repos.

### Organisation

`KIRO-TECHNOLOGIES` (create it in the GitHub website: the API cannot create organisations).

Plan choice — **decision needed (D1):**

| | GitHub Free (org) | GitHub Team ($4 per user / month) |
|---|---|---|
| Branch protection / rulesets on **private** repos | **No** | Yes |
| Required reviews, required checks, CODEOWNERS enforcement on private repos | **No** | Yes |
| Secret scanning / push protection / CodeQL on private repos | No (needs paid Advanced Security) | No (needs paid Advanced Security) |
| On public repos | All of the above free | All of the above free |

Recommendation: **GitHub Team** with **private** repositories for everything except `kiro-web` (public website code is harmless and keeps free secret scanning there). For private repos, free replacements run in CI: gitleaks (secrets), Semgrep OSS (SAST), `npm audit` / OSV (dependencies) — no paid Advanced Security needed.

### Repositories

| # | Repository | Visibility | Gets from today's repo (with history) | Owns |
|---|---|---|---|---|
| 1 | **kiro-web** | public | `web/site` (except `app/`), `web/site/lux`, `tools/build-design-site.mjs`, `netlify.toml` | Website, KIRO LUX shop, the Netlify site, website icons |
| 2 | **kiro-pos** | private | `web/site/app` | POS web app: billing UI, orders, tables, kitchen screen, cashier, offline storage, printing (future) |
| 3 | **kiro-mobile** | private | `admin-app` | Owner/manager mobile app |
| 4 | **kiro-backend** | private | `server/node` (minus payments), `server/node/migrations/002_core.sql`, `003_nightly.sql`, `ai-relay`, `erp-validator` (as `packages/`), `server/sqlite-reference` (as reference) | Core API, auth, tenants, staff, items, stock, sales, reports, AI, **the core database schema and its migrations** |
| 5 | **kiro-payments** | private | `handlers.js`, `phonepe.js`, `crypto.js`, `store.js`, `client/phonepe-pay.js`, `migrations/001_phonepe.sql`, `server/phonepe` | KIRO PAY: provider adapters, dynamic QR, webhooks, idempotency, refunds, reconciliation. **Live payments stay disabled.** |
| 6 | **kiro-qa-testing** | private | `qa/` | Cross-product end-to-end, motion, responsive, accessibility, visual, load (k6), security tests, reports, release acceptance |
| 7 | **kiro-documentation** | private | `docs/`, `qa/PROJECT_AUDIT.md`, `qa/SCREEN_INVENTORY.md`, this plan | Architecture, ADRs, API docs, onboarding, change records |
| — | **.github** (org) | public | — | Shared CONTRIBUTING / SECURITY / issue templates and reusable CI workflows |
| later | kiro-security | private | — | Threat model, risk register, incident response (start as `kiro-documentation/security/` until there is a security owner) |
| later | kiro-infrastructure | private | `render.yaml`, Neon/Render/Netlify settings as code | When AWS/IaC exists; today the only infra files must stay next to the code they deploy |
| later | kiro-database | private | — | **Not recommended now**: migrations must change in the same pull request as the code that uses them; splitting them out risks code and schema drifting apart. The backend owns the schema; schema docs live in kiro-documentation. |
| separate | **kiro-saree-desktop** | private | `desktop-saree` | Separate product line — **decision needed (D2)**: own repo, or archive |
| archive | `KIRO_POS` | read-only | everything (history kept) | Archived after migration, never deleted |

### Ownership and dependency map

```
kiro-web  ──(Netlify proxy /app/*)──▶  kiro-pos (own Netlify site)
kiro-pos  ──(HTTPS API, future)─────▶  kiro-backend
kiro-mobile ──(HTTPS API)───────────▶  kiro-backend
kiro-backend ──(authenticated API)──▶  kiro-payments   (never the other way for business data)
kiro-payments ──(signed webhooks)───▶  PhonePe (disabled)
kiro-qa-testing ── tests all of the above (checked out by each repo's CI)
Database: kiro-backend owns core tables; kiro-payments owns payment tables (separate schema `payments`)
```

Rules: one owner per API, table and shared component; shared code (e.g. GST rounding) is published as a versioned package from its owner repo, never copied. **Billing/GST**: owner = kiro-backend; kiro-pos keeps its offline copy until it syncs with the API, with a shared test-vector file (same inputs → same totals) run in both repos' CI so the two cannot drift.

### Website URL stays the same

`kiro-pos` deploys to its own Netlify site; `kiro-web`'s `netlify.toml` proxies `/app/*` to it (status 200 rewrite), so `kiro-pos.netlify.app/app/` keeps working, offline service worker included. Verified before switching DNS-free.

---

## 3. Branches and approvals

- `main` = production. Branches: `feature/*`, `bugfix/*`, `security/*`, `release/*`, `hotfix/*`. No `develop` branch until there are several developers (trunk-based is simpler and safer for a small team).
- Ruleset on `main` in every repo: pull request required, required status checks (the repo's CI), no force pushes, no deletion, linear history, signed commits optional.
- CODEOWNERS: payments, auth, migrations and workflow files require the code owner's review.

**Decision needed (D3) — who approves?** Today only `kirotick` exists. GitHub does not let an author approve their own pull request, so "1 required approval" would block every change. Options:
(a) add a second trusted developer as reviewer (recommended before live payments), or
(b) require pull requests + passing checks, allow the admin to merge their own PR, and record it (not true four-eyes review; acceptable only until a second person joins).

---

## 4. CI/CD and security

- Every pull request: build, unit tests, integration tests (Neon `qa` branch via the `TEST_DATABASE_URL` secret), lint/format, `npm audit`/OSV, gitleaks, Semgrep, licence check, plus the browser suite for web/pos.
- Production: deploy only from `main` after checks pass; GitHub **environment `production`** with required reviewer, deployment logs, rollback = redeploy previous tag (Netlify keeps every deploy; Render keeps releases).
- Actions: allow only GitHub-owned and verified actions, pin third-party actions to commit SHAs, `permissions: contents: read` by default, no secrets for pull requests from forks.
- Secrets: GitHub environment secrets for CI; Netlify/Render/Neon dashboards for runtime; Neon branches give each environment its own database and password (prod / qa / dev already exist).
- Dependabot alerts + security updates on every repo.

### Environments

| | Local | Automated testing | Staging | Production |
|---|---|---|---|---|
| Database | Neon `dev` | Neon `qa` (wiped per run) | Neon `staging` branch (to create) | Neon `production` |
| Website/POS | local server | local server in CI | Netlify deploy previews | `kiro-pos.netlify.app` |
| API | local | local in CI | Render staging (to create) | Render (not deployed yet) |
| Payments | disabled | mocked | provider sandbox only | **disabled until approved** |

---

## 5. Migration steps (after approval; each step reversible until the final archive)

1. **You** create the organisation `KIRO-TECHNOLOGIES` (and choose the plan, D1).
2. I create the 7 repositories + `.github`, empty, private/public as above.
3. For each repository: `git subtree split --prefix=<folder>` from `KIRO_POS` so **each file keeps its full history**, then push to the new repo. Payments and backend need a small code split (moving files, an internal API between them); done in a pull request with all 68 server tests passing before and after.
4. Add README, CONTRIBUTING, SECURITY, CODEOWNERS, dependency list, build/test docs, versioning policy and CHANGELOG to each repo.
5. Configure rulesets, Dependabot, Actions restrictions, environments and secrets; move `TEST_DATABASE_URL` and `NEON_API_KEY`.
6. Point Netlify: `kiro-web` → existing site `kiro-pos` (same URL), new site for `kiro-pos` with the `/app/*` proxy. Run the full QA suite against the live URLs.
7. Tag `v1.0.0` releases with release notes; archive `kirotick/KIRO_POS` (read-only, not deleted).
8. Final report with evidence (rulesets, check runs, test results).

Irreversible steps (archiving the old repo, making repos private) happen only after everything above is verified.

## 6. Decisions needed from the owner

- **D1** GitHub plan: Team ($4/user/month, protections on private repos) — recommended — or Free (repos must stay public to be protected).
- **D2** `desktop-saree`: own repo `kiro-saree-desktop`, or archive.
- **D3** Reviewer: add a second developer, or admin-merges-own-PR until one joins.
- **D4** Approve the 7-now / 3-later structure (instead of creating all 10 now).

### Owner decisions (2026-11-05)

| | Decision | Consequence |
|---|---|---|
| D1 | **GitHub Free, repositories public** | Branch rulesets, required checks, secret scanning, push protection, Dependabot and CodeQL are all free on public repos. All KIRO source (incl. payments code) is readable by anyone, so secrets must never be committed — enforced by push protection + gitleaks. |
| D2 | **Archive `desktop-saree`** | Not migrated; it stays in the archived `KIRO_POS` history. |
| D3 | **Self-merge for now** | `main` requires a pull request and passing checks, 0 required approvals; the owner merges their own PRs (recorded on each PR). Add a second reviewer before live payments. |
| D4 | **All 10 repositories now** | `kiro-security`, `kiro-infrastructure` and `kiro-database` are created now. **kiro-database owns all schemas and migrations** (`001_phonepe` → `payments/`, `002_core`, `003_nightly` → `core/`); kiro-backend and kiro-payments CI check out kiro-database at a pinned tag to run their tests, so schema and code changes are linked by version. |

## 7. Status legend for the final report

Implemented · Tested successfully · Independently reviewed · Not yet implemented · Awaiting approval · Blocked by an external dependency. Nothing in this plan is implemented yet: **all items are "Awaiting approval"**.
