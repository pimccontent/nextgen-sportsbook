#!/usr/bin/env bash
# Full one-command VPS install for NextGen Sportsbook (Docker + optional HTTPS domain).
#
# Public repo one-liner (Ubuntu/Debian VPS as root):
#
#   curl -fsSL https://raw.githubusercontent.com/pimccontent/nextgen-sportsbook/main/scripts/install-vps.sh | bash -s -- --domain=YOUR_DOMAIN --email=YOU@EMAIL.com
#
# Examples:
#   bash -s -- --domain=bet.example.com --email=ops@example.com
#   bash -s -- --domain=bet.example.com --email=ops@example.com --install-docker
#   bash -s -- --host=1.2.3.4 --install-docker          # IP-only, no HTTPS
#
# DNS before HTTPS install (A records → VPS IP):
#   YOUR_DOMAIN , admin.YOUR_DOMAIN , agent.YOUR_DOMAIN , api.YOUR_DOMAIN
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/pimccontent/nextgen-sportsbook.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/nextgen-sportsbook}"
DOMAIN="${DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"
HOST_OVERRIDE="${HOST:-}"
INSTALL_DOCKER="${INSTALL_DOCKER:-0}"

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \?//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain=*) DOMAIN="${1#*=}"; shift ;;
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --email=*) ACME_EMAIL="${1#*=}"; shift ;;
    --email) ACME_EMAIL="${2:-}"; shift 2 ;;
    --host=*) HOST_OVERRIDE="${1#*=}"; shift ;;
    --host) HOST_OVERRIDE="${2:-}"; shift 2 ;;
    --install-docker) INSTALL_DOCKER=1; shift ;;
    --dir=*) INSTALL_DIR="${1#*=}"; shift ;;
    --branch=*) BRANCH="${1#*=}"; shift ;;
    -h|--help) usage ;;
    *)
      echo "Unknown argument: $1"
      usage
      ;;
  esac
done

export DOMAIN ACME_EMAIL

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_packages() {
  if need_cmd apt-get; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y ca-certificates curl git openssl ufw
  fi
}

ensure_docker() {
  if need_cmd docker && docker compose version >/dev/null 2>&1; then
    return
  fi
  if [[ "$INSTALL_DOCKER" != "1" ]]; then
    echo "Docker + Compose v2 required. Re-run with --install-docker"
    exit 1
  fi
  echo "Installing Docker Engine…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker 2>/dev/null || true
  if ! need_cmd docker; then
    echo "Docker installed but not on PATH. Re-login and re-run."
    exit 1
  fi
}

configure_firewall() {
  if ! need_cmd ufw; then
    return
  fi
  echo "Configuring UFW…"
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  if [[ -n "$DOMAIN" ]]; then
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
  else
    ufw allow 3000:3002/tcp >/dev/null 2>&1 || true
    ufw allow 8081/tcp >/dev/null 2>&1 || true
  fi
  ufw --force enable >/dev/null 2>&1 || true
}

resolve_root() {
  if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
    local here
    here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    if [[ -f "$here/scripts/vps-up.sh" && -f "$here/infrastructure/docker-compose.vps.yml" ]]; then
      echo "$here"
      return
    fi
  fi
  if [[ -f "./scripts/vps-up.sh" && -f "./infrastructure/docker-compose.vps.yml" ]]; then
    pwd
    return
  fi
  echo ""
}

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo) for a smooth full install (Docker, firewall, packages)."
  echo "  curl -fsSL … | sudo bash -s -- --domain=… --email=… --install-docker"
fi

ensure_packages
ensure_docker

ROOT="$(resolve_root)"
if [[ -z "$ROOT" ]]; then
  if ! need_cmd git; then
    echo "git is required."
    exit 1
  fi
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    echo "Updating existing clone at $INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH" || true
    ROOT="$INSTALL_DIR"
  else
    echo "Cloning $REPO_URL ($BRANCH) → $INSTALL_DIR"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
    ROOT="$INSTALL_DIR"
  fi
fi

cd "$ROOT"
chmod +x scripts/vps-up.sh scripts/install-vps.sh || true

ENV_FILE="$ROOT/.env.vps"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/infrastructure/env.vps.example" "$ENV_FILE"
fi

if [[ -n "$HOST_OVERRIDE" ]]; then
  sed -i "s|^HOST=.*|HOST=${HOST_OVERRIDE}|" "$ENV_FILE"
fi
if [[ -n "$DOMAIN" ]]; then
  if grep -qE '^DOMAIN=' "$ENV_FILE"; then
    sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" "$ENV_FILE"
  else
    echo "DOMAIN=${DOMAIN}" >> "$ENV_FILE"
  fi
fi
if [[ -n "$ACME_EMAIL" ]]; then
  if grep -qE '^ACME_EMAIL=' "$ENV_FILE"; then
    sed -i "s|^ACME_EMAIL=.*|ACME_EMAIL=${ACME_EMAIL}|" "$ENV_FILE"
  else
    echo "ACME_EMAIL=${ACME_EMAIL}" >> "$ENV_FILE"
  fi
fi

configure_firewall

if [[ -n "$DOMAIN" ]]; then
  PUB_IP="$(curl -4 -fsS https://ifconfig.me 2>/dev/null || curl -4 -fsS https://api.ipify.org 2>/dev/null || true)"
  echo ""
  echo "Before certificates succeed, point these A records to this VPS${PUB_IP:+ ($PUB_IP)}:"
  echo "  ${DOMAIN}"
  echo "  admin.${DOMAIN}"
  echo "  agent.${DOMAIN}"
  echo "  api.${DOMAIN}"
  echo ""
fi

export DOMAIN ACME_EMAIL
bash "$ROOT/scripts/vps-up.sh"
