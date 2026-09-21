#!/usr/bin/env bash
set -e

# Arguments may be given in any order: [tag] [amd64|arm64]
# A blank architecture builds both amd64 and arm64.
TAG="latest"
ARCH=""
for arg in "$@"; do
    case "$arg" in
        "")            ;;
        -h|--help)     echo "Usage: $0 [tag] [amd64|arm64]"; echo "  Arguments may be in any order. Blank architecture builds both."; exit 0 ;;
        amd64|x86_64)  ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *)             TAG="$arg" ;;
    esac
done
PLATFORM="linux/amd64,linux/arm64"
[ -n "$ARCH" ] && PLATFORM="linux/$ARCH"

echo "Building saichler/probler-inv-box:${TAG} for ${PLATFORM}"
docker buildx build --no-cache --platform="$PLATFORM" -t saichler/probler-inv-box:${TAG} .
docker push saichler/probler-inv-box:${TAG}
