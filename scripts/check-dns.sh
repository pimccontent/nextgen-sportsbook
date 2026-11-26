#!/usr/bin/env bash
# Check that required DNS A records point at this VPS (or an expected IP).
# Usage:
#   bash scripts/check-dns.sh --domain=example.com
#   bash scripts/check-dns.sh --domain=example.com --layout=hosts
#   EXPECTED_IP=1.2.3.4 bash scripts/check-dns.sh --domain=example.com
set -euo pipefail

DOMAIN=""
LAYOUT="path"
EXPECTED_IP="${EXPECTED_IP:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain=*) DOMAIN="${1#*=}"; shift ;;
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --layout=*) LAYOUT="${1#*=}"; shift ;;
    --layout) LAYOUT="${2:-}"; shift 2 ;;
    --ip=*) EXPECTED_IP="${1#*=}"; shift ;;
    --ip) EXPECTED_IP="${2:-}"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: bash scripts/check-dns.sh --domain=example.com [--layout=path|hosts]"
  exit 1
fi

if [[ -z "$EXPECTED_IP" ]]; then
  EXPECTED_IP="$(curl -4 -fsS https://ifconfig.me 2>/dev/null || curl -4 -fsS https://api.ipify.org 2>/dev/null || true)"
fi

resolve() {
  local host="$1"
  if command -v getent >/dev/null 2>&1; then
    getent ahostsv4 "$host" 2>/dev/null | awk '{print $1; exit}'
  elif command -v dig >/dev/null 2>&1; then
    dig +short A "$host" | head -1
  elif command -v nslookup >/dev/null 2>&1; then
    nslookup "$host" 2>/dev/null | awk '/^Address: / { print $2 }' | tail -1
  else
    python3 - "$host" <<'PY' 2>/dev/null || true
import socket, sys
try:
    print(socket.gethostbyname(sys.argv[1]))
except Exception:
    pass
PY
  fi
}

hosts=("$DOMAIN" "admin.${DOMAIN}")
if [[ "$LAYOUT" == "hosts" ]]; then
  hosts+=("agent.${DOMAIN}" "api.${DOMAIN}")
fi

echo "Expected IP: ${EXPECTED_IP:-unknown}"
fail=0
for h in "${hosts[@]}"; do
  got="$(resolve "$h" || true)"
  if [[ -z "$got" ]]; then
    echo "  FAIL  ${h}  (no A record)"
    fail=1
  elif [[ -n "$EXPECTED_IP" && "$got" != "$EXPECTED_IP" ]]; then
    echo "  FAIL  ${h}  → ${got} (want ${EXPECTED_IP})"
    fail=1
  else
    echo "  OK    ${h}  → ${got}"
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "Fix DNS A records, wait for propagation, then re-run."
  exit 1
fi
echo ""
echo "DNS looks good."
exit 0
