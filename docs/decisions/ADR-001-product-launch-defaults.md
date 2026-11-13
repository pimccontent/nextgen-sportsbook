# ADR-001 — Product launch defaults (from DECISIONS_REQUIRED)

Status: Accepted for catalogue / mock domains  
Date: 2026-11-12  
Source: Product owner checkmarks in `docs/product/DECISIONS_REQUIRED.md`

## Context

The product owner marked many decision items as resolved. Most checkmarks
confirm *topic closed* against the parenthetical recommendation in the
checklist; they do **not** yet supply numeric limits or full policy text.
Betting engine, ledger, payments, and commissions must not invent those
missing numbers.

## Decisions locked for build

| Topic | Decision |
|---|---|
| Launch currency | GHS |
| Money precision | Integer minor units (pesewas) when wallet/ledger starts |
| Odds format | Decimal |
| Launch sport | Football only |
| Live betting | Pre-match first; live UI may show mock scores but betting engine stays pre-match until feed reliability is proven |
| Cash-out | Out of first release (default no; item still unchecked for final sign-off) |
| Promotions / virtuals / casino | Out of first-release engine scope |
| White-label | **In scope** — see ADR-002 (admin-owned branding + rules) |
| Age / identity | Required (exact KYC flow TBD with licence) |

## Still open (block betting / finance / commissions)

- Exact Ghana licence type and timeline
- Payment providers approved for this category
- Mandatory RG controls and tax/reporting/retention detail
- Numeric min/max stake, max payout/liability
- Singles vs singles+accumulators (topic checked — **choice value not written**)
- Odds-change policy choice (reject / offer / re-confirm)
- Suspension / void / accumulator-void rule text
- Settlement source and dispute process
- Deposit/withdrawal limits, fees, approval thresholds
- Agent attribution model, commission basis, exclusions, period/hold

## Consequences

- Sports catalogue proceeds with football + mock provider.
- Markets/odds may use decimal mock prices with open/suspended/closed.
- Bet placement, wallet, payments, and commissions stay blocked until values above are written into this register.
