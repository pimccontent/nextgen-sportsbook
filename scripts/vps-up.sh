#!/usr/bin/env bash
# One-command VPS bring-up for NextGen Sportsbook (Docker Compose).
# Run from the repository root on a Linux VPS with Docker + Compose v2.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. On Ubuntu: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (docker compose)."
  exit 1
fi

ENV_FILE="${ENV_FILE:-$ROOT/.env.vps}"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/infrastructure/env.vps.example" "$ENV_FILE"
  # Best-effort: fill HOST with primary IPv4 when example still has placeholder.
  if command -v hostname >/dev/null 2>&1; then
    DETECTED="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if [[ -n "${DETECTED:-}" ]]; then
      sed -i "s/YOUR_VPS_IP_OR_DOMAIN/${DETECTED}/g" "$ENV_FILE"
      # Expand ${HOST} style leftovers for compose (compose reads literal .env)
      HOST_VAL="$DETECTED"
      sed -i "s|\${HOST}|${HOST_VAL}|g" "$ENV_FILE"
    fi
  fi
  echo "Created $ENV_FILE — review passwords and URLs, then re-run if you changed HOST."
fi

# Compose does not expand ${HOST} inside .env values; normalize common pattern.
if grep -q '\${HOST}' "$ENV_FILE" 2>/dev/null; then
  HOST_VAL="$(grep -E '^HOST=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
  if [[ -n "$HOST_VAL" && "$HOST_VAL" != YOUR_VPS_IP_OR_DOMAIN ]]; then
    sed -i "s|\${HOST}|${HOST_VAL}|g" "$ENV_FILE"
  fi
fi

echo "Building and starting stack (first run can take several minutes)…"
docker compose -f infrastructure/docker-compose.vps.yml --env-file "$ENV_FILE" up -d --build

HOST_VAL="$(grep -E '^HOST=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
HOST_VAL="${HOST_VAL:-localhost}"

echo ""
echo "NextGen VPS stack is up."
echo "  Customer  http://${HOST_VAL}:3000"
echo "  Admin     http://${HOST_VAL}:3001"
echo "  Agent     http://${HOST_VAL}:3002"
echo "  API       http://${HOST_VAL}:8081/api/v1/health"
echo ""
echo "Open firewall ports 3000-3002 and 8081 (or put Nginx/Caddy in front with HTTPS)."
echo "Sandbox only until licensing / go-live checklist is complete."
