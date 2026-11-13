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
- Customer: neutral day/night surfaces with golden orange (`#F5A524`) accents for CTAs/links.
- Admin: graphite/neutral with controlled indigo; no generic gradients.
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
