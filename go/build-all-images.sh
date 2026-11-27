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

# Portable to bash 3.2 (macOS): no associative arrays, no `wait -n`.
# Each job writes its exit code to <dir>.rc; the main loop polls for those.
# Every build (sequential too) runs in the background with its output in a log,
# so a watchdog can see it: when a `go mod tidy` step has started but not
# finished and the log has not grown for STALL_TIMEOUT seconds, the build's
# whole process tree is killed and the build restarted, up to MAX_RESTARTS times.
STALL_TIMEOUT="${STALL_TIMEOUT:-30}"
MAX_RESTARTS="${MAX_RESTARTS:-3}"
[ "$PARALLEL" -ge 1 ] 2>/dev/null || PARALLEL=1
[ "$PARALLEL" -eq 1 ] && LIVE=1 || LIVE=0

rm -rf "$LOG_DIR"; mkdir -p "$LOG_DIR" || { echo "cannot create $LOG_DIR"; exit 1; }
N=${#IMAGES[@]}
STATE=()      # per image: pending | running | done
STARTED=()    # per image: start time of the first attempt (SECONDS)
JOBPID=()     # per image: pid of the background job of the current attempt
LOGSIZE=()    # per image: log size at the last check
CHANGED=()    # per image: when the log last grew (SECONDS)
RESTARTS=()   # per image: watchdog restarts so far
SHOWN=()      # per image: bytes of the log already echoed (LIVE mode)
for ((i = 0; i < N; i++)); do STATE[i]=pending; RESTARTS[i]=0; done
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

# True if a `go mod tidy` step (one per platform) has started but not finished.
tidy_pending() {
    local id
    for id in $(grep -E '^#[0-9]+ \[[^]]+\] RUN .*go mod tidy' "$1" 2>/dev/null | awk '{print $1}' | sort -u); do
        grep -qE "^$id (DONE|ERROR|CANCELED)" "$1" || return 0
    done
    return 1
}

# A pid and all of its descendants (ps-based, works on Linux and macOS).
tree_pids() {
    ps -A -o pid= -o ppid= | awk -v root="$1" '
        { parent[$1] = $2 }
        END { for (p in parent) { q = p; while (q != root && (q in parent) && q > 1) q = parent[q]; if (q == root) print p } }'
}

kill_tree() {
    local pids
    pids=$(tree_pids "$1")
    [ -n "$pids" ] || return 0
    kill -TERM $pids 2>/dev/null   # lets the buildx client cancel the build
    sleep 2
    kill -KILL $pids 2>/dev/null
    wait "$1" 2>/dev/null
}

clear_status() {
    if [ "$IS_TTY" -eq 1 ] && [ "$DRAWN" -gt 0 ]; then
        printf '\033[%dA\033[J' "$DRAWN"
        DRAWN=0
    fi
}

# LIVE mode: echo whatever the running build has appended to its log.
show_new_output() {
    local i log size
    for ((i = 0; i < N; i++)); do
        [ "${STATE[i]}" = running ] || continue
        log="$LOG_DIR/${IMAGES[i]##*:}.log"
        size=$(wc -c < "$log" 2>/dev/null | tr -d ' ')
        [ -n "$size" ] && [ "$size" -gt "${SHOWN[i]}" ] || continue
        tail -c +$((SHOWN[i] + 1)) "$log" | head -c $((size - SHOWN[i]))
        SHOWN[i]=$size
    done
}

draw_status() {
    local i name lines=0 running=0
    if [ "$LIVE" -eq 1 ]; then show_new_output; return; fi
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

# Start (or restart) the build of image $1 in the background.
launch() {
    local i=$1 DIR="${IMAGES[$1]##*:}"
    rm -f "$LOG_DIR/$DIR.rc" "$LOG_DIR/$DIR.rc.tmp"
    : > "$LOG_DIR/$DIR.log"
    LOGSIZE[i]=0; CHANGED[i]=$SECONDS; SHOWN[i]=0
    # rc is written outside the log redirect, so even a log that cannot
    # be opened still yields a (non-zero) result instead of a hang.
    (
        (cd "$SCRIPT_DIR/prob/$DIR" && ./build.sh "$TAG" "$ARCH") > "$LOG_DIR/$DIR.log" 2>&1 < /dev/null
        echo $? > "$LOG_DIR/$DIR.rc.tmp"; mv "$LOG_DIR/$DIR.rc.tmp" "$LOG_DIR/$DIR.rc"
    ) &
    JOBPID[i]=$!
}

finish() {  # $1 = index, $2 = OK | FAILED, $3 = note
    local NAME="${IMAGES[$1]%%:*}"
    STATE[$1]=done
    DONE_COUNT=$((DONE_COUNT + 1))
    if [ "$2" = OK ]; then SUCCEEDED+=("$NAME"); else FAILED+=("$NAME"); fi
    event "  $(printf '%-7s' "$2") ${NAME}  ($(fmt_time $((SECONDS - STARTED[$1])))$3)"
}

echo "*** Stall watchdog: restart a build whose go mod tidy is silent for ${STALL_TIMEOUT}s (max ${MAX_RESTARTS} restarts) ***"

while [ "$DONE_COUNT" -lt "$N" ]; do
    RUNNING=0
    for ((i = 0; i < N; i++)); do
        [ "${STATE[i]}" = running ] || continue
        DIR="${IMAGES[i]##*:}"
        NAME="${IMAGES[i]%%:*}"
        LOG="$LOG_DIR/$DIR.log"
        if [ -f "$LOG_DIR/$DIR.rc" ]; then
            [ "$LIVE" -eq 1 ] && show_new_output
            wait "${JOBPID[i]}" 2>/dev/null
            if [ "$(cat "$LOG_DIR/$DIR.rc")" = 0 ]; then
                finish "$i" OK ""
            else
                finish "$i" FAILED ", see ${LOG}"
            fi
            continue
        fi
        SIZE=$(wc -c < "$LOG" 2>/dev/null | tr -d ' ')
        if [ "${SIZE:-0}" != "${LOGSIZE[i]}" ]; then
            LOGSIZE[i]=${SIZE:-0}; CHANGED[i]=$SECONDS
        elif [ $((SECONDS - CHANGED[i])) -ge "$STALL_TIMEOUT" ] && tidy_pending "$LOG"; then
            [ "$LIVE" -eq 1 ] && show_new_output
            kill_tree "${JOBPID[i]}"
            rm -f "$LOG_DIR/$DIR.rc" "$LOG_DIR/$DIR.rc.tmp"
            RESTARTS[i]=$((RESTARTS[i] + 1))
            mv "$LOG" "$LOG_DIR/$DIR.stalled-${RESTARTS[i]}.log"
            if [ "${RESTARTS[i]}" -le "$MAX_RESTARTS" ]; then
                event "  STALL   ${NAME}  go mod tidy silent for ${STALL_TIMEOUT}s, killed; restart ${RESTARTS[i]}/${MAX_RESTARTS}"
                launch "$i"
                RUNNING=$((RUNNING + 1))
            else
                finish "$i" FAILED ", go mod tidy stalled $((RESTARTS[i])) times, see $LOG_DIR/$DIR.stalled-*.log"
            fi
            continue
        fi
        RUNNING=$((RUNNING + 1))
    done
    for ((i = 0; i < N && RUNNING < PARALLEL; i++)); do
        [ "${STATE[i]}" = pending ] || continue
        STATE[i]=running
        STARTED[i]=$SECONDS
        RUNNING=$((RUNNING + 1))
        if [ "$LIVE" -eq 1 ]; then event ""; event "*** Building ${IMAGES[i]%%:*} ***"; else event "  START   ${IMAGES[i]%%:*}"; fi
        launch "$i"
    done
    [ "$DONE_COUNT" -lt "$N" ] || break
    draw_status
    sleep 1
done
clear_status
wait
echo "  Total: $(fmt_time $((SECONDS - START)))"

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
