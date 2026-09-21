#!/usr/bin/env bash

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

# "<Display Name>:<directory under prob/>"
IMAGES=(
    "Collector:collector"
    "Parser:parser"
    "Vnet:vnet"
    "Box:inv_box"
    "K8s:inv_k8s"
    "GPUs:inv_gpu"
    "UI:newui"
    "Log Vnet:log-vnet"
    "Log Agent:log-agent"
    "ORM:orm"
    "Alarms:alarms"
    "Topology:topology"
)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUCCEEDED=()
FAILED=()

echo "*** Tag: ${TAG} | Architecture: ${ARCH:-amd64 + arm64} ***"

for entry in "${IMAGES[@]}"; do
    NAME="${entry%%:*}"
    DIR="${entry##*:}"
    echo ""
    echo "*** Building ${NAME} ***"
    if (cd "$SCRIPT_DIR/prob/$DIR" && ./build.sh "$TAG" "$ARCH"); then
        SUCCEEDED+=("$NAME")
    else
        echo "FAILED to build ${NAME}"
        FAILED+=("$NAME")
    fi
done

echo ""
echo "======================================================"
echo " Build summary (tag: ${TAG}, arch: ${ARCH:-amd64 + arm64})"
echo "======================================================"
echo " Succeeded (${#SUCCEEDED[@]}/${#IMAGES[@]}):"
if [ ${#SUCCEEDED[@]} -eq 0 ]; then
    echo "   (none)"
else
    for name in "${SUCCEEDED[@]}"; do echo "   OK      $name"; done
fi
echo " Failed (${#FAILED[@]}/${#IMAGES[@]}):"
if [ ${#FAILED[@]} -eq 0 ]; then
    echo "   (none)"
else
    for name in "${FAILED[@]}"; do echo "   FAILED  $name"; done
fi
echo "======================================================"

if [ ${#FAILED[@]} -eq ${#IMAGES[@]} ]; then
    echo ""
    echo " Every image failed. The usual cause is a base image that is not"
    echo " available for a requested architecture -- saichler/builder,"
    echo " saichler/probler-security and saichler/probler-postgres must each"
    echo " exist for ${ARCH:-amd64 and arm64}. Rebuild them from l8secure:"
    echo "   cd ../../l8secure/builder  && ./build.sh ${ARCH}"
    echo "   cd ../security             && ./build.sh probler ${ARCH}"
    echo "   cd ../postgres             && ./build.sh probler ${ARCH}"
    echo " A build stage that dies immediately with exit code 255 is the"
    echo " symptom: the base image is the wrong architecture for the target."
fi

[ ${#FAILED[@]} -eq 0 ] || exit 1
