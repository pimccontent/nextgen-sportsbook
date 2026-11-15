# Production deploy package

Self-contained stack for a **cheap Linux VPS**. No GitHub account or `git clone` required.

Includes: Laravel API, Customer / Admin / Agent (Next.js), Postgres, Redis, Docker Compose.

## Can I deploy without GitHub?

**Yes.** This folder is meant for **manual deploy**:

1. Zip or copy `production deploy` from your PC  
2. Upload to the VPS (SCP, SFTP, FileZilla, WinSCP, rsync)  
3. Run `bash install.sh`

GitHub is optional (CI, backups, team access). Runtime deploy only needs this folder + Docker on the server.

## One-command install (on the VPS)

```bash
# Once on Ubuntu:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out and back in

# Upload this folder, then:
cd "/path/to/production deploy"
bash install.sh
```

| App | URL |
|---|---|
| Customer | `http://YOUR_IP:3000` |
| Admin | `http://YOUR_IP:3001` |
| Agent | `http://YOUR_IP:3002` |
| API health | `http://YOUR_IP:8081/api/v1/health` |

## Upload examples (from your PC)

**PowerShell (Windows) — SCP if OpenSSH is installed:**

```powershell
scp -r "C:\Users\Nana Takyi\Desktop\NewBettingApp\production deploy" user@YOUR_VPS_IP:~/
```

**Or zip first, then upload with WinSCP/FileZilla**, unzip on the VPS:

```bash
unzip production-deploy.zip
cd "production deploy"
bash install.sh
```

## Before / after first boot

Edit `.env` (created from `.env.example` on first run):

- `POSTGRES_PASSWORD` — strong secret  
- `HOST` — public IP or domain  
- `NEXT_PUBLIC_*` — must match browser URLs  

If you change `NEXT_PUBLIC_*` after a build:

```bash
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env up -d --build customer admin agent
```

## Useful commands

```bash
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env ps
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env logs -f api
docker compose -f infrastructure/docker-compose.vps.yml --env-file .env down
```

## VPS sizing

- **2 GB RAM** minimum; **4 GB** recommended for the first image build  
- On 1–2 GB boxes, add swap before building:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

## Compliance

Sandbox / mock money until licensing and `docs/GO_LIVE.md` are complete.  
Demo accounts: `docs/DEMO_ACCOUNTS.md` (if present).
