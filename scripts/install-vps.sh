#!/usr/bin/env bash
# Full one-command VPS install for NextGen Sportsbook (Docker + optional HTTPS domain).
#
# Recommended (guided):
#   curl -fsSL …/scripts/install-vps.sh | bash -s -- --wizard --install-docker
#
# Non-interactive HTTPS (path layout — 2 DNS records):
#   curl -fsSL …/scripts/install-vps.sh | bash -s -- --domain=YOUR_DOMAIN --email=YOU@EMAIL.com --install-docker
#
# DNS before HTTPS (path layout):
#   YOUR_DOMAIN , admin.YOUR_DOMAIN
#
# Legacy four-host: add --layout=hosts (also needs agent. + api.)
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/pimccontent/nextgen-sportsbook.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/nextgen-sportsbook}"
DOMAIN="${DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"
HOST_OVERRIDE="${HOST:-}"
INSTALL_DOCKER="${INSTALL_DOCKER:-0}"
URL_LAYOUT="${URL_LAYOUT:-path}"
WIZARD="${WIZARD:-0}"
USE_PREBUILT="${USE_PREBUILT_IMAGES:-0}"
SKIP_DNS="${SKIP_DNS:-0}"

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \?//'
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
    --layout=*) URL_LAYOUT="${1#*=}"; shift ;;
    --layout) URL_LAYOUT="${2:-}"; shift 2 ;;
    --install-docker) INSTALL_DOCKER=1; shift ;;
    --wizard) WIZARD=1; shift ;;
    --prebuilt) USE_PREBUILT=1; shift ;;
    --skip-dns) SKIP_DNS=1; shift ;;
    --dir=*) INSTALL_DIR="${1#*=}"; shift ;;
    --branch=*) BRANCH="${1#*=}"; shift ;;
    -h|--help) usage ;;
    *)
      echo "Unknown argument: $1"
      usage
      ;;
  esac
done

export DOMAIN ACME_EMAIL URL_LAYOUT USE_PREBUILT_IMAGES="$USE_PREBUILT" SKIP_DNS

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_packages() {
  if need_cmd apt-get; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y ca-certificates curl git openssl ufw dnsutils || \
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
chmod +x scripts/*.sh || true

if [[ "$WIZARD" == "1" ]]; then
  export INSTALL_DOCKER DOMAIN ACME_EMAIL URL_LAYOUT USE_PREBUILT_IMAGES="$USE_PREBUILT" SKIP_DNS
  bash "$ROOT/scripts/setup-wizard.sh"
  exit 0
fi

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

if [[ -n "$HOST_OVERRIDE" ]]; then
  set_kv HOST "$HOST_OVERRIDE"
fi
if [[ -n "$DOMAIN" ]]; then
  set_kv DOMAIN "$DOMAIN"
fi
if [[ -n "$ACME_EMAIL" ]]; then
  set_kv ACME_EMAIL "$ACME_EMAIL"
fi
set_kv URL_LAYOUT "$URL_LAYOUT"
set_kv USE_PREBUILT_IMAGES "$USE_PREBUILT"

configure_firewall

if [[ -n "$DOMAIN" ]]; then
  PUB_IP="$(curl -4 -fsS https://ifconfig.me 2>/dev/null || curl -4 -fsS https://api.ipify.org 2>/dev/null || true)"
  echo ""
  if [[ "$URL_LAYOUT" == "hosts" ]]; then
    echo "Before certificates succeed, point these A records to this VPS${PUB_IP:+ ($PUB_IP)}:"
    echo "  ${DOMAIN}"
    echo "  admin.${DOMAIN}"
    echo "  agent.${DOMAIN}"
    echo "  api.${DOMAIN}"
  else
    echo "Before certificates succeed, point these A records to this VPS${PUB_IP:+ ($PUB_IP)}:"
    echo "  ${DOMAIN}"
    echo "  admin.${DOMAIN}"
  fi
  echo ""
  if [[ "$SKIP_DNS" != "1" ]]; then
    EXPECTED_IP="$PUB_IP" bash "$ROOT/scripts/check-dns.sh" --domain="$DOMAIN" --layout="$URL_LAYOUT" || {
      echo "DNS check failed. Fix records or re-run with --skip-dns."
      exit 1
    }
  fi
fi

export DOMAIN ACME_EMAIL URL_LAYOUT
bash "$ROOT/scripts/vps-up.sh"
