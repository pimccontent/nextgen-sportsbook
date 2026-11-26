# Project Status

Last updated: 2026-11-26 (path-layout VPS deploy + Domain & deploy admin panel)

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
- **Path-layout VPS URLs:** Customer `/` + Agent `/agent` + API `/api/v1` on apex; Admin on `admin.`; 2 DNS A records; legacy `URL_LAYOUT=hosts` kept
- **Deploy UX:** `setup-wizard.sh`, DNS check, `update-vps.sh`, optional prebuilt images (`USE_PREBUILT_IMAGES`); Admin → Settings → **Domain & deploy**
- **Customer UX:** no Live environment strip; admin-controlled popup/toast (`Settings → Customer messages`); guest Place bet → login → return with slip open; slip persisted in localStorage
- **Admin theme:** settings/status colors use day/night CSS tokens (no graphite/indigo hardcodes on Settings)
- **Fixtures providers (free):** `mock`, `openligadb` (no key), `thesportsdb` (demo key `123`), optional `football-data.org` free token, **`embedded_world`** (curated obscure worldwide leagues offline + optional TheSportsDB live sync with catalogue fallback) — no paid sports API required
- **Obscure leagues on every sync:** `sync_obscure_leagues` merges embedded worldwide lesser-known leagues even when provider is `thesportsdb` (live when possible, catalogue fallback); admin fixtures table has filter/sort/multi-select bulk publish·suspend·delete/pagination + row quick actions
- **Correct Score** market template (0–0…3–3 + Other), admin add-market, FT settlement via `MarketCatalogService`
- **Manual deposit manager:** Admin → Deposits → sandbox/test manual credit by phone/user id (ledger + audit)
- **Withdrawal history:** customer Wallet history tabs; admin Withdrawals search/filter + customer name/phone
- **Activity feed:** intermittent toast (slides in, leaves after displayMs) with admin position + timing; real anonymized + illustrative items (`GET /public/activity`)
- **In-app live support chat:** admin-controlled (`Settings → Live chat`), dedicated customer `/support` + Admin → Live support inbox, typing indicators, canned replies, assign/close/reopen, sound + browser notifications, unread badges; fast poll (~2s)
- **Modern chat UX:** attachments (images/PDF/docs, 5MB) with **in-chat image preview + lightbox**, emoji picker, Enter-to-send / Shift+Enter newline, pending attach chip
- **Notification bell + drawer:** customer header and admin top bar — live unread counter, drawer list, click opens `/support` (admin deep-links `?id=`)
- **Customer atmosphere:** day = cool zinc paper, night = ink/graphite layered neutrals; amber reserved for CTAs (no accent sky-glow); blocking boot script + cached public config remove theme/brand flash on load
- **Enter-to-send:** admin Live chat toggle (`enter_to_send`); customer composer respects it
- **Branding system colors:** Admin → Branding day/night palettes with color pickers (surfaces, status, atmosphere, chat panel/input/bubbles); applied as CSS vars across customer app
- **Support chat lifecycle:** admin close syncs to customer; closed chats kept in customer history; default “Start new chat”; optional “Reopen this chat” gated by Live chat `allow_customer_reopen`
- **Correct Score custom outcomes:** add custom scores on fixture markets (no default “Other”)
- **Branding media:** Admin upload for logo/favicon/banners → stored on API (`/storage/...`), absolute URLs in public config for Customer/Admin/Agent
- **Registration email required** for Paystack deposits
- **Live deposits:** no sandbox/mock top-up when Live; requires Paystack secret; credit only via signed webhook (or sandbox mock path when sandbox+test)
- **Account page:** theme toggle removed (navbar toggle remains)
- **Admin account + staff permissions:** `users.admin_permissions` JSON modules; Super Admin full access; regular `admin` gated by module flags via `admin.perm` middleware; self `/admin/account` + password; Super-Admin-only `/admin/staff` CRUD; Admin UI `/account`, `/staff`, sidebar/user-menu gating
- Feature tests: `AdminStaffPermissionsTest` (6 passed)

## How to operate
| App | URL | Demo |
|---|---|---|
| Customer | http://localhost:3100 | `0241111111` / `Password1!` · PIN `123456` |
| Admin | http://localhost:3101 | Super: `admin@nextgen.local` / `Password1!` · Limited staff: `staff@nextgen.local` / `Password1!` (dashboard/support/customers/deposits) |
| Agent | http://localhost:3102 | `agent@nextgen.local` / `Password1!` |

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
- Risks for live VPS test: login throttle 429 under heavy probing; first Docker build needs RAM/swap; DNS A records must exist before Let's Encrypt succeeds
- Feature tests `BookingCodeAuthzTest`, `PasswordPinResetTest` still need PHPUnit in image/CI

## Deploy
- **Repo:** https://github.com/pimccontent/nextgen-sportsbook (public)
- **Live VPS (path layout):** see `docs/architecture/VPS_DEPLOY.md` / `URL_MAP.md`
  ```bash
  curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash -s -- --wizard --install-docker
  # or non-interactive:
  curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash -s -- --domain=YOUR_DOMAIN --email=YOU@EMAIL.com --install-docker
  ```
- DNS A records first: `YOUR_DOMAIN`, `admin.YOUR_DOMAIN` → VPS IP (legacy hosts layout also needs `agent.` + `api.`)
- Updates: `bash scripts/update-vps.sh`
- Manual (no GitHub): `production deploy/` / `production-deploy.zip` → `bash install.sh`

## Remaining / next
- PHPUnit in Docker image / CI
- Real payment/SMS providers only after licensing approvals
- Optional: multi-worker API (replace single-threaded `artisan serve`) for many open admin tabs
