#!/usr/bin/env bash
# Build and push VPS portal/API images for faster installs (USE_PREBUILT_IMAGES=1).
#
#   export IMAGE_PREFIX=ghcr.io/YOUR_ORG
#   export IMAGE_TAG=latest
#   bash scripts/build-and-push-images.sh
#
# Requires docker login to the registry first.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE_PREFIX="${IMAGE_PREFIX:-ghcr.io/pimccontent}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
API_BASE="${NEXT_PUBLIC_API_BASE_URL:-https://example.com/api/v1}"
CUSTOMER_ORIGIN="${NEXT_PUBLIC_CUSTOMER_ORIGIN:-https://example.com}"
AGENT_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/agent}"

echo "Building images under ${IMAGE_PREFIX}/*:${IMAGE_TAG}"

docker build -f infrastructure/docker/Dockerfile.api.vps \
  -t "${IMAGE_PREFIX}/nextgen-api:${IMAGE_TAG}" .

docker build -f infrastructure/docker/Dockerfile.next \
  --build-arg APP_NAME=customer \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$API_BASE" \
  --build-arg NEXT_PUBLIC_CUSTOMER_ORIGIN="$CUSTOMER_ORIGIN" \
  --build-arg NEXT_PUBLIC_BASE_PATH= \
  -t "${IMAGE_PREFIX}/nextgen-customer:${IMAGE_TAG}" .

docker build -f infrastructure/docker/Dockerfile.next \
  --build-arg APP_NAME=admin \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$API_BASE" \
  --build-arg NEXT_PUBLIC_CUSTOMER_ORIGIN="$CUSTOMER_ORIGIN" \
  --build-arg NEXT_PUBLIC_BASE_PATH= \
  -t "${IMAGE_PREFIX}/nextgen-admin:${IMAGE_TAG}" .

docker build -f infrastructure/docker/Dockerfile.next \
  --build-arg APP_NAME=agent \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$API_BASE" \
  --build-arg NEXT_PUBLIC_CUSTOMER_ORIGIN="$CUSTOMER_ORIGIN" \
  --build-arg NEXT_PUBLIC_BASE_PATH="$AGENT_BASE_PATH" \
  -t "${IMAGE_PREFIX}/nextgen-agent:${IMAGE_TAG}" .

if [[ "${PUSH:-1}" == "1" ]]; then
  docker push "${IMAGE_PREFIX}/nextgen-api:${IMAGE_TAG}"
  docker push "${IMAGE_PREFIX}/nextgen-customer:${IMAGE_TAG}"
  docker push "${IMAGE_PREFIX}/nextgen-admin:${IMAGE_TAG}"
  docker push "${IMAGE_PREFIX}/nextgen-agent:${IMAGE_TAG}"
  echo "Pushed. On VPS set IMAGE_PREFIX=${IMAGE_PREFIX} USE_PREBUILT_IMAGES=1 then bash scripts/update-vps.sh"
else
  echo "Built locally (PUSH=0). Tag/push manually when ready."
fi
