# CURSOR AI ENGINEERING PLAYBOOK
## End-to-end guide to building a responsive, secure, production-grade sportsbook

**Product:** NextGen Sportsbook (working name)  
**Initial market:** Ghana  
**Interfaces:** Customer Sportsbook · Super Admin · Agent Portal  
**Goal:** Use Cursor as an AI-assisted engineering team to plan, design, build, test, review, and prepare the platform for a controlled launch.

> **Important:** This is a software engineering guide, not legal or gambling-regulatory advice. Use mock data, simulated funds, and sandbox integrations until the business has obtained all required licences, regulatory approvals, sports-data rights, payment-provider permissions, independent security reviews, and operational approvals.

---

# 1. How to use this playbook

Do not paste the whole document into one Cursor prompt. Save it in your repository and work through the milestones in order. You are the product owner. Cursor is your engineering assistant: it can inspect code, plan, edit multiple files, run commands, write tests, debug, and review. It can still misunderstand requirements or produce insecure code. You approve business decisions and consequential changes.

## Principles

1. Plan before substantial implementation.
2. Maintain requirements, decisions, architecture, and project status in repository files.
3. Build small, testable milestones.
4. Keep business authority on the backend.
5. Use exact money arithmetic and an immutable double-entry ledger.
6. Snapshot accepted odds and make settlement deterministic and auditable.
7. Enforce permissions and resource ownership server-side.
8. Design mobile-first and inspect actual browser layouts.
9. Use mock data and sandbox integrations before real providers.
10. Review diffs and test results; generated code is not automatically correct.
11. Protect credentials and personal data.
12. Do not confuse a working demo with a licensed production sportsbook.

## Definition of done

A feature is complete only when approved acceptance criteria are met, relevant tests pass, backend validation and authorization exist, error/empty/loading/success states are handled, responsive behavior is checked, security implications are reviewed, documentation is updated, and remaining risks are disclosed. If a test was not run, say so.

---

# 2. Product requirements

The system has three interfaces connected to one central Laravel backend.

## 2.1 Customer Sportsbook

- Registration, login, logout, password recovery, account verification.
- Profile and security settings.
- Sports, competitions, fixtures, event details, markets, and selections.
- Pre-match first; live events after feed reliability and suspension controls are proven.
- Search and filters.
- Bet slip, singles and accumulators where rules are approved.
- Stake entry, potential-return estimate, authoritative acceptance/rejection.
- Bet history and details.
- Wallet and transaction history.
- Deposit and withdrawal journeys, initially simulated/sandbox-only.
- Promotions, bonuses, odds boosts, referrals, and shareable bet-slip codes where approved.
- Responsible-gambling information, limits, time-outs, self-exclusion, and support.
- Excellent mobile navigation and accessible controls.

Defer cash-out, bet builder, virtual sports, casino, and other complex products unless separately approved and specified.

## 2.2 Super Admin

- Overview and operational KPIs.
- Customers, agents, roles, and permissions.
- Sports, competitions, teams, fixtures, event statuses.
- Markets, selections, odds, publication and suspension controls.
- Bet monitoring and settlement.
- Wallets, ledger, deposits, withdrawals.
- Payment-provider configuration and webhook monitoring.
- Agent commission rules, statements, withdrawal approvals.
- Promotions, bonuses, odds boosts, referral configuration.
- Content, homepage, branding, tenant/domain settings if approved.
- Sports-data provider sync health.
- Reports, exports, reconciliation.
- Audit logs, security events, responsible-gambling controls, platform settings.

High-risk operations require explicit permissions, confirmation, recorded reason, and where appropriate a second approver.

## 2.3 Agent Portal

- Agent dashboard.
- Unique referral URL/code.
- Referred customer list and attribution status.
- Commission summary, statements, history.
- Eligible commission balance.
- Withdrawal request and status/history.
- Profile and security settings.

Agents only access their authorized scope. They must not manage customer wallets, odds, fixtures, settlement, payment configuration, other agents, or general customer administration. Hiding a menu is not authorization: every API route and query must enforce ownership.

## 2.4 Core journeys

**Customer:** register → verify → sign in → browse fixtures → select market → add to slip → enter stake → review → submit → receive server-confirmed result → view history → review wallet → simulated deposit/withdrawal.

**Agent:** sign in → copy referral link → refer customer → view attributed customers → view commission statement → request withdrawal → track status.

**Admin:** secure sign in → review dashboard → manage event/market/odds → publish/suspend → monitor bets → settle → inspect ledger → process withdrawal request → review audit trail.

---

# 3. Technical architecture

Start with a **modular monolith**, not microservices. Keep domain boundaries clear while avoiding premature distributed-system complexity.

## 3.1 Recommended stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Laravel, current supported release | Central API/business logic |
| Database | PostgreSQL | Transactional data |
| Cache/queues | Redis | Cache, queues, rate limits |
| Customer | Next.js, React, TypeScript | Customer application |
| Admin | Next.js, React, TypeScript | Admin dashboard |
| Agent | Next.js, React, TypeScript | Agent portal |
| UI | Tailwind CSS, shadcn/ui, custom system | Responsive interfaces |
| Realtime | Laravel Reverb/WebSockets where appropriate | Live updates |
| Backend tests | Pest or PHPUnit | Unit/feature/integration |
| Frontend tests | Vitest, Testing Library | Component/logic tests |
| Browser tests | Playwright | End-to-end/responsive |
| Infrastructure | Docker | Reproducible environments |
| Source control | Git/GitHub | Branches and reviews |

Verify current framework compatibility and versions. Do not silently replace the approved stack.

## 3.2 Suggested repository structure

Adapt this to the existing project. Do not rebuild or move working code just to match a diagram.

```text
nextgen-sportsbook/
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
├── .cursor/
│   ├── rules/
│   │   ├── 00-governance.mdc
│   │   ├── 10-architecture.mdc
│   │   ├── 20-financial-integrity.mdc
│   │   ├── 30-betting-integrity.mdc
│   │   ├── 40-security.mdc
│   │   ├── 50-ui-quality.mdc
│   │   └── 60-testing.mdc
│   ├── skills/
│   │   ├── sportsbook-architecture/SKILL.md
│   │   ├── sportsbook-ui/SKILL.md
│   │   ├── financial-ledger/SKILL.md
│   │   ├── sports-data/SKILL.md
│   │   ├── payment-integration/SKILL.md
│   │   ├── security-audit/SKILL.md
│   │   └── release-readiness/SKILL.md
│   └── commands/
│       ├── start-session.md
│       ├── implement-feature.md
│       ├── review-diff.md
│       ├── debug-issue.md
│       └── end-session.md
├── apps/
│   ├── customer/
│   ├── admin/
│   ├── agent/
│   └── api/
├── packages/
│   ├── ui/
│   ├── design-system/
│   ├── api-client/
│   ├── shared-types/
│   └── validation/
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── database/
│   ├── sportsbook/
│   ├── finance/
│   ├── integrations/
│   ├── design/
│   ├── security/
│   ├── compliance/
│   ├── testing/
│   ├── decisions/
│   ├── prompts/
│   ├── PROJECT_STATUS.md
│   └── CURSOR_AI_ENGINEERING_PLAYBOOK.md
├── infrastructure/
├── tests/
└── .github/workflows/
```

## 3.3 Backend domains

Identity/access; customers; agents/referrals; sports catalogue; competitions/fixtures; markets/odds; bet placement; settlement; wallet/ledger; deposits/withdrawals; payments; commissions; promotions; notifications; content/branding; reporting; audit/compliance; tenant configuration if approved.

Each module owns its business rules and exposes clear interfaces. Avoid circular dependencies and large controllers.

## 3.4 Backend is the source of truth

The frontend must never decide whether a user can bet, a market is open, odds are accepted, stake is valid, funds are available, payment succeeded, a bet is settled, commission is earned, or an admin action is authorized. The browser can show estimates, but the backend validates and calculates authoritative results.

---

# 4. Cursor workflow and setup

Cursor features and menus change. Check the current official documentation at https://cursor.com/docs.

## 4.1 Prepare environment

Install/verify Git, Node.js LTS, pnpm (or approved package manager), required PHP, Composer, PostgreSQL, Redis, Docker, Cursor, and GitHub. Use separate development credentials. Never paste production secrets into Cursor chat or commit them.

## 4.2 If the project already exists

1. Open the existing repository in Cursor.
2. Check the Git branch and uncommitted changes.
3. Use **Ask** mode to inspect the project before editing.
4. Identify the actual stack, entry points, schema, tests, and unfinished modules.
5. Do not scaffold over working code.
6. Save this playbook under `docs/CURSOR_AI_ENGINEERING_PLAYBOOK.md`.
7. Create/update `AGENTS.md` and `.cursor/rules/*.mdc`.
8. Run Prompt 00 before implementation.

## 4.3 Cursor modes and capabilities

| Mode/tool | Use |
|---|---|
| Ask | Read-only codebase investigation and explanations |
| Plan | Plan complex features/migrations before approving edits |
| Agent | Approved multi-file implementation, commands, tests |
| Debug | Difficult runtime defects and root-cause investigation |
| Browser | Inspect app, interact with UI, examine console/network, responsive QA |
| Cloud/Background Agents | Independent longer tasks; review branches and evidence before merging |

Availability and names can vary by version and plan. Confirm in your installed Cursor.

## 4.4 Standard workflow

**Inspect → Specify → Plan → Review → Approve → Implement → Test → Review diff → Document → Commit**

For substantial work require Cursor to identify:
- Requirements and acceptance criteria.
- Assumptions and unknowns.
- Files/modules to change.
- Business decisions still required.
- Database/security/financial implications.
- Tests to add/run.
- Migration and rollback implications.

## 4.5 Git safety

- Commit a known-good baseline before large changes.
- Use feature branches.
- Review every diff.
- Keep commits focused.
- Avoid unrelated formatting changes.
- Do not let parallel agents edit the same financial module or migration.
- Ask before destructive commands or production actions.

Suggested branches: `feature/customer-bet-slip`, `feature/admin-fixtures`, `feature/agent-referrals`, `fix/webhook-idempotency`, `security/agent-isolation`.

---

# 5. Root AGENTS.md

Create `AGENTS.md` in the repository root:

```markdown
# Project Engineering Instructions

## Role
Act as principal architect and engineering lead. The human is product owner
and final decision-maker. Research, plan, implement, test, and review, but do
not silently make product, financial, legal, security, or architecture decisions.

## Product
Build a mobile-first sportsbook with Customer, Super Admin, and Agent portals.
All interfaces use one central Laravel API. The backend is the authority for
authorization, odds, bets, wallets, payments, commissions, and settlement.

## Approved stack
Laravel, PostgreSQL, Redis, Next.js, React, TypeScript, Tailwind CSS,
shadcn/ui, Laravel Reverb where appropriate, Docker, Pest/PHPUnit, Vitest,
and Playwright. Inspect the repository and verify current official docs.
Do not silently replace technologies.

## Architecture
- Start as a modular monolith.
- Keep domain boundaries explicit.
- Use adapters for sports-data and payment providers.
- Keep business rules on the backend.
- Use documented API contracts and shared types.
- Avoid duplicated rules across frontends.
- Add only approved tenant/white-label complexity.

## Financial integrity
- Never use floating-point for money.
- Use integer minor units or justified exact-decimal arithmetic.
- Use an immutable double-entry ledger.
- Every posted journal must balance.
- Use atomic transactions and concurrency-safe updates.
- Make callbacks idempotent.
- Never edit/delete posted entries; reverse them.
- Reconcile internal and provider records.
- Never trust frontend balances or payment-success messages.

## Betting integrity
- Validate event, market, selection, odds, account, stake, and limits server-side.
- Store accepted odds and market/event state with the bet.
- Define odds-change behavior.
- Prevent duplicate submissions.
- Create bet and reserve/debit stake atomically.
- Make settlement deterministic, auditable, and idempotent.
- Use mock feeds during development.

## Authorization and privacy
- Enforce resource ownership on the backend.
- Customers see only their own protected resources.
- Agents see only their authorized referrals and commissions.
- Admin permissions are explicit and least-privilege.
- Audit sensitive financial/admin actions.
- Never log passwords, tokens, payment credentials, or unnecessary personal data.

## Security
- Validate input server-side.
- Use secure authentication/session handling, CSRF where applicable, headers,
  rate limits, and safe file handling.
- Protect secrets outside source control.
- Use strong authentication and 2FA for privileged accounts.
- Review dependencies.
- Do not run destructive commands or production migrations without approval.

## UI
- Mobile-first and tested at common widths.
- Shared tokens/components.
- Customer: deep navy/charcoal with restrained lime.
- Admin: graphite/neutral with controlled indigo or purple; no generic gradients.
- Agent: simple and focused.
- Include loading, empty, error, success, and disabled states.
- Maintain accessibility and readable contrast.
- Do not copy competitor branding or proprietary assets.

## Workflow
Inspect before editing. Restate acceptance criteria. Use Plan for substantial
work. Make focused changes. Add tests. Run checks. Review diffs. Update docs
and docs/PROJECT_STATUS.md. Report exact test results and remaining risks.

## Compliance boundary
Use mock/sandbox money and data. No real-money operation until licensing,
regulatory, data-rights, payment-provider, security, and responsible-gambling
requirements are independently reviewed and approved.
```

---

# 6. Cursor project rules

Project rules live in `.cursor/rules/` and use `.mdc` files with frontmatter. Plain `.md` files in this directory are not project rules. Use `description`, optional `globs`, and `alwaysApply` according to current Cursor documentation. Keep rules focused; rules are guidance, not a substitute for code-level security.

## 6.1 `.cursor/rules/00-governance.mdc`

```markdown
---
description: Project governance and safe implementation behavior.
alwaysApply: true
---

- Read AGENTS.md and relevant docs before editing.
- Inspect existing code; do not assume repository is empty.
- Do not overwrite working features or restructure without approval.
- Use Plan mode for substantial changes.
- Never invent business rules, provider capabilities, or approvals.
- Keep changes focused.
- Add tests and documentation.
- Report exact commands and test results.
- Ask before destructive commands or production actions.
```

## 6.2 `.cursor/rules/10-architecture.mdc`

```markdown
---
description: Architecture, module, database, API, and infrastructure changes.
globs: apps/**, packages/**, infrastructure/**
alwaysApply: false
---

- Preserve modular-monolith architecture unless an ADR approves change.
- Keep domain boundaries and dependency direction explicit.
- Avoid circular dependencies and duplicated rules.
- Use adapters for external sports and payment providers.
- Keep business logic out of controllers and UI components.
- Use typed contracts and explicit validation.
- Document important decisions in docs/decisions/.
- Explain migration, compatibility, and rollback implications.
- Do not add infrastructure/dependencies without explaining why.
```

## 6.3 `.cursor/rules/20-financial-integrity.mdc`

```markdown
---
description: Wallet, ledger, deposits, withdrawals, payments, refunds, commissions.
globs: apps/api/**, **/*Ledger*, **/*Payment*, **/*Wallet*, **/*Withdrawal*, **/*Deposit*, **/*Commission*
alwaysApply: false
---

- Treat money movement as high-risk.
- Use integer minor units or exact decimals; never float/double.
- Every posted double-entry journal must balance.
- Use atomic transactions and concurrency-safe balance updates.
- Use idempotency for commands and callbacks.
- Verify webhook signatures and provider references.
- Never trust client payment status.
- Never edit/delete posted entries; reverse or compensate.
- Distinguish pending, available, reserved, and withdrawn amounts.
- Reconcile provider and internal records.
- Test duplicates, concurrency, insufficient funds, reversals, and failures.
- Use simulated money and sandbox only during development.
```

## 6.4 `.cursor/rules/30-betting-integrity.mdc`

```markdown
---
description: Fixtures, markets, odds, bet slips, bet placement, and settlement.
globs: apps/api/**, **/*Bet*, **/*Odds*, **/*Market*, **/*Settlement*
alwaysApply: false
---

- All bet validation/acceptance happens on the backend.
- Store accepted odds and relevant market/event state as a snapshot.
- Define changed, suspended, and closed odds behavior.
- Prevent duplicate submissions with idempotency.
- Create bet and reserve/debit stake atomically.
- Enforce event, market, selection, account, stake, and limit rules.
- Make settlement deterministic, auditable, and idempotent.
- Keep corrections traceable.
- Test races, suspension, odds changes, voids, abandoned events, duplicate settlement.
- Use mock feeds in development.
```

## 6.5 `.cursor/rules/40-security.mdc`

```markdown
---
description: Authentication, authorization, personal data, APIs, integrations.
globs: apps/**, packages/**, infrastructure/**
alwaysApply: false
---

- Enforce authorization server-side for every protected operation.
- Deny by default and apply least privilege.
- Check resource ownership, especially agent referral scope.
- Validate inputs and encode outputs appropriately.
- Rate-limit sensitive endpoints.
- Protect privileged accounts with strong authentication and 2FA.
- Avoid secrets and sensitive data in logs.
- Audit sensitive actions.
- Review dependencies and unsafe configuration.
- Test unauthorized access, IDOR, and privilege escalation.
```

## 6.6 `.cursor/rules/50-ui-quality.mdc`

```markdown
---
description: Customer, admin, agent interfaces and responsive design.
globs: apps/**/*.tsx, apps/**/*.css, packages/**/*.tsx, packages/**/*.css
alwaysApply: false
---

- Follow approved design tokens and shared components.
- Prioritize mobile usability and touch interaction.
- Avoid generic AI dashboard styling and excessive gradients.
- Use clearly labelled mock data.
- Include loading, empty, error, success, and disabled states.
- Ensure labels, keyboard support, focus states, readable contrast.
- Verify at 360, 390, 768, 1024, and 1440 pixels.
- Do not copy competitor branding/assets.
```

## 6.7 `.cursor/rules/60-testing.mdc`

```markdown
---
description: Unit, feature, integration, browser, and regression tests.
globs: tests/**, **/*Test.php, **/*.test.*, **/*.spec.*
alwaysApply: false
---

- Derive tests from approved acceptance criteria.
- Test success, failure, boundaries, and unauthorized paths.
- Test financial and betting invariants, not just HTTP responses.
- Include idempotency and concurrency for high-risk operations.
- Use deterministic fixtures.
- Do not weaken/delete tests just to make a build pass.
- Report skipped tests and why.
- Run narrow relevant tests first, then broader suites.
```

---

# 7. Cursor Skills

Skills are reusable specialist workflows. Cursor supports project skills in `.cursor/skills/` and `.agents/skills/`; each skill is a folder containing `SKILL.md`. Verify current behavior in Cursor docs. You can create them manually or use `/create-skill` if available.

## 7.1 Architecture skill — `.cursor/skills/sportsbook-architecture/SKILL.md`

```markdown
---
name: sportsbook-architecture
description: Review sportsbook requirements, modules, APIs, data models, and architecture decisions.
---

Inspect AGENTS.md, approved requirements, and the real codebase. Identify
domain boundaries, ownership, data flows, transaction boundaries, API contracts,
security and concurrency risks. Document assumptions and unresolved decisions.
Produce diagrams and ADRs. Return blockers, risks, recommendations, and
product-owner questions. Do not implement major changes unless asked.
```

## 7.2 UI skill — `.cursor/skills/sportsbook-ui/SKILL.md`

```markdown
---
name: sportsbook-ui
description: Design and implement responsive customer, admin, and agent interfaces.
---

Customer: deep navy/charcoal, restrained lime. Admin: neutral graphite with
controlled indigo/purple. Agent: simple and focused. Premium, original,
mobile-first, accessible. Avoid generic AI dashboards, gradients, clutter.
Inspect existing tokens; identify user journey; propose layout; implement
reusable components; use labelled mock data; include loading/empty/error/
success/disabled states; test mobile/desktop; inspect screenshots and console.
Never move betting/financial authority into browser code.
```

## 7.3 Ledger skill — `.cursor/skills/financial-ledger/SKILL.md`

```markdown
---
name: financial-ledger
description: Design and review wallets, double-entry ledger, payments, commissions, reconciliation.
---

Define accounts, journals, and transaction states before coding. Use integer
minor units or exact decimals. Every posted journal balances. Separate pending,
available, reserved, settled funds. Make postings atomic and concurrency-safe.
Use idempotency. Never mutate posted history; reverse it. Reconcile records.
Define permissions/audit. Test duplicates, concurrency, failures, reversals.
Use sandbox only. Escalate accounting policy questions.
```

## 7.4 Sports-data skill — `.cursor/skills/sports-data/SKILL.md`

```markdown
---
name: sports-data
description: Integrate sports APIs, fixtures, scores, markets, odds, and provider mapping.
---

Use provider adapters. Document coverage, licensing, costs, limits, update
frequency, and terms. Map provider IDs explicitly. Handle duplicate, delayed,
missing, corrected, and out-of-order events. Store source/ingestion timestamps.
Separate provider state from platform publication. Do not treat feeds as
infallible. Log sync health. Use mock providers locally.
```

## 7.5 Payment skill — `.cursor/skills/payment-integration/SKILL.md`

```markdown
---
name: payment-integration
description: Implement payment adapters, deposits, withdrawals, webhooks, and reconciliation.
---

Use provider adapter contracts. Keep provider payloads out of domain services.
Verify signatures and replay protection. Enforce idempotency. Track provider
references, amount, currency, status. Handle pending/success/failure/reversal/
timeout. Reconcile. Use sandbox credentials only. Never assume a provider
permits gambling-related transactions; verify current terms and written approval.
```

## 7.6 Security skill — `.cursor/skills/security-audit/SKILL.md`

```markdown
---
name: security-audit
description: Audit authentication, authorization, APIs, financial flows, secrets, integrations, infrastructure.
---

Review current OWASP guidance: authentication, sessions, authorization, IDOR,
privilege escalation, injection, XSS, CSRF, SSRF, file handling, rate limits,
secrets, logs, webhook replay, financial/betting races, settlement idempotency,
audit, dependencies, deployment. Report severity, evidence, impact, remediation,
and regression test. Do not claim certification or penetration test without
qualified external assessment.
```

## 7.7 Release skill — `.cursor/skills/release-readiness/SKILL.md`

```markdown
---
name: release-readiness
description: Independently assess a sportsbook release candidate.
---

Review requirements, tests, architecture, security, financial/betting integrity,
responsive UX, integrations, monitoring, backups, runbooks, responsible-gambling,
legal approvals, provider permissions, and data rights. Mark Pass, Conditional,
Fail, or Not Assessed. Cite repository/test evidence. Never infer external
approvals.
```

---

# 8. Reusable Cursor commands

The command feature and exact folder conventions can change. These Markdown templates are useful even if you invoke them by opening or mentioning the file.

**`.cursor/commands/start-session.md`**
```text
Read AGENTS.md, docs/PROJECT_STATUS.md, requirements, and ADRs. Inspect the
working tree. Summarize phase, completed work, blockers, tests, and the single
best next task. Do not edit until I approve.
```

**`.cursor/commands/implement-feature.md`**
```text
Implement [FEATURE]. Inspect code/docs. Restate acceptance criteria, assumptions,
files, risks, and tests. Use Plan mode for substantial work and wait for approval.
Implement incrementally, preserve behavior, test, review diff, update docs and
PROJECT_STATUS. Report exact results and unresolved issues.
```

**`.cursor/commands/review-diff.md`**
```text
Independently review the uncommitted diff for correctness, security, permissions,
financial/betting integrity, races, maintainability, accessibility, and missing
tests. Prioritize findings with exact file references. Do not edit. Recommend
merge or changes.
```

**`.cursor/commands/debug-issue.md`**
```text
Reproduce [BUG], inspect logs/runtime/code, identify root cause and impact,
propose smallest safe fix and regression test. Do not change unrelated files.
After approval, implement, test, and report evidence.
```

**`.cursor/commands/end-session.md`**
```text
Update docs/PROJECT_STATUS.md with date, work completed, files changed, exact
tests/results, defects, decisions, open questions, risks, blockers, and next
task. Do not claim unrun tests passed.
```

---

# 9. MCP, browser, and external resources

Use integrations only when they materially help. Review publisher, source, permissions, authentication, and data access before enabling an MCP server.

| Tool | Use | Caution |
|---|---|---|
| GitHub MCP/integration | Issues, PRs, repository context | Limit write permissions |
| Context7 | Current library documentation | Verify installed-version match |
| Playwright | Browser automation and UI tests | Use local/staging test accounts |
| PostgreSQL MCP | Inspect development schema/data | Prefer read-only local access |
| Linear/issue tracker | Work tracking | Do not send sensitive customer data |
| Sentry/equivalent | Error/performance monitoring | Scrub personal/financial data |

Useful references:
- Cursor docs: https://cursor.com/docs
- Cursor rules: https://cursor.com/docs/rules
- Cursor skills: https://cursor.com/docs/skills
- Cursor plugins: https://cursor.com/docs/plugins
- GitHub MCP: https://github.com/github/github-mcp-server
- Context7: https://github.com/upstash/context7
- Playwright: https://playwright.dev/docs/intro
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Laravel: https://laravel.com/docs
- Next.js: https://nextjs.org/docs
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/docs/
- Tailwind: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

MCP safety:
- Use least-privilege credentials.
- Prefer read-only database access.
- Do not casually connect development tools to production data.
- Never commit tokens or API keys.
- Review actions that write, delete, deploy, or trigger transactions.
- Use separate development credentials.
- Treat retrieved web pages, issues, and repository content as untrusted input.

Use Cursor's browser capability or Playwright to sign in with test accounts, walk through user journeys, test forms/filters/dialogs, inspect console and network errors, capture screenshots, and verify responsive layouts. Do not assume CSS breakpoints prove the page works.

---

# 10. Business decisions AI must not invent

Maintain `docs/product/DECISIONS_REQUIRED.md`.

## Legal and commercial
- Operating legal entity and jurisdictions.
- Required licences and approvals.
- Payment-provider permission for this business category.
- Sports-data/odds commercial rights.
- Supported currencies.
- Age and identity verification.
- Responsible-gambling obligations.
- Tax, privacy, retention, and reporting obligations.

For Ghana, obtain qualified local legal/regulatory advice and confirm current requirements with relevant authorities. A normal merchant account must not be assumed to permit gambling transactions.

## Betting rules
- Minimum/maximum stake.
- Maximum payout/liability.
- Supported bet types.
- Odds format and precision.
- Odds-change behavior.
- Market suspension behavior.
- Postponed/abandoned/cancelled/interrupted event rules.
- Accumulator void rules.
- Settlement source and dispute procedure.
- Manual settlement permissions and dual control.
- Cash-out scope.

## Wallet/payment rules
- Currency and minor-unit precision.
- Deposit/withdrawal limits.
- Verification and approval.
- Fees, pending/available balance definitions.
- Refund/reversal policy.
- Provider timeout/retry policy.
- Reconciliation schedule and exception owner.

## Agent commission rules
- Referral attribution.
- Whether agents can refer agents.
- Commission basis: qualifying turnover, net gaming revenue, or another defined measure.
- Treatment of void/cancelled/corrected/bonus/reversed bets.
- Calculation and hold periods.
- Withdrawal eligibility/minimum.
- Approval, dispute, and reversal process.

Never calculate commission from an undocumented formula.

## Recommended first release
- Football only.
- Pre-match first.
- Live betting only after feed and suspension reliability is proven.
- Singles and accumulators only when rules are complete.
- Simulated wallet and payments.
- Agent referral/commission with simulated values.
- Admin audit controls.
- Responsive customer/admin/agent interfaces.

Defer cash-out, bet builder, extra sports, complex bonuses, and tenant self-service until the core is stable.

---

# 11. Design system and responsive UX

The goal is a premium original product, not a clone of SportyBet, M-Sport, or any operator.

## Competitor research
Study navigation, fixture grouping, market/odds selection, bet slip, mobile behavior, live event display, wallet entry points, registration, promotions, responsible-gambling visibility, and loading/error states. Record conventions and opportunities; do not copy logos, text, assets, or exact layouts.

## Customer
Deep navy/charcoal base; restrained lime accent; clear event/odds hierarchy; compact readable fixture rows; distinct selected/suspended/unavailable odds states; accessible bet slip; minimal clutter.

## Admin
Graphite/neutral surfaces; restrained indigo/purple accent; clear operational hierarchy; readable dense tables; filters/search/pagination; visible timestamps/statuses; reason capture and confirmation for high-risk actions.

## Agent
Simple dashboard; clear referral link; transparent earnings/status; easy withdrawal request and history.

## Responsive test widths
- 360 × 800
- 390 × 844
- 768 × 1024
- 1024 × 768
- 1440 × 900

Inspect horizontal overflow, touch targets, text wrapping, navigation, bet-slip accessibility, table alternatives, dialog sizing, focus, loading shifts, odds changes, market suspension, and form feedback.

Create shared tokens for semantic colors, typography, spacing, radius, borders, shadows, focus rings, z-index, breakpoints, and motion. Do not hardcode inconsistent variants across apps.

---

# 12. Sequential development prompt library

Save each prompt under `docs/prompts/`. Use Ask for discovery, Plan for substantial work, Agent only after approving the plan. Each prompt must inspect the existing project and preserve working code.

## PROMPT 00 — Existing project discovery

```text
You are principal architect and engineering lead for this mobile-first sportsbook:
Customer Sportsbook, Super Admin, Agent Portal. Approved starting stack:
Laravel, PostgreSQL, Redis, Next.js, React, TypeScript, Tailwind, shadcn/ui,
Reverb where appropriate, Docker, automated tests.

Read AGENTS.md and docs/CURSOR_AI_ENGINEERING_PLAYBOOK.md.

Inspect the actual repository: stack, folders, entry points, dependencies,
database schema/migrations, tests, UI tokens, integrations, unfinished work,
Git branch and uncommitted changes. Do not overwrite or scaffold over existing
working code.

Produce:
1. Current codebase assessment.
2. Implemented/partial/missing feature map.
3. Architecture assessment.
4. Requirements inventory.
5. Security, finance, and betting risk register.
6. Decisions requiring my input.
7. Phased roadmap and next milestone acceptance criteria.

Do not make broad changes. Do not invent rules, provider capabilities, approvals,
or traction. Use read-only investigation and wait for approval.
```

## PROMPT 01 — Competitor and UX research

```text
Act as a senior sportsbook product researcher. Research publicly accessible
SportyBet and M-Sport experiences where available. Do not copy branding, assets,
text, or exact layouts. Study navigation, fixture presentation, odds/markets,
bet slip, mobile behavior, live events, wallet, registration, promotions, and
responsible-gambling visibility. Produce an observation matrix, conventions,
friction points, differentiated design direction, customer journeys, component
inventory, and mobile layout descriptions. Separate observations from
recommendations. Do not implement.
```

## PROMPT 02 — Architecture

```text
Define architecture using approved requirements and the real repository.
Preserve the stack unless proposing a justified ADR. Cover monorepo/app
boundaries, Laravel modular monolith, modules, PostgreSQL ownership and
transactions, Redis/queues, API contracts, auth/RBAC, agent scope, sports and
payment adapters, betting/settlement, double-entry ledger, realtime, audit,
observability, tenant readiness if approved, environments, backup/restore.
Produce diagrams, module matrix, data flows, threat model, ADRs, and unknowns.
Do not implement yet.
```

## PROMPT 03 — PRD and backlog

```text
Convert approved scope into a PRD/backlog. For each module document objective,
roles, stories, functional requirements, business rules, permissions,
validation/error cases, acceptance criteria, dependencies, out-of-scope items,
and test scenarios. Cover customer, admin, agent, sports, odds, betting,
wallet, ledger, payments, settlement, commissions, promotions, notifications,
reports, audit, and responsible gambling. Do not invent unresolved rules.
Save under docs/product/.
```

## PROMPT 04 — Database design

```text
Design PostgreSQL schema for users, roles, permissions, agents/referrals,
sports, competitions, teams, fixtures, markets, selections, odds history,
bets/snapshots, settlements, wallets, ledger accounts/journals, deposits,
withdrawals, payment attempts/webhooks, promotions, audit, and tenant config
if approved. Specify columns/types, keys, constraints, indexes, status
lifecycles, privacy, retention. Focus on money precision, odds precision,
provider IDs, idempotency, immutable history, concurrency, event versioning.
Produce ER diagram, migration sequence, tests. Do not run migrations until I
approve.
```

## PROMPT 05 — Design system

```text
Create/refine a shared design system. Customer: deep navy/charcoal with
restrained lime. Admin: neutral graphite with controlled indigo/purple. Agent:
simple and focused. Premium, original, mobile-first, accessible. Avoid generic
AI dashboards, gradients, clutter, unnecessary cards. Define tokens, typography,
spacing, buttons, forms, odds states, badges, tables, filters, navigation,
dialogs, drawers, toasts, skeletons, empty/error states, focus, breakpoints.
Inspect existing styles; do not redesign unrelated pages.
```

## PROMPT 06 — Responsive prototypes

```text
Build/refine high-fidelity prototypes for customer, admin, and agent portals.
Customer: homepage, sports lobby, fixtures, event detail, markets, bet slip,
auth, wallet, bet history, profile, responsible-gambling. Admin: overview,
customers, agents, roles, sports/fixtures, markets/odds, bets/settlement,
wallet/ledger, deposits/withdrawals, commissions, promotions, integrations,
reports, audit, settings. Agent: overview, referral, referred customers,
statements, withdrawal, profile. Use labelled mock data. Test 360/390/768/
1024/1440 in browser. Fix observed issues. No real backend authority in UI.
```

## PROMPT 07 — Backend foundation

```text
Inspect before changing. Implement approved Laravel foundation: PostgreSQL,
Redis, API versioning, validation/errors, authentication, role/permission
foundation, policies/resource ownership, audit foundation, queues/scheduler,
health checks, structured logs, test setup, Docker if approved. Do not create
unapproved modules or use production secrets. Add auth/authorization/validation
tests. Present plan first; after approval implement and report exact tests.
```

## PROMPT 08 — Identity and access

```text
Implement secure registration/login/logout, password reset, session/token
invalidation, account status/verification foundation, roles, permissions,
policies, middleware, admin 2FA foundation, rate limits, audit events.
Customers access only their own resources. Agents only their own profile,
referrals, commissions, withdrawals. Agents cannot access customer admin,
odds, fixtures, settlement, payment settings, or other agents. Admin permissions
are explicit. Add negative tests for IDOR, cross-agent access, privilege
escalation, unauthorized endpoints. Never rely on hidden frontend menus.
```

## PROMPT 09 — Sports and fixtures

```text
Implement sports catalogue and fixtures using deterministic mock provider.
Start with football; design extensible sport adapters. Support competitions,
seasons, teams, events, timezone, status, provider IDs, source/ingestion
timestamps, publication state. Separate provider ingestion from internal
records. Handle duplicate, delayed, missing, corrected, out-of-order updates.
Keep provider state distinct from platform publication. Add authorized
publish/suspend controls and mapping/status/time tests. No live provider yet.
```

## PROMPT 10 — Markets and odds

```text
Implement market templates/instances, selections, decimal odds with defined
precision, odds history/versioning, source distinction, open/suspended/closed
states, event/market suspension, admin permissions, timestamps, stale-data
handling. Define customer behavior when odds change after selection; do not
assume acceptance. Audit manual changes. Test version changes, suspension,
stale/invalid prices, unauthorized edits.
```

## PROMPT 11 — Betting engine

```text
Implement first betting engine with mock events and simulated funds. Scope:
singles and accumulators only if rules are approved. Include add/remove,
duplicate/incompatible selections, stake validation, potential return,
limits, placement, receipt, history, status. Backend revalidates every
selection, event, market, odds, account, stake, and limit. Snapshot accepted
odds/state. Implement odds-change confirmation. Idempotency prevents duplicates.
Bet creation and stake reservation/debit are atomic and concurrency-safe.
Do not implement cash-out. Test success, insufficient funds, suspended/closed,
changed odds, invalid stake, duplicate, concurrency, restricted account,
rollback.
```

## PROMPT 12 — Wallet and ledger

```text
High-risk financial module. Implement wallets and double-entry ledger with
simulated funds: accounts, journal entries/lines, available/reserved/pending
balances, deposits, withdrawals, stake reservation/debit, winnings, refunds,
reversals, commissions, transaction history. Use integer minor units or exact
decimals, never float. Every journal balances. Atomic/concurrency-safe updates.
Idempotency. Never edit posted entries; compensate/reverse. Audit and reconcile.
Document debit/credit examples. Test duplicates, concurrency, insufficient
funds, reversals, rollback. No live payments.
```

## PROMPT 13 — Payment adapters

```text
Implement provider adapter contract, simulated provider, sandbox configuration,
deposit/withdrawal state tracking, webhook endpoint, signature verification,
idempotency, replay protection, provider references, retries/timeouts,
reconciliation. Do not assume Paystack or another gateway permits gambling
transactions; verify current terms and written approval. Browser redirect is
not proof of payment. Test signatures, duplicates, out-of-order callbacks,
timeouts, failures, reversals. Sandbox only.
```

## PROMPT 14 — Settlement

```text
Implement only explicitly approved settlement rules: event/market status,
selection results, single/accumulator outcomes, void/refund, settlement batch,
audit, idempotency, authorized corrections, ledger posting/reconciliation.
Do not invent postponed/abandoned/cancelled/interrupted rules. Test win, loss,
void, supported partial outcomes, accumulator void, duplicate settlement,
correction/reversal, concurrency, ledger failure. Re-running must never pay
twice.
```

## PROMPT 15 — Super Admin

```text
Build admin against approved APIs: overview, customers, agents, roles,
sports/competitions/teams/fixtures, markets/odds, bet monitoring, settlement,
wallet/ledger, deposits/withdrawals, commissions, promotions, integrations,
reports, audit, responsible-gambling, settings. Premium neutral operational
UI, graphite with controlled indigo/purple. Server-side pagination/search/
filters. Confirm high-risk actions and capture reasons. Enforce backend
permissions. Never expose secrets. Test permissions and workflows.
```

## PROMPT 16 — Agent portal

```text
Build agent overview, referral link/code, copy/share, referred customers,
attribution, commission summary/history/statements, eligible withdrawal
balance, withdrawal request/status/history, profile/security. Simple and
mobile-first. Every endpoint scopes to authenticated agent. Altering IDs or
query parameters must not expose other agents. No wallet admin, odds, matches,
settlement, payment settings. Commission is backend-calculated. Test cross-
agent access and validation.
```

## PROMPT 17 — Customer integration

```text
Connect customer app to API: auth, sports/competitions, fixtures, event detail,
markets/odds, selection state, bet slip, stake, server-authoritative placement,
receipt/history, wallet/transactions, simulated deposit/withdrawal, profile,
responsible-gambling. Use typed contracts. Handle loading/empty/error/offline/
stale states. Show changed odds/suspensions. Never show accepted until server
confirms. Wallet balance is not authoritative in browser. Test full journey.
```

## PROMPT 18 — Commission engine

```text
Read decisions register first. If commission basis, period, exclusions,
reversals, attribution unresolved, stop and ask. Once approved implement
attribution, eligibility, backend calculations, source references, period,
pending/approved/available/paid/reversed/disputed states, statements, ledger
linkage, authorized adjustments, withdrawal workflow. Test void/cancelled/
corrected bets, duplicates, late settlement, attribution conflict, reversal.
```

## PROMPT 19 — Realtime and notifications

```text
Implement authenticated realtime events for fixture/status/score, market
suspension, odds version, bet accepted/rejected/settled, deposit/withdrawal,
account security. Never broadcast private wallet/personal data. Include event
IDs/timestamps. Handle reconnect, stale state, duplicates, retries, polling
fallback. Backend remains authoritative. Test authorization and reconnects.
```

## PROMPT 20 — Promotions and referrals

```text
Implement approved banners, welcome offers, referral campaigns, odds boosts,
share codes, tracking, eligibility, usage limits, terms, admin controls. Before
bonuses define eligibility, funding, expiry, qualifying conditions, liability,
abuse prevention, cancellation/reversal, customer disclosures. Do not silently
change wallet accounting or create misleading claims. Keep accounting auditable.
```

## PROMPT 21 — White-label readiness

```text
Review future tenant needs: tenant identity, brand, theme, domains, content,
configuration, provider settings, tenant-scoped users/bets/wallets/reports.
Do not implement without approval. If approved define isolation, query scope,
policies, domain resolution, caching, audit/reporting, migrations, operations.
Test cross-tenant access. Branding is not isolation.
```

## PROMPT 22 — SEO and public content

```text
Implement approved titles/descriptions, canonical URLs, Open Graph, sitemap,
robots policy, accurate structured data, public content, event URL strategy,
performance, approved shareable slip landing. Never expose private account or
bet information to search engines. Document indexing exclusions.
```

## PROMPT 23 — Observability

```text
Prepare development/staging logs, correlation IDs, queue monitoring, failed
job retries, sports sync health, webhook health, reconciliation exceptions,
database/backup health, realtime health, error reporting, audit events, alerts.
Never log secrets or unnecessary personal/financial data. Write operations
runbook for failures and recovery.
```

## PROMPT 24 — QA

```text
Act as independent QA. Test auth, roles, agent scope, fixtures, odds, bet slip,
stake, changed/suspended markets, duplicate/concurrent bets, ledger consistency,
simulated payments, webhook signature/idempotency, settlement, commissions,
audit, responsive widths, keyboard/accessibility, loading/empty/error/offline.
Use unit/API/integration/browser tests. Return coverage, passes, failures,
severity, reproduction, fixes, and untested areas. Do not claim production ready.
```

## PROMPT 25 — Security audit

```text
Independently review code/config/APIs against current OWASP guidance and
relevant ASVS controls: auth, authorization, IDOR, privilege escalation,
agent isolation, injection, XSS, CSRF, SSRF, file handling, rate limits,
secrets/logs, webhook authenticity/replay, financial/betting races, settlement,
audit, dependencies, deployment. For each finding give severity, evidence,
impact, remediation, regression test. Do not destructively modify. Distinguish
code review from external penetration test. Do not claim certification.
```

## PROMPT 26 — Performance and reliability

```text
Assess API latency, DB queries/indexes, N+1, queues, realtime volume, cache
correctness, frontend bundle, mobile rendering, pagination, provider outages,
connections, backups/restore. Create load-test plan. Do not invent traffic
targets; ask for concurrent users, bet volume, event volume, service objectives.
Test only safe environments. Report evidence and bottlenecks.
```

## PROMPT 27 — Documentation and handover

```text
Update README, local setup, env reference, architecture, modules, ER diagram,
API docs, sports/payment adapter guides, ledger/reconciliation, betting/
settlement rules, role matrix, test commands, deployment, backup/restore,
operations runbook, security, compliance decisions, known limitations,
PROJECT_STATUS. Do not claim features complete without implementation/test
evidence. Label mock, sandbox, incomplete, and production components.
```

## PROMPT 28 — Release readiness

```text
Act as independent release-readiness board. Do not implement new features.
Assess scope, architecture, customer UX, admin, agent permissions, auth,
betting, settlement, ledger, payment security, sports-data rights/reliability,
responsible gambling, legal approvals, privacy, security testing, performance,
monitoring, incident response, backup/recovery, documentation. Mark Pass,
Conditional, Fail, Not Assessed. State evidence needed for each gap. Never
declare real-money readiness without independently confirmed licences,
provider approvals, data rights, compliance, security, and operational controls.
Return go/no-go and prioritized remediation.
```

---

# 13. Daily prompts

**New session**
```text
Read AGENTS.md, PROJECT_STATUS, requirements, and ADRs. Inspect actual code and
Git state. Reconstruct project state from files, identify documentation/code
mismatches, summarize progress and blockers, recommend one next task. Do not edit.
```

**Feature**
```text
Implement [FEATURE]. Inspect code/docs; restate acceptance criteria, assumptions,
files, risks, tests. Plan substantial work and wait for approval. Implement
incrementally, test, review diff, update docs/status, report exact results.
```

**Debug**
```text
Reproduce [BUG], inspect logs/runtime/code, identify root cause and impact,
propose smallest safe fix and regression test. Do not touch unrelated files.
After approval, implement, test, report evidence.
```

**Code review**
```text
Independently review current diff for correctness, security, authorization,
financial/betting integrity, races, maintainability, accessibility, missing
tests. Prioritize findings with exact references. Do not edit. Recommend merge
or changes.
```

**End session**
```text
Update PROJECT_STATUS with date, work, files, exact tests/results, defects,
decisions, open questions, risks, blockers, next task. Do not claim unrun tests.
```

---

# 14. Testing and non-negotiable invariants

## Ledger
- Debits equal credits for every posted journal.
- Posted journals cannot be silently edited.
- Duplicate callbacks cannot create duplicate credits.
- Available balance cannot go negative unless an approved rule explicitly permits it.
- Displayed balances reconcile with journal totals.
- Reversals reference original transaction and reason.

## Betting
- No bet on suspended/closed market.
- No invalid/stale odds acceptance.
- One idempotency key cannot create multiple bets.
- Bet and stake reservation succeed/fail together.
- Repeated settlement cannot pay twice.
- Accepted odds snapshot is retained.
- Manual overrides/corrections are audited.

## Authorization
- Customer A cannot access Customer B's account/wallet/bets.
- Agent A cannot access Agent B's referrals/commissions.
- Agent cannot invoke admin routes.
- Customer cannot invoke agent/admin routes.
- Admin actions require permission and audit.
- Test direct API calls, not just UI navigation.

## Browser
Test 360, 390, 768, 1024, 1440 widths. Inspect overflow, touch targets,
wrapping, navigation, bet slip, tables, dialogs, focus, loading/empty/error,
odds changes, suspension, and form feedback.

---

# 15. Security, compliance, responsible operation

A functioning application is not automatically lawful or safe. Before real-money launch obtain qualified review of:
- Gambling licensing and jurisdiction.
- Age and identity verification.
- AML/suspicious activity controls where applicable.
- Payment-provider permission for the business category.
- Sports-data and odds licensing.
- Customer funds handling and reconciliation.
- Responsible-gambling controls, self-exclusion, time-outs, and limits.
- Complaints and disputes.
- Privacy, data retention, advertising, promotions, tax/reporting.
- Security assessment and incident response.

A checkbox or disclaimer is not a substitute for effective controls. Responsible-gambling features belong in product and account flows.

---

# 16. Deployment checklist

Keep local, shared development, staging, and production separate. Use separate databases and credentials. Do not expose production secrets to agents. Require HTTPS, secure cookies, backups, restore tests, queue/scheduler monitoring, error alerts, reviewed migrations, and rollback plans.

- [ ] Required automated tests pass.
- [ ] No unresolved critical/high security findings.
- [ ] Environment variables documented and securely configured.
- [ ] Migrations reviewed.
- [ ] Backup and restore verified.
- [ ] Queue workers/scheduler configured.
- [ ] Logs and alerts configured.
- [ ] Integrations in approved mode.
- [ ] Admin strong authentication/2FA.
- [ ] Responsible-gambling controls tested.
- [ ] Legal/licensing/payment/data-rights approvals documented.
- [ ] Rollback plan and incident ownership defined.

---

# 17. Project status template

Save as `docs/PROJECT_STATUS.md` and update after every session.

```markdown
# Project Status
Last updated: YYYY-MM-DD

## Current phase
[Discovery / Architecture / Design / Backend / Sports / Betting / Finance /
Admin / Agent / Integrations / QA / Staging]

## Overall status
[Not started / In progress / Blocked / Complete]

## Completed
- [Item]

## In progress
- [Item]

## Not started
- [Item]

## Tests
- Command:
- Result:
- Notes:

## Decisions made
- [Decision and date]

## Decisions required
- [Question, options, owner]

## Risks and blockers
- [Risk, severity, mitigation]

## Mock/sandbox components
- [List]

## External approvals required
- [List]

## Next task
[One clear task]
```

---

# 18. Milestones and exit criteria

| Milestone | Outcome | Exit condition |
|---|---|---|
| 0 Discovery | Requirements/decision register | Scope and unknowns documented |
| 1 Architecture | Approved architecture/data model | Review accepted |
| 2 Design | System and prototypes | Three interfaces reviewed |
| 3 Backend | Auth, roles, DB, queues, audit | Tests pass |
| 4 Sports | Mock fixtures, markets, odds | Domain tests pass |
| 5 Betting | Simulated bet placement | Betting invariants pass |
| 6 Finance | Ledger, wallet, simulated payments | Ledger invariants pass |
| 7 Admin | Operational dashboard | Permission tests pass |
| 8 Agent | Referrals/commissions | Isolation tests pass |
| 9 Customer | Customer app API integration | End-to-end passes |
| 10 Integrations | Sandbox adapters | Adapter/webhook tests pass |
| 11 QA/security | Independent reviews | Critical defects closed |
| 12 Staging | Release candidate | Monitoring/restore/runbooks verified |
| 13 Approvals | Legal/provider/data rights | Written approvals confirmed |
| 14 Release | Go/no-go | All release gates satisfied |

Measure progress by tested capabilities and closed acceptance criteria, not
screens generated.

---

# 19. First 14 days

**Day 1:** Open existing repo, Ask-mode inspection, Prompt 00.  
**Day 2:** Prompt 03, requirements and decisions register.  
**Day 3:** Prompt 01, UX research and journeys.  
**Day 4:** Prompt 02, architecture and ADRs.  
**Day 5:** Prompt 04, database design review.  
**Day 6:** Prompt 05, design system approval.  
**Days 7–8:** Prompt 06, prototypes and responsive browser QA.  
**Days 9–10:** Prompts 07–08, backend and access foundation.  
**Days 11–12:** Prompts 09–10, sports domain and odds.  
**Days 13–14:** Review tests/diffs, update status, select next milestone.

This is a guide, not a deadline. Never compress finance or security work to
meet the schedule.

---

# 20. Mistakes to avoid

1. One giant prompt that attempts the whole product.
2. Allowing AI to invent commission, settlement, or payment rules.
3. Scaffolding over an existing application without inspection.
4. Accepting every generated diff without review.
5. Letting frontend code decide money, odds, or settlement.
6. Treating a balance column as a ledger.
7. Treating a payment redirect as proof.
8. Weak agent ownership checks.
9. Over-parallelizing shared financial logic or migrations.
10. Assuming CSS breakpoints prove responsive quality.
11. Missing audit logs.
12. Premature microservices.
13. Premature live integrations.
14. Copying competitor identity or assets.
15. Treating a green build as production approval.

---

# 21. Official documentation and resources

Use current official docs as the source of truth; product features and APIs change.

**Cursor**
- Main docs: https://cursor.com/docs
- Agent: https://cursor.com/docs/agent
- Rules: https://cursor.com/docs/rules
- Skills: https://cursor.com/docs/skills
- Plugins: https://cursor.com/docs/plugins
- Browser: https://cursor.com/docs/agent/tools/browser
- Cloud Agents: https://cursor.com/docs/cloud-agents

**Stack**
- Laravel: https://laravel.com/docs
- Next.js: https://nextjs.org/docs
- React: https://react.dev
- TypeScript: https://www.typescriptlang.org/docs/
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/docs/
- Tailwind: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- Playwright: https://playwright.dev/docs/intro
- Vitest: https://vitest.dev/guide/
- Docker: https://docs.docker.com/

**Security**
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/

**MCP / integrations**
- GitHub MCP: https://github.com/github/github-mcp-server
- Context7: https://github.com/upstash/context7
- Playwright MCP: https://github.com/microsoft/playwright-mcp

Verify provider documentation and contracts for sports data and payment
integrations. Do not rely on old blog posts or AI memory for regulated or
provider-specific decisions.

---

# 22. Immediate next steps

1. Open your existing sportsbook repository in Cursor.
2. Create a clean Git checkpoint or branch.
3. Save this document as `docs/CURSOR_AI_ENGINEERING_PLAYBOOK.md`.
4. Create/update root `AGENTS.md` using Section 5.
5. Create `.cursor/rules/*.mdc` from Section 6.
6. Use Ask mode and run Prompt 00.
7. Compare the existing implementation against the target plan.
8. Approve the next milestone only after reviewing scope and risks.

**Do not rebuild working modules just because they appear in this playbook.**
Map existing work to the target architecture and close gaps incrementally.

## Governing principle

**Specify deliberately. Preserve what works. Architect clearly. Build incrementally. Test independently. Review consequential changes. Launch only when legally and operationally approved.**
