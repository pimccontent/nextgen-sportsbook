# Decisions Required

Last updated: 2026-11-12

## Operator-configurable (Admin Settings)

These are **not** hard-coded product decisions. Operators configure them in
**Super Admin → Settings** (persisted per tenant). Seeded sandbox defaults exist
so local demos work; change them for each white-label install.

| Area | Configured in |
|---|---|
| Brand name, logos, customer colors/fonts | Settings → Branding |
| Currency, odds format, age minimum | Settings → Locale |
| Min/max stake, max payout, bet types, odds-change, void/suspend | Settings → Betting |
| Deposit/withdraw limits, fees, approval policy | Settings → Wallet |
| Agent attribution, basis, exclusions, period/hold | Settings → Commissions |
| Paystack public key, mode, callback URLs | Settings → Payments |
| Paystack secret / webhook secret | Settings → Payments (write-only secrets) |
| RG messaging, licence label text | Settings → Compliance |

See `docs/decisions/ADR-002-white-label-admin-settings.md`.

## External blockers (cannot be “settings”)

These require real-world approval outside the app. Do not enable live money until resolved.

- [ ] Exact Ghana licence type and application timeline
- [ ] Written confirmation that Paystack (or other PSP) permits this business category
- [ ] Live Paystack mode approval (keep `payments.mode = test` until then)
- [ ] Tax, reporting, and retention obligations for the licensed entity
- [ ] Mandatory responsible-gambling controls required by the licence (beyond configurable copy)

## Launch defaults (seed)

- Football catalogue; pre-match betting first
- Decimal odds; GHS pesewas (integer minor units)
- Cash-out off; promotions / casino / virtuals not in engine scope
- White-label branding **in scope**
