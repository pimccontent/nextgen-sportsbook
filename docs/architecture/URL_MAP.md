# Production URL map (path layout)

Default HTTPS layout for a single-brand VPS install.

| Surface | URL | Notes |
|---|---|---|
| Customer | `https://YOUR_DOMAIN/` | Brand apex |
| Agent | `https://YOUR_DOMAIN/agent` | Next.js `basePath=/agent` |
| API | `https://YOUR_DOMAIN/api/v1/…` | Same host as customer; `/storage` also on apex |
| Admin | `https://admin.YOUR_DOMAIN` | Separate origin for staff |

## DNS (2 records)

| Hostname | Type | Target |
|---|---|---|
| `YOUR_DOMAIN` | A | VPS public IP |
| `admin.YOUR_DOMAIN` | A | VPS public IP |

Optional: `www.YOUR_DOMAIN` → redirect to apex (Caddy).

## Legacy hosts layout

Set `URL_LAYOUT=hosts` in `.env.vps` to keep the older four-hostname mode
(`admin.`, `agent.`, `api.`). Prefer path layout for new installs.

## Local / IP-only

No path prefix. Ports: customer `:3000`, admin `:3001`, agent `:3002`, API `:8081`.
