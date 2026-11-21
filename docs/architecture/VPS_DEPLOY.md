# Cheap VPS — single installation (one command)

Run the full stack on **one Linux VPS** (2 GB RAM minimum; 4 GB recommended
for first image builds). Not for classic shared hosting (cPanel PHP-only).

## Full live install (domain + HTTPS) — one command

On a fresh **Ubuntu 22.04/24.04** VPS as **root**, with DNS already pointing
at this server:

| Hostname | Type | Target |
|---|---|---|
| `YOUR_DOMAIN` | A | VPS public IP |
| `admin.YOUR_DOMAIN` | A | VPS public IP |
| `agent.YOUR_DOMAIN` | A | VPS public IP |
| `api.YOUR_DOMAIN` | A | VPS public IP |

Then run:

```bash
curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash -s -- --domain=YOUR_DOMAIN --email=YOU@EMAIL.com --install-docker
```

That single command:

1. Installs system packages (`curl`, `git`, `ufw`, …)
2. Installs Docker Engine + Compose v2 (`--install-docker`)
3. Clones `pimccontent/nextgen-sportsbook` (`main`) into `~/nextgen-sportsbook`
4. Opens firewall ports **22 / 80 / 443**
5. Writes `.env.vps` with HTTPS URLs + CORS for the domain
6. Builds and starts Postgres, Redis, API, Customer, Admin, Agent, and **Caddy**
7. Caddy obtains **Let's Encrypt** certificates for the four hostnames

### After install

| App | URL |
|---|---|
| Customer | `https://YOUR_DOMAIN` |
| Admin | `https://admin.YOUR_DOMAIN` |
| Agent | `https://agent.YOUR_DOMAIN` |
| API health | `https://api.YOUR_DOMAIN/api/v1/health` |

Demo admin: `admin@nextgen.local` / `Password1!`  
(Seeded automatically when the database has zero users.)

## IP-only install (no domain / no HTTPS)

```bash
curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash -s -- --install-docker --host=YOUR_VPS_IP
```

| App | URL |
|---|---|
| Customer | `http://YOUR_IP:3000` |
| Admin | `http://YOUR_IP:3001` |
| Agent | `http://YOUR_IP:3002` |
| API | `http://YOUR_IP:8081/api/v1/health` |

## Already cloned

```bash
bash scripts/install-vps.sh --domain=YOUR_DOMAIN --email=YOU@EMAIL.com
# or
DOMAIN=YOUR_DOMAIN ACME_EMAIL=YOU@EMAIL.com bash scripts/vps-up.sh
```

## Configure / rebuild

Edit `.env.vps` (created from `infrastructure/env.vps.example`):

- `POSTGRES_PASSWORD` — rotated automatically if still the placeholder
- `DOMAIN` / `ACME_EMAIL` — HTTPS mode
- `NEXT_PUBLIC_*` / `CORS_ALLOWED_ORIGINS` — must match browser origins

If you change `NEXT_PUBLIC_*`, rebuild frontends:

```bash
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env.vps --profile https up -d --build customer admin agent
```

## Useful commands

```bash
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env.vps --profile https ps
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env.vps logs -f api
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env.vps --profile https down
```

## Memory tip (1–2 GB VPS)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

## Compliance

Sandbox / mock money until licensing and go-live checklist
(`docs/architecture/GO_LIVE.md`) are complete. Admin **Operations → Live** is a
label only; it does not enable real payment HTTP by itself.
