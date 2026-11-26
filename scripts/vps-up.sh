#!/usr/bin/env bash
# Bring up the NextGen Sportsbook stack on a Linux VPS (Docker Compose).
# Prefer: bash scripts/setup-wizard.sh   or   bash scripts/install-vps.sh --domain=… --email=…
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
DOMAIN="${DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"
URL_LAYOUT="${URL_LAYOUT:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/infrastructure/env.vps.example" "$ENV_FILE"
fi

read_kv() {
  grep -E "^${1}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true
}

# Pull DOMAIN / ACME_EMAIL / URL_LAYOUT from env file if not passed.
if [[ -z "$DOMAIN" ]]; then
  DOMAIN="$(read_kv DOMAIN)"
fi
if [[ -z "$ACME_EMAIL" ]]; then
  ACME_EMAIL="$(read_kv ACME_EMAIL)"
fi
if [[ -z "$URL_LAYOUT" ]]; then
  URL_LAYOUT="$(read_kv URL_LAYOUT)"
fi
URL_LAYOUT="${URL_LAYOUT:-path}"

gen_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 18
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 36
  fi
}

# Strengthen default DB password if still placeholder.
if grep -qE '^POSTGRES_PASSWORD=change_me' "$ENV_FILE"; then
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(gen_password)|" "$ENV_FILE"
fi

set_kv() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

COMPOSE_PROFILES=()
HOST_VAL="$(read_kv HOST)"
USE_PREBUILT="$(read_kv USE_PREBUILT_IMAGES)"
USE_PREBUILT="${USE_PREBUILT:-0}"

if [[ -n "$DOMAIN" ]]; then
  echo "Configuring HTTPS for domain: $DOMAIN (layout=${URL_LAYOUT})"
  if [[ -z "$ACME_EMAIL" || "$ACME_EMAIL" == "ops@example.com" ]]; then
    echo "ACME_EMAIL is required for Let's Encrypt (e.g. --email=you@example.com)."
    exit 1
  fi

  set_kv DOMAIN "$DOMAIN"
  set_kv ACME_EMAIL "$ACME_EMAIL"
  set_kv HOST "$DOMAIN"
  set_kv URL_LAYOUT "$URL_LAYOUT"

  if [[ "$URL_LAYOUT" == "hosts" ]]; then
    set_kv CADDYFILE "./Caddyfile.vps.hosts"
    set_kv APP_URL "https://api.${DOMAIN}"
    set_kv NEXT_PUBLIC_API_BASE_URL "https://api.${DOMAIN}/api/v1"
    set_kv NEXT_PUBLIC_CUSTOMER_ORIGIN "https://${DOMAIN}"
    set_kv NEXT_PUBLIC_BASE_PATH ""
    set_kv CORS_ALLOWED_ORIGINS "https://${DOMAIN},https://admin.${DOMAIN},https://agent.${DOMAIN}"
    set_kv DEPLOY_CUSTOMER_URL "https://${DOMAIN}"
    set_kv DEPLOY_ADMIN_URL "https://admin.${DOMAIN}"
    set_kv DEPLOY_AGENT_URL "https://agent.${DOMAIN}"
    set_kv DEPLOY_API_URL "https://api.${DOMAIN}/api/v1"
  else
    # Default path layout: apex + admin. only
    set_kv CADDYFILE "./Caddyfile.vps"
    set_kv URL_LAYOUT "path"
    set_kv APP_URL "https://${DOMAIN}"
    set_kv NEXT_PUBLIC_API_BASE_URL "https://${DOMAIN}/api/v1"
    set_kv NEXT_PUBLIC_CUSTOMER_ORIGIN "https://${DOMAIN}"
    set_kv NEXT_PUBLIC_BASE_PATH "/agent"
    set_kv CORS_ALLOWED_ORIGINS "https://${DOMAIN},https://admin.${DOMAIN}"
    set_kv DEPLOY_CUSTOMER_URL "https://${DOMAIN}"
    set_kv DEPLOY_ADMIN_URL "https://admin.${DOMAIN}"
    set_kv DEPLOY_AGENT_URL "https://${DOMAIN}/agent"
    set_kv DEPLOY_API_URL "https://${DOMAIN}/api/v1"
  fi
  COMPOSE_PROFILES=(--profile https)
  MODE="https"
else
  # IP / hostname mode
  if [[ -z "$HOST_VAL" || "$HOST_VAL" == "YOUR_VPS_IP_OR_DOMAIN" ]]; then
    DETECTED="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
    HOST_VAL="${DETECTED:-localhost}"
    set_kv HOST "$HOST_VAL"
  fi
  set_kv DOMAIN ""
  set_kv URL_LAYOUT "ip"
  set_kv CADDYFILE "./Caddyfile.vps"
  set_kv APP_URL "http://${HOST_VAL}:8081"
  set_kv NEXT_PUBLIC_API_BASE_URL "http://${HOST_VAL}:8081/api/v1"
  set_kv NEXT_PUBLIC_CUSTOMER_ORIGIN "http://${HOST_VAL}:3000"
  set_kv NEXT_PUBLIC_BASE_PATH ""
  set_kv CORS_ALLOWED_ORIGINS "http://${HOST_VAL}:3000,http://${HOST_VAL}:3001,http://${HOST_VAL}:3002"
  set_kv DEPLOY_CUSTOMER_URL "http://${HOST_VAL}:3000"
  set_kv DEPLOY_ADMIN_URL "http://${HOST_VAL}:3001"
  set_kv DEPLOY_AGENT_URL "http://${HOST_VAL}:3002"
  set_kv DEPLOY_API_URL "http://${HOST_VAL}:8081/api/v1"
  MODE="http"
fi

# Compose does not expand ${HOST} inside .env values.
if grep -q '\${HOST}' "$ENV_FILE" 2>/dev/null; then
  HOST_VAL="$(read_kv HOST)"
  sed -i "s|\${HOST}|${HOST_VAL}|g" "$ENV_FILE"
fi

COMPOSE=(docker compose -f infrastructure/docker-compose.vps.yml --env-file "$ENV_FILE" "${COMPOSE_PROFILES[@]}")

if [[ "$USE_PREBUILT" == "1" ]]; then
  echo "Pulling prebuilt images (USE_PREBUILT_IMAGES=1)…"
  if "${COMPOSE[@]}" pull; then
    echo "Starting stack from pulled images…"
    "${COMPOSE[@]}" up -d --no-build
  else
    echo "Pull failed — falling back to local build…"
    "${COMPOSE[@]}" up -d --build
  fi
else
  echo "Building and starting stack (first run can take several minutes)…"
  echo "Tip: set USE_PREBUILT_IMAGES=1 in .env.vps after publishing images to speed this up."
  "${COMPOSE[@]}" up -d --build
fi

# Wait for API health
echo "Waiting for API…"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:8081/up" >/dev/null 2>&1 \
    || curl -fsS "http://127.0.0.1:8081/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo ""
echo "NextGen VPS stack is up (${MODE}, layout=${URL_LAYOUT})."
if [[ "$MODE" == "https" ]]; then
  if [[ "$URL_LAYOUT" == "hosts" ]]; then
    echo "  DNS A records (all → this VPS public IP):"
    echo "    ${DOMAIN}"
    echo "    admin.${DOMAIN}"
    echo "    agent.${DOMAIN}"
    echo "    api.${DOMAIN}"
    echo ""
    echo "  Customer  https://${DOMAIN}"
    echo "  Admin     https://admin.${DOMAIN}"
    echo "  Agent     https://agent.${DOMAIN}"
    echo "  API       https://api.${DOMAIN}/api/v1/health"
  else
    echo "  DNS A records (→ this VPS public IP):"
    echo "    ${DOMAIN}"
    echo "    admin.${DOMAIN}"
    echo ""
    echo "  Customer  https://${DOMAIN}"
    echo "  Agent     https://${DOMAIN}/agent"
    echo "  Admin     https://admin.${DOMAIN}"
    echo "  API       https://${DOMAIN}/api/v1/health"
  fi
  echo ""
  echo "  Open firewall: 22, 80, 443 (Caddy issues Let's Encrypt certs)."
else
  HOST_VAL="$(read_kv HOST)"
  echo "  Customer  http://${HOST_VAL}:3000"
  echo "  Admin     http://${HOST_VAL}:3001"
  echo "  Agent     http://${HOST_VAL}:3002"
  echo "  API       http://${HOST_VAL}:8081/api/v1/health"
  echo ""
  echo "  Open firewall ports 3000-3002 and 8081, or re-run with --domain for HTTPS."
fi
echo ""
echo "  Demo admin: admin@nextgen.local / Password1!"
echo "  Sandbox only until licensing / go-live checklist is complete."
echo "  Updates: bash scripts/update-vps.sh"
