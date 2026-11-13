# ADR-002 — White-label operator settings

Status: Accepted  
Date: 2026-11-12  
Supersedes: ADR-001 item “white-label out of scope”

## Context

Product owner directed that former `DECISIONS_REQUIRED` commercial/betting/wallet/
commission answers are owned by **Admin Settings**, and the product is a
**white-label** sportsbook (branding, colors, logos, Paystack keys configurable
per operator install).

## Decision

- **Model:** one brand per deployment. No multi-brand SaaS, no tenant switcher,
  no subdomain routing. A single `tenants`/`settings` row stores this install’s
  white-label configuration so each customer deployment can be set up differently.
- Business rules (stakes, fees, bet types, commissions, RG copy) live in
  settings, not hard-coded in application code.
- Payment provider default: **Paystack** (test/sandbox until live approval).
- Secrets (Paystack secret, webhook secret) are encrypted, write-only via API
  (masked status only on read).
- Customer UI loads public branding/config from `GET /api/v1/public/config`.
- Mock/sandbox money remains mandatory until licensing and provider category
  approval are independently confirmed.

## Consequences

- Betting/wallet/commission engines must read settings at runtime.
- Admin Settings is the operator setup surface for a new white-label install.
- External blockers only: Ghana licence type/timeline, payment-category approval,
  live Paystack mode.
