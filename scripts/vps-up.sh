#!/usr/bin/env bash
# Bring up the NextGen Sportsbook stack on a Linux VPS (Docker Compose).
# Prefer: bash scripts/install-vps.sh --domain=example.com --email=ops@example.com
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

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/infrastructure/env.vps.example" "$ENV_FILE"
fi

# Pull DOMAIN / ACME_EMAIL from env file if not passed.
if [[ -z "$DOMAIN" ]]; then
  DOMAIN="$(grep -E '^DOMAIN=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true)"
fi
if [[ -z "$ACME_EMAIL" ]]; then
  ACME_EMAIL="$(grep -E '^ACME_EMAIL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true)"
fi

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
HOST_VAL="$(grep -E '^HOST=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true)"

if [[ -n "$DOMAIN" ]]; then
  echo "Configuring HTTPS for domain: $DOMAIN"
  if [[ -z "$ACME_EMAIL" || "$ACME_EMAIL" == "ops@example.com" ]]; then
    echo "ACME_EMAIL is required for Let's Encrypt (e.g. --email=you@example.com)."
    exit 1
  fi

  set_kv DOMAIN "$DOMAIN"
  set_kv ACME_EMAIL "$ACME_EMAIL"
  set_kv HOST "$DOMAIN"
  set_kv APP_URL "https://api.${DOMAIN}"
  set_kv NEXT_PUBLIC_API_BASE_URL "https://api.${DOMAIN}/api/v1"
  set_kv NEXT_PUBLIC_CUSTOMER_ORIGIN "https://${DOMAIN}"
  set_kv CORS_ALLOWED_ORIGINS "https://${DOMAIN},https://admin.${DOMAIN},https://agent.${DOMAIN}"
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
  set_kv APP_URL "http://${HOST_VAL}:8081"
  set_kv NEXT_PUBLIC_API_BASE_URL "http://${HOST_VAL}:8081/api/v1"
  set_kv NEXT_PUBLIC_CUSTOMER_ORIGIN "http://${HOST_VAL}:3000"
  set_kv CORS_ALLOWED_ORIGINS "http://${HOST_VAL}:3000,http://${HOST_VAL}:3001,http://${HOST_VAL}:3002"
  MODE="http"
fi

# Compose does not expand ${HOST} inside .env values.
if grep -q '\${HOST}' "$ENV_FILE" 2>/dev/null; then
  HOST_VAL="$(grep -E '^HOST=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')"
  sed -i "s|\${HOST}|${HOST_VAL}|g" "$ENV_FILE"
fi

echo "Building and starting stack (first run can take several minutes)…"
docker compose -f infrastructure/docker-compose.vps.yml --env-file "$ENV_FILE" "${COMPOSE_PROFILES[@]}" up -d --build

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
echo "NextGen VPS stack is up (${MODE})."
if [[ "$MODE" == "https" ]]; then
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
  echo ""
  echo "  Open firewall: 22, 80, 443 (Caddy issues Let's Encrypt certs)."
else
  HOST_VAL="$(grep -E '^HOST=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')"
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
