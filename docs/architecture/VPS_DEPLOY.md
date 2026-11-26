# Cheap VPS — single installation

Run the full stack on **one Linux VPS** (2 GB RAM minimum; 4 GB recommended
for first image builds). Not for classic shared hosting (cPanel PHP-only).

URL map details: [URL_MAP.md](./URL_MAP.md).

## Full live install (path layout — recommended)

On a fresh **Ubuntu 22.04/24.04** VPS as **root**, with DNS already pointing
at this server:

| Hostname | Type | Target |
|---|---|---|
| `YOUR_DOMAIN` | A | VPS public IP |
| `admin.YOUR_DOMAIN` | A | VPS public IP |

### Guided wizard (smoothest)

```bash
curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash -s -- --wizard --install-docker
```

Prompts for domain, email, layout, optional prebuilt images; checks DNS; starts the stack.

### One-liner (non-interactive)

```bash
curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash -s -- --domain=YOUR_DOMAIN --email=YOU@EMAIL.com --install-docker
```

That command:

1. Installs system packages (`curl`, `git`, `ufw`, …)
2. Installs Docker Engine + Compose v2 (`--install-docker`)
3. Clones `pimccontent/nextgen-sportsbook` (`main`) into `~/nextgen-sportsbook`
4. Opens firewall ports **22 / 80 / 443**
5. Checks DNS for apex + `admin.`
6. Writes `.env.vps` with HTTPS path URLs + CORS
7. Builds (or pulls) and starts Postgres, Redis, API, Customer, Admin, Agent, and **Caddy**
8. Caddy obtains **Let's Encrypt** certificates for the two hostnames

### After install

| App | URL |
|---|---|
| Customer | `https://YOUR_DOMAIN/` |
| Agent | `https://YOUR_DOMAIN/agent` |
| Admin | `https://admin.YOUR_DOMAIN` |
| API health | `https://YOUR_DOMAIN/api/v1/health` |

Demo admin: `admin@nextgen.local` / `Password1!`  
(Seeded automatically when the database has zero users.)

In Admin → **Settings → Domain & deploy** you can see the same URLs and the update command.

## Faster installs (prebuilt images)

On a build machine (or CI):

```bash
export IMAGE_PREFIX=ghcr.io/YOUR_ORG
export NEXT_PUBLIC_API_BASE_URL=https://YOUR_DOMAIN/api/v1
export NEXT_PUBLIC_CUSTOMER_ORIGIN=https://YOUR_DOMAIN
bash scripts/build-and-push-images.sh
```

On the VPS `.env.vps`:

```
IMAGE_PREFIX=ghcr.io/YOUR_ORG
USE_PREBUILT_IMAGES=1
```

Then `bash scripts/update-vps.sh` or re-run the wizard with prebuilt enabled.
Next.js public env is baked at image build time — rebuild/push when the domain or API URL changes, or build on the VPS with `--build`.

## Legacy four-host layout

```bash
bash scripts/install-vps.sh --domain=YOUR_DOMAIN --email=YOU@EMAIL.com --layout=hosts --install-docker
```

Also requires `agent.YOUR_DOMAIN` and `api.YOUR_DOMAIN` A records.

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
bash scripts/setup-wizard.sh
# or
bash scripts/install-vps.sh --domain=YOUR_DOMAIN --email=YOU@EMAIL.com
# or
DOMAIN=YOUR_DOMAIN ACME_EMAIL=YOU@EMAIL.com bash scripts/vps-up.sh
```

## Updates

```bash
bash scripts/update-vps.sh
bash scripts/update-vps.sh --pull-git
bash scripts/update-vps.sh --build
```

## Configure / rebuild

Edit `.env.vps` (from `infrastructure/env.vps.example`):

- `URL_LAYOUT` — `path` (default) or `hosts`
- `POSTGRES_PASSWORD` — rotated automatically if still the placeholder
- `DOMAIN` / `ACME_EMAIL` — HTTPS mode
- `NEXT_PUBLIC_*` / `CORS_ALLOWED_ORIGINS` — must match browser origins
- `USE_PREBUILT_IMAGES` / `IMAGE_PREFIX` — pull instead of compile

If you change `NEXT_PUBLIC_*`, rebuild frontends:

```bash
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env.vps --profile https up -d --build customer admin agent
```

## Useful commands

```bash
bash scripts/check-dns.sh --domain=YOUR_DOMAIN
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
