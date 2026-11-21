# Project Status

Last updated: 2026-11-21 (pre-VPS review: obscure sync, hero banners, fixtures table)

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
- **Customer UX:** no Live environment strip; admin-controlled popup/toast (`Settings → Customer messages`); guest Place bet → login → return with slip open; slip persisted in localStorage
- **Admin theme:** settings/status colors use day/night CSS tokens (no graphite/indigo hardcodes on Settings)
- **Fixtures providers (free):** `mock`, `openligadb` (no key), `thesportsdb` (demo key `123`), optional `football-data.org` free token, **`embedded_world`** (curated obscure worldwide leagues offline + optional TheSportsDB live sync with catalogue fallback) — no paid sports API required
- **Obscure leagues on every sync:** `sync_obscure_leagues` merges embedded worldwide lesser-known leagues even when provider is `thesportsdb` (live when possible, catalogue fallback); admin fixtures table has filter/sort/select-delete/pagination + row quick actions
- **Branding media:** Admin upload for logo/favicon/banners → stored on API (`/storage/...`), absolute URLs in public config for Customer/Admin/Agent
- **Registration email required** for Paystack deposits
- **Live deposits:** no sandbox/mock top-up when Live; requires Paystack secret; credit only via signed webhook (or sandbox mock path when sandbox+test)
- **Account page:** theme toggle removed (navbar toggle remains)

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
- Admin → Settings → sports provider includes `openligadb` and `embedded_world` (toggle **Live sync obscure leagues** for TheSportsDB)

## Tests (smoke) — 2026-11-16 readiness
- Stack: Docker API + customer:3000 + admin:3001 + agent:3002 → HTTP 200
- API health: api/db/redis OK
- Public config: `messaging.popup/toast` present; Live env does **not** set customer environment banner
- Admin settings includes `customer_messaging`; PUT round-trip enables popup/toast then restored off
- Fixtures catalogue: `GET /api/v1/fixtures` returned 7
- Customer login + wallet OK (cash/bonus/reserved present)
- Risks for live VPS test: login throttle 429 under heavy probing; single-threaded `artisan serve`; first Docker build needs RAM/swap; HTTPS/DNS still operator-owned
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
