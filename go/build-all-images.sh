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
    "Chat ORM:chat-orm"
    "Chat:chat"
    "Chat Router:chat-router"
    "Chat Users:chat-users"
    "Chat Agent:chat-agent"
    "Admission:adcon"
)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUCCEEDED=()
FAILED=()

# PARALLEL=N builds N images at a time (default 4; PARALLEL=1 = sequential with
# live output). Each build is dominated by `go mod tidy` against GitHub and, for
# arm64, QEMU emulation, so overlapping them cuts wall-clock time substantially.
# Per-image logs go to go/.build-logs/<dir>.log when PARALLEL > 1.
PARALLEL="${PARALLEL:-4}"
LOG_DIR="$SCRIPT_DIR/.build-logs"

echo "*** Tag: ${TAG} | Architecture: ${ARCH:-amd64 + arm64} | Parallel: ${PARALLEL} ***"

if [ "$PARALLEL" -le 1 ]; then
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
else
    # Portable to bash 3.2 (macOS): no associative arrays, no `wait -n`.
    # Each job writes its exit code to <dir>.rc; the main loop polls for those.
    rm -rf "$LOG_DIR"; mkdir -p "$LOG_DIR" || { echo "cannot create $LOG_DIR"; exit 1; }
    N=${#IMAGES[@]}
    STATE=()      # per image: pending | running | done
    STARTED=()    # per image: start time (SECONDS)
    for ((i = 0; i < N; i++)); do STATE[i]=pending; done
    START=$SECONDS
    DONE_COUNT=0
    DRAWN=0
    [ -t 1 ] && IS_TTY=1 || IS_TTY=0
    LAST_PLAIN=0

    fmt_time() { printf '%dm%02ds' $(($1 / 60)) $(($1 % 60)); }

    # Current docker step of a build, e.g. "linux/arm64 build 5/7", from its log.
    current_step() {
        local step
        step=$(grep -oE '^#[0-9]+ \[[^]]+\]' "$1" 2>/dev/null | tail -1 | sed -E 's/^#[0-9]+ \[(.*)\]$/\1/')
        if [ -z "$step" ] && grep -q '^The push refers to' "$1" 2>/dev/null; then step="pushing"; fi
        echo "${step:-starting}"
    }

    clear_status() {
        if [ "$IS_TTY" -eq 1 ] && [ "$DRAWN" -gt 0 ]; then
            printf '\033[%dA\033[J' "$DRAWN"
            DRAWN=0
        fi
    }

    draw_status() {
        local i name lines=0 running=0
        for ((i = 0; i < N; i++)); do [ "${STATE[i]}" = running ] && running=$((running + 1)); done
        if [ "$IS_TTY" -eq 1 ]; then
            clear_status
            printf '  [%d/%d done, %d running, %s elapsed]\n' "$DONE_COUNT" "$N" "$running" "$(fmt_time $((SECONDS - START)))"
            lines=1
            for ((i = 0; i < N; i++)); do
                [ "${STATE[i]}" = running ] || continue
                name="${IMAGES[i]%%:*}"
                printf '    %-12s %8s  %s\n' "$name" "$(fmt_time $((SECONDS - STARTED[i])))" \
                    "$(current_step "$LOG_DIR/${IMAGES[i]##*:}.log" | cut -c1-60)"
                lines=$((lines + 1))
            done
            DRAWN=$lines
        elif [ $((SECONDS - LAST_PLAIN)) -ge 30 ]; then
            # Not a terminal (piped / CI): one summary line every 30s.
            LAST_PLAIN=$SECONDS
            echo "  ... ${DONE_COUNT}/${N} done, ${running} running, $(fmt_time $((SECONDS - START))) elapsed"
        fi
    }

    event() { clear_status; echo "$@"; }

    while [ "$DONE_COUNT" -lt "$N" ]; do
        RUNNING=0
        for ((i = 0; i < N; i++)); do
            [ "${STATE[i]}" = running ] || continue
            DIR="${IMAGES[i]##*:}"
            NAME="${IMAGES[i]%%:*}"
            if [ -f "$LOG_DIR/$DIR.rc" ]; then
                STATE[i]=done
                DONE_COUNT=$((DONE_COUNT + 1))
                T=$(fmt_time $((SECONDS - STARTED[i])))
                if [ "$(cat "$LOG_DIR/$DIR.rc")" = 0 ]; then
                    SUCCEEDED+=("$NAME")
                    event "  OK      ${NAME}  (${T})"
                else
                    FAILED+=("$NAME")
                    event "  FAILED  ${NAME}  (${T}, see ${LOG_DIR}/${DIR}.log)"
                fi
            else
                RUNNING=$((RUNNING + 1))
            fi
        done
        for ((i = 0; i < N && RUNNING < PARALLEL; i++)); do
            [ "${STATE[i]}" = pending ] || continue
            DIR="${IMAGES[i]##*:}"
            STATE[i]=running
            STARTED[i]=$SECONDS
            RUNNING=$((RUNNING + 1))
            event "  START   ${IMAGES[i]%%:*}"
            # rc is written outside the log redirect, so even a log that cannot
            # be opened still yields a (non-zero) result instead of a hang.
            (
                (cd "$SCRIPT_DIR/prob/$DIR" && ./build.sh "$TAG" "$ARCH") > "$LOG_DIR/$DIR.log" 2>&1 < /dev/null
                echo $? > "$LOG_DIR/$DIR.rc.tmp"; mv "$LOG_DIR/$DIR.rc.tmp" "$LOG_DIR/$DIR.rc"
            ) &
        done
        [ "$DONE_COUNT" -lt "$N" ] || break
        draw_status
        sleep 1
    done
    clear_status
    wait
    echo "  Total: $(fmt_time $((SECONDS - START)))"
fi

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
    echo " available for a requested architecture -- builder,"
    echo " probler-security and probler-postgres must each"
    echo " exist for ${ARCH:-amd64 and arm64}. Rebuild them from l8secure:"
    echo "   cd ../../l8secure/builder  && ./build.sh ${ARCH}"
    echo "   cd ../security             && ./build.sh probler ${ARCH}"
    echo "   cd ../postgres             && ./build.sh probler ${ARCH}"
    echo " A build stage that dies immediately with exit code 255 is the"
    echo " symptom: the base image is the wrong architecture for the target."
fi

[ ${#FAILED[@]} -eq 0 ] || exit 1
