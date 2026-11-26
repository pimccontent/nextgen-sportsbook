#!/usr/bin/env bash
# Update an existing VPS install: git pull (optional) → pull/build images → migrate → restart.
# Usage (from repo root on the VPS):
#   bash scripts/update-vps.sh
#   bash scripts/update-vps.sh --pull-git
#   bash scripts/update-vps.sh --build
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/.env.vps}"
PULL_GIT=0
FORCE_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pull-git) PULL_GIT=1; shift ;;
    --build) FORCE_BUILD=1; shift ;;
    -h|--help)
      echo "Usage: bash scripts/update-vps.sh [--pull-git] [--build]"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run install/setup first."
  exit 1
fi

read_kv() {
  grep -E "^${1}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true
}

DOMAIN="$(read_kv DOMAIN)"
USE_PREBUILT="$(read_kv USE_PREBUILT_IMAGES)"
USE_PREBUILT="${USE_PREBUILT:-0}"

COMPOSE_PROFILES=()
if [[ -n "$DOMAIN" ]]; then
  COMPOSE_PROFILES=(--profile https)
fi
COMPOSE=(docker compose -f infrastructure/docker-compose.vps.yml --env-file "$ENV_FILE" "${COMPOSE_PROFILES[@]}")

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }

if [[ "$PULL_GIT" == "1" ]]; then
  log "Git pull…"
  git pull --ff-only || log "Git pull skipped/failed (continuing)."
fi

chmod +x scripts/*.sh 2>/dev/null || true

if [[ "$FORCE_BUILD" == "1" ]]; then
  log "Rebuilding images…"
  "${COMPOSE[@]}" up -d --build
elif [[ "$USE_PREBUILT" == "1" ]]; then
  log "Pulling prebuilt images…"
  if "${COMPOSE[@]}" pull; then
    log "Recreating containers…"
    "${COMPOSE[@]}" up -d --no-build
  else
    log "Pull failed — building locally…"
    "${COMPOSE[@]}" up -d --build
  fi
else
  log "Building / recreating…"
  "${COMPOSE[@]}" up -d --build
fi

log "Running migrations…"
"${COMPOSE[@]}" exec -T api php artisan migrate --force --no-interaction || \
  log "Migrate skipped (api not ready yet)."

log "API health…"
for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:8081/up" >/dev/null 2>&1 \
    || curl -fsS "http://127.0.0.1:8081/api/v1/health" >/dev/null 2>&1; then
    log "API OK"
    break
  fi
  sleep 2
done

log "Update finished."
CUSTOMER="$(read_kv DEPLOY_CUSTOMER_URL)"
ADMIN="$(read_kv DEPLOY_ADMIN_URL)"
AGENT="$(read_kv DEPLOY_AGENT_URL)"
API="$(read_kv DEPLOY_API_URL)"
[[ -n "$CUSTOMER" ]] && echo "  Customer  $CUSTOMER"
[[ -n "$ADMIN" ]] && echo "  Admin     $ADMIN"
[[ -n "$AGENT" ]] && echo "  Agent     $AGENT"
[[ -n "$API" ]] && echo "  API       ${API}/health"
