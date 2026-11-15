# Cheap VPS — single installation (one command)

This is the supported way to run the full stack on **one Linux VPS** (2 GB RAM
minimum; 4 GB recommended for first image builds).

Not for classic shared hosting (cPanel PHP-only).

## Prerequisites

- Ubuntu 22.04/24.04 (or similar)
- Root or sudo
- Docker Engine + Compose v2

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # then re-login
```

## One command (from GitHub)

```bash
git clone https://github.com/pimccontent/nextgen-sportsbook.git && cd nextgen-sportsbook && bash scripts/install-vps.sh
```

With Docker install:

```bash
INSTALL_DOCKER=1 bash scripts/install-vps.sh
```

Already cloned — from the repo root:

```bash
bash scripts/vps-up.sh
```

First run:

1. Creates `.env.vps` from `infrastructure/env.vps.example` (fills `HOST` when possible)
2. Builds API + Customer + Admin + Agent images
3. Starts Postgres, Redis, and all apps

### URLs (default ports)

| App | URL |
|---|---|
| Customer | `http://YOUR_IP:3000` |
| Admin | `http://YOUR_IP:3001` |
| Agent | `http://YOUR_IP:3002` |
| API health | `http://YOUR_IP:8081/api/v1/health` |

Demo logins: see `docs/PROJECT_STATUS.md` / `docs/architecture/DEMO_ACCOUNTS.md`.

## Configure before / after first boot

Edit `.env.vps`:

- `POSTGRES_PASSWORD` — strong secret
- `HOST` — public IP or domain
- `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_CUSTOMER_ORIGIN` — must match what **browsers** use

If you change `NEXT_PUBLIC_*`, rebuild frontends:

```bash
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env.vps up -d --build customer admin agent
```

## Useful commands

```bash
# Status
docker compose -f infrastructure/docker-compose.vps.yml ps

# Logs
docker compose -f infrastructure/docker-compose.vps.yml logs -f api

# Stop
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env.vps down
```

## HTTPS (recommended next step)

Point DNS A records at the VPS, then put **Caddy** or **Nginx** on ports 80/443
proxying to `3000` / `3001` / `3002` / `8081`, and update `.env.vps` URLs to
`https://…` + rebuild frontends.

## Memory tip (1–2 GB VPS)

First `docker build` for three Next apps is heavy. Swap helps:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

## Compliance

Sandbox / mock money until licensing and go-live checklist
(`docs/architecture/GO_LIVE.md`) are complete. Admin **Operations → Live** is a
label only; it does not enable real payment HTTP by itself.
