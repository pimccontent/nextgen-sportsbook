#!/usr/bin/env bash
# Guided VPS setup: domain → DNS check → bring stack up with progress.
# Run as root on Ubuntu/Debian: bash scripts/setup-wizard.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "============================================"
echo " NextGen Sportsbook — setup wizard"
echo "============================================"
echo ""

DOMAIN="${DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"
URL_LAYOUT="${URL_LAYOUT:-path}"
INSTALL_DOCKER="${INSTALL_DOCKER:-0}"
SKIP_DNS="${SKIP_DNS:-0}"
USE_PREBUILT="${USE_PREBUILT_IMAGES:-}"

# When launched via `curl | bash`, stdin is the script pipe — read prompts from the TTY.
TTY_IN="/dev/tty"
if [[ ! -r "$TTY_IN" ]]; then
  TTY_IN="/dev/stdin"
fi

prompt() {
  local var="$1" label="$2" def="${3:-}"
  local cur="${!var:-}"
  if [[ -n "$cur" ]]; then
    return
  fi
  if [[ -n "$def" ]]; then
    read -r -p "${label} [${def}]: " cur <"$TTY_IN" || true
    cur="${cur:-$def}"
  else
    read -r -p "${label}: " cur <"$TTY_IN" || true
  fi
  printf -v "$var" '%s' "$cur"
}

prompt DOMAIN "Apex domain (customer + agent + api paths)"
prompt ACME_EMAIL "Let's Encrypt email"
prompt URL_LAYOUT "URL layout (path=recommended, hosts=legacy)" "path"
if [[ -z "$USE_PREBUILT" ]]; then
  read -r -p "Use prebuilt images if available? [y/N]: " pb <"$TTY_IN" || true
  case "${pb:-n}" in
    y|Y|yes|YES) USE_PREBUILT=1 ;;
    *) USE_PREBUILT=0 ;;
  esac
fi

if [[ -z "$DOMAIN" || -z "$ACME_EMAIL" ]]; then
  echo "Domain and email are required."
  echo "Tip: pass them on the command line so curl|bash does not need prompts:"
  echo "  bash -s -- --domain=YOUR_DOMAIN --email=YOU@EMAIL.com --install-docker"
  exit 1
fi

if [[ "$URL_LAYOUT" != "path" && "$URL_LAYOUT" != "hosts" ]]; then
  echo "URL_LAYOUT must be path or hosts."
  exit 1
fi

echo ""
echo "Step 1/4 — packages & Docker"
if [[ "$(id -u)" -eq 0 ]]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y >/dev/null
  apt-get install -y ca-certificates curl git openssl ufw dnsutils >/dev/null 2>&1 || \
    apt-get install -y ca-certificates curl git openssl ufw >/dev/null
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  if [[ "$INSTALL_DOCKER" == "1" ]] || [[ "$(id -u)" -eq 0 ]]; then
    echo "Installing Docker…"
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker 2>/dev/null || true
  else
    echo "Docker missing. Re-run as root or with INSTALL_DOCKER=1."
    exit 1
  fi
fi

if [[ "$(id -u)" -eq 0 ]] && command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
fi

echo "Step 2/4 — DNS check"
PUB_IP="$(curl -4 -fsS https://ifconfig.me 2>/dev/null || curl -4 -fsS https://api.ipify.org 2>/dev/null || true)"
echo "This VPS IP: ${PUB_IP:-unknown}"
if [[ "$URL_LAYOUT" == "hosts" ]]; then
  echo "Required A records → ${PUB_IP:-VPS IP}:"
  echo "  ${DOMAIN}  admin.${DOMAIN}  agent.${DOMAIN}  api.${DOMAIN}"
else
  echo "Required A records → ${PUB_IP:-VPS IP}:"
  echo "  ${DOMAIN}  admin.${DOMAIN}"
fi

if [[ "$SKIP_DNS" != "1" ]]; then
  chmod +x "$ROOT/scripts/check-dns.sh" || true
  if ! EXPECTED_IP="$PUB_IP" bash "$ROOT/scripts/check-dns.sh" --domain="$DOMAIN" --layout="$URL_LAYOUT"; then
    read -r -p "DNS not ready. Continue anyway? [y/N]: " cont <"$TTY_IN" || true
    case "${cont:-n}" in
      y|Y|yes|YES) echo "Continuing — certs may fail until DNS propagates." ;;
      *) echo "Aborted. Fix DNS and re-run."; exit 1 ;;
    esac
  fi
fi

echo "Step 3/4 — write .env.vps"
ENV_FILE="$ROOT/.env.vps"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/infrastructure/env.vps.example" "$ENV_FILE"
fi
set_kv() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}
set_kv DOMAIN "$DOMAIN"
set_kv ACME_EMAIL "$ACME_EMAIL"
set_kv URL_LAYOUT "$URL_LAYOUT"
set_kv USE_PREBUILT_IMAGES "$USE_PREBUILT"

echo "Step 4/4 — start stack"
export DOMAIN ACME_EMAIL URL_LAYOUT
chmod +x "$ROOT/scripts/vps-up.sh" || true
bash "$ROOT/scripts/vps-up.sh"

echo ""
echo "Wizard complete."
if [[ "$URL_LAYOUT" == "path" ]]; then
  echo "  Open Admin: https://admin.${DOMAIN}"
  echo "  Customer:   https://${DOMAIN}"
  echo "  Agent:      https://${DOMAIN}/agent"
else
  echo "  Open Admin: https://admin.${DOMAIN}"
fi
echo "  Demo: admin@nextgen.local / Password1!"
