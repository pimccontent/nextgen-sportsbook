#!/usr/bin/env bash
# Single-command VPS install for NextGen Sportsbook.
#
# From an empty Linux VPS (after Docker is installed), either:
#
#   curl -fsSL https://raw.githubusercontent.com/OWNER/REPO/main/scripts/install-vps.sh | bash
#
# or (works for private repos you can clone):
#
#   git clone https://github.com/OWNER/REPO.git && cd REPO && bash scripts/install-vps.sh
#
# Env overrides:
#   REPO_URL, BRANCH, INSTALL_DIR, INSTALL_DOCKER=1
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/pimccontent/nextgen-sportsbook.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/nextgen-sportsbook}"

resolve_root() {
  # Prefer an existing checkout that contains this installer.
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

ensure_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return
  fi
  if [[ "${INSTALL_DOCKER:-0}" == "1" ]]; then
    echo "Installing Docker Engine…"
    curl -fsSL https://get.docker.com | sh
    if command -v usermod >/dev/null 2>&1 && [[ "$(id -u)" -eq 0 ]]; then
      true
    elif command -v sudo >/dev/null 2>&1; then
      sudo usermod -aG docker "${SUDO_USER:-$USER}" || true
    fi
    if ! command -v docker >/dev/null 2>&1; then
      echo "Docker install finished but 'docker' is not on PATH yet. Re-login, then re-run."
      exit 1
    fi
    return
  fi
  echo "Docker + Compose v2 are required."
  echo "  curl -fsSL https://get.docker.com | sh"
  echo "Or re-run with INSTALL_DOCKER=1"
  exit 1
}

ROOT="$(resolve_root)"
if [[ -z "$ROOT" ]]; then
  if ! command -v git >/dev/null 2>&1; then
    echo "git is required to clone the repository."
    exit 1
  fi
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    echo "Using existing clone at $INSTALL_DIR"
    ROOT="$INSTALL_DIR"
  else
    echo "Cloning $REPO_URL ($BRANCH) → $INSTALL_DIR"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
    ROOT="$INSTALL_DIR"
  fi
fi

cd "$ROOT"
ensure_docker
bash "$ROOT/scripts/vps-up.sh"
