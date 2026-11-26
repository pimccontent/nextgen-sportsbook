# Local setup

## Frontends

```bash
pnpm install
pnpm dev:customer   # http://localhost:3100
pnpm dev:admin      # http://localhost:3101
pnpm dev:agent      # http://localhost:3102
```

Dev ports use **3100–3102** because Windows Hyper-V / excluded port ranges often block **3000–3083** (`EACCES`).

## API + data stores

Requires Docker Desktop running **or** local PHP 8.2+ / Composer / PostgreSQL / Redis.

### Docker (preferred)

Host ports are remapped to avoid clashes with other local stacks (LeoCastra, etc.):

| Service | Host port | Container |
|---|---|---|
| API | **8081** | 8080 |
| PostgreSQL | **5433** | 5432 |
| Redis | **6380** | 6379 |

```bash
docker compose -f infrastructure/docker-compose.yml up --build -d
```

Health: `http://localhost:8081/api/v1/health`

Composer `vendor/` installs into a Docker named volume (`api_vendor`) so Windows bind-mount extract failures are avoided.

### Composer on host

```bash
cd apps/api
composer install
copy .env.example .env
php artisan key:generate
php artisan serve --port=8080
```

Database migrations for betting/finance domains are intentionally not added yet.

## Notes

- All money and odds in UIs are mock/sandbox.
- Do not point development tools at production credentials.
