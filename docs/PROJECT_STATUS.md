# Project Status

Last updated: 2026-11-13

## Current phase
Agent deposit commissions · agent profile/payouts · admin deposits · security hardening

## Overall status
In progress — single-brand white-label sportsbook; sandbox money only

## Completed this pass
- **Deposit commissions** (alongside bet commissions): `payment_intents.commissionable`, settings for enable bet/deposit + default Yes/No; accrue on complete; admin toggle voids/accrues
- **Admin Deposits** page + Settings → Commissions toggles; icon-only `TableActions`
- **Referral:** customer `/register?ref=CODE`; agent overview copyable referral link + code
- **Agent overview:** responsive balance/activity grids; lifetime earned, pending withdrawals, deposits, recent customers/commissions
- **Agent profile / commissions:** payout + withdrawal UX on Commissions; MoMo network select; GHS-facing errors
- **Security:** mock deposit ownership check; tenant-scoped withdrawals/deposits; throttle on withdraw approve/reject + commission toggle; banner `cta_url` as URL

## How to operate
| App | URL | Demo |
|---|---|---|
| Customer | http://localhost:3000 | `0241111111` / `Password1!` |
| Admin | http://localhost:3001 | `admin@nextgen.local` / `Password1!` |
| Agent | http://localhost:3002 | `agent@nextgen.local` / `Password1!` |

- Admin → Settings → Commissions (enable sources + default commissionable)
- Admin → Deposits → Yes/No commission icons
- Agent → Overview (stats) → Commissions (withdraw) → Profile (payout account)

## Tests (smoke)
- `pnpm --filter @nextgen/customer typecheck` — pass
- `pnpm --filter @nextgen/admin typecheck` — pass
- `pnpm --filter @nextgen/agent typecheck` — pass
- Migration `2026_11_13_140000_extend_commissions_for_deposits` — applied
- Routes: `/admin/deposits`, `/agent/profile|password|payouts` — registered

## Remaining / next
- Admin approve queue for agent payouts (sandbox creates pending payouts)
- Restore commissions on payout reject (currently note-only)
- Logo upload / KYC path for customer withdrawals
- Reverb websockets
