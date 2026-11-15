# NextGen Sportsbook

Mobile-first sportsbook for Ghana with Customer, Super Admin, and Agent interfaces
on one Laravel API.

> Development only. All betting, wallet, payment, and settlement flows use
> **mock / sandbox** data until licences, provider approvals, security reviews,
> and responsible-gambling controls are independently confirmed.

## Apps

| App | Path | Port |
|---|---|---|
| Customer | `apps/customer` | 3000 |
| Super Admin | `apps/admin` | 3001 |
| Agent | `apps/agent` | 3002 |
| API | `apps/api` | 8081 (Docker host) |

## Stack

Laravel · PostgreSQL · Redis · Next.js · React · TypeScript · Tailwind CSS · Docker

## Quick start (frontends)

```bash
pnpm install
pnpm dev:customer
pnpm dev:admin
pnpm dev:agent
```

## Quick start (API + data)

```bash
docker compose -f infrastructure/docker-compose.yml up --build -d
# Health: http://localhost:8081/api/v1/health
```

## Cheap VPS — single command install

On a Linux VPS (Ubuntu recommended). Installs/clones the repo and starts
Postgres + Redis + API + Customer + Admin + Agent via Docker Compose.

```bash
git clone https://github.com/pimccontent/nextgen-sportsbook.git && cd nextgen-sportsbook && bash scripts/install-vps.sh
```

Optional: auto-install Docker as well:

```bash
INSTALL_DOCKER=1 git clone https://github.com/pimccontent/nextgen-sportsbook.git && cd nextgen-sportsbook && bash scripts/install-vps.sh
```

If the repo is **public**, you can also pipe the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash
```

Already cloned? From the repo root:

```bash
bash scripts/vps-up.sh
```

URLs after boot: Customer `:3000` · Admin `:3001` · Agent `:3002` · API `:8081`  
Details: `docs/architecture/VPS_DEPLOY.md`

### Manual deploy without GitHub

Use the ready package in `production deploy/` (or `production-deploy.zip`):

1. Upload the folder/zip to the VPS (SCP / WinSCP / FileZilla)  
2. `bash install.sh`

Refresh the package anytime: `powershell -File scripts\pack-production-deploy.ps1`

## Docs

- Playbook: `docs/CURSOR_AI_ENGINEERING_PLAYBOOK.md`
- Status: `docs/PROJECT_STATUS.md`
- Open decisions: `docs/product/DECISIONS_REQUIRED.md`
- Agent instructions: `AGENTS.md`
- VPS deploy: `docs/architecture/VPS_DEPLOY.md`
- Manual package: `production deploy/README.md`
