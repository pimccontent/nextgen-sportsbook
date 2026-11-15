# Project Status

Last updated: 2026-11-15 (production deploy package)

## Current phase
Platform control expansion (match scripts, booking codes, competitions/feeds, bonus wallet, PIN reset, legal)

## Overall status
In progress — single-brand white-label sportsbook; sandbox/test money only until independently licensed

## Completed this pass
- **Full match scripts:** per-half durations, HT/FT/ET scores, penalties outcome, arm → auto-start at kickoff ([MatchScriptService](apps/api/app/Services/MatchScriptService.php), admin fixture script UI)
- **Fixture edit UX simplified:** schedule → duration preset + FT score → **Save & arm**; advanced/manual live collapsed
- **Booking codes:** admin/agent open customer slip builder (`?booking_builder=1#op=…`) → Save for code; public list/load; customer lobby **Betting codes** + slip Load; agent UI on Commissions (not bottom nav)
- **Competitions CRUD** + fixture competition dropdown; **OpenLigaDB** provider + richer mock leagues
- **Bonus wallet:** `bonus_minor` segregated; % or fixed GHS awards; `max_bonus_stake_minor`; cash-only withdrawals; winnings to cash
- **Promotions settings UI:** deposit/win bonus mode (percent|fixed), fixed amounts, max bonus stake
- **Agent payouts admin queue:** approve / reject restores commissions (`agent_payout_id` link)
- **Security PIN** password reset (no SMTP/SMS); customer sandbox copy reduced; expanded legal defaults
- Migrations: `2026_11_13_160000` … `200000` applied
- **Operations settings:** sandbox ↔ live (confirm `LIVE`) + maintenance mode; Customer/Agent banners & full-page maintenance; branded `error` / `not-found` / `global-error` pages; API `RejectDuringMaintenance` middleware
- **Production deploy package:** `production deploy/` (+ `production-deploy.zip`) for manual VPS install without GitHub; `bash install.sh`; regenerate via `scripts/pack-production-deploy.ps1`

## How to operate
| App | URL | Demo |
|---|---|---|
| Customer | http://localhost:3000 | `0241111111` / `Password1!` · PIN `123456` |
| Admin | http://localhost:3001 | `admin@nextgen.local` / `Password1!` |
| Agent | http://localhost:3002 | `agent@nextgen.local` / `Password1!` |

- Admin → Fixtures → script (durations/ET/PEN) → Arm
- Admin → Booking codes (opens customer builder) / Competitions / Agents (enable booking codes)
- Agent → Commissions → Booking codes (when flagged)
- Customer → Betting codes / Load code → place real stake
- Admin → Settings → sports provider includes `openligadb`

## Tests (smoke) — 2026-11-15 deep review
- Stack: Docker API + customer:3000 + admin:3001 + agent:3002 running
- API: health/db/redis OK; admin/customer/agent login OK
- Match scripts: timed goals → derived FT/HT (e.g. 2-1 / 1-1); score-only auto-goals OK
- Booking codes: admin create + public load OK (`MPOJRVHJ`); agent flag enabled for demos
- Wallet shows cash + bonus; promotions payload has mode + max_bonus_stake
- Agent payouts admin endpoint OK (0 pending)
- UI: admin fixture edit shows schedule → timed goals → Save & arm; customer lobby loads published fixtures
- Risks: login throttle 429 under heavy testing; single-threaded `artisan serve`; unpublished fixtures invisible to customers; Docker Desktop can drop
- Feature tests `BookingCodeAuthzTest`, `PasswordPinResetTest` still need PHPUnit in image/CI

## Deploy
- **GitHub one-liner:** `git clone https://github.com/pimccontent/nextgen-sportsbook.git && cd nextgen-sportsbook && bash scripts/install-vps.sh`
- Manual (no GitHub): `production deploy/` / `production-deploy.zip` → `bash install.sh`
- Templates: `infrastructure/production-deploy/` · packer: `scripts/pack-production-deploy.ps1`

## Remaining / next
- PHPUnit in Docker image / CI
- Real payment/SMS providers only after licensing approvals
- Optional: multi-worker API (replace single-threaded `artisan serve`) for many open admin tabs
- Optional: HTTPS (Caddy/Nginx) in front of VPS ports
