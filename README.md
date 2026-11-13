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

## Docs

- Playbook: `docs/CURSOR_AI_ENGINEERING_PLAYBOOK.md`
- Status: `docs/PROJECT_STATUS.md`
- Open decisions: `docs/product/DECISIONS_REQUIRED.md`
- Agent instructions: `AGENTS.md`
