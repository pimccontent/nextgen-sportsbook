# Sandbox → live go-live path

**Rule:** No real-money operation until licensing, regulatory, data-rights,
payment-provider, security, and responsible-gambling requirements are
independently reviewed and approved. Flipping Admin Settings alone does **not**
enable live money today.

## What “sandbox” means here

| Layer | Sandbox today | “Live” meaning |
|---|---|---|
| Sports catalogue | Mock / TheSportsDB / football-data.org | Real fixtures feed (already selectable) |
| Payments | Mock deposit + Paystack adapter without live HTTP | Real Paystack initialize + webhook credit |
| Withdrawals | Admin approve → sandbox paid | Real payout API + reconciliation |
| Compliance copy | “Sandbox demo — not a licensed operator” | Licensed operator text |
| Admin chrome | Status pill reflects payments mode | Does **not** certify legal go-live |

## Already configurable (Admin Settings)

1. **Payments** — provider, mode (`test` \| `live`), public key, callback/webhook URLs, secret keys.
2. **Compliance** — jurisdiction, licence label, RG footer/message.
3. **Wallet / betting** — limits (must be filled with licensed numbers before money live).
4. **Sports data** — provider + API key (fixture sync ≠ money live).

Env hint: `PAYMENTS_MODE` in API `config/services.php` (envelope meta). Tenant
settings `payments.mode` is the operator-facing source of truth for the admin
status pill.

## Still hard-sandbox in code (engineering gate)

- Customer deposits complete via **mock** (`completeMockDeposit`).
- `PaystackAdapter` does not yet call Paystack HTTP initialize/verify.
- Withdrawals can be marked paid without a provider payout API.
- No production reconciliation jobs.

These require an explicit product/engineering go-ahead — separate build.

## Operator checklist (when actually ready)

1. **External approvals** — Ghana licence text, RG controls, tax/reporting,
   approved payment category, data rights for live odds/scores.
2. **Admin Settings**
   - Payments: mode `live`, live keys, production callback/webhook URLs.
   - Compliance: real licence label (replace sandbox demo text).
   - Wallet/betting limits set to licensed values.
3. **Infrastructure** — production Postgres/Redis, HTTPS, secrets out of git,
   webhook reachable by Paystack, admin 2FA / rate limits.
4. **Engineering** — real Paystack path; disable mock deposit in live mode;
   payout API; reconciliation; status pill already reflects `payments.mode`.
5. **Smoke** — Paystack **test** keys end-to-end first; live keys only after
   legal sign-off.

## Recommended order

```
licence + RG sign-off
  → Paystack test keys + real HTTP (still test mode)
  → production infra + webhooks
  → payments.mode = live + live keys
  → disable mock deposit/payout paths
```
