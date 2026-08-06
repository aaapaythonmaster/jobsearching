#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/.dev"
BACKEND_PID_FILE="$DEV_DIR/backend.pid"
FRONTEND_PID_FILE="$DEV_DIR/frontend.pid"
BACKEND_LOG="$DEV_DIR/backend.log"
FRONTEND_LOG="$DEV_DIR/frontend.log"
BACKEND_SESSION="jobsearch-preview-backend"
FRONTEND_SESSION="jobsearch-preview-frontend"

mkdir -p "$DEV_DIR"

stop_pid_file() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$pid_file"
  fi
}

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  fi
}

write_pid_for_port() {
  local port="$1"
  local pid_file="$2"
  local pid
  pid="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid" > "$pid_file"
  fi
}

wait_for_port() {
  local port="$1"
  local label="$2"
  for _ in {1..40}; do
    if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return
    fi
    sleep 0.25
  done

  echo "$label did not start on port $port. Check logs in $DEV_DIR." >&2
  exit 1
}

detect_macos_https_proxy() {
  if ! command -v scutil >/dev/null 2>&1; then
    return
  fi

  local enabled host port
  enabled="$(scutil --proxy | awk '/HTTPSEnable/ {print $3; exit}')"
  host="$(scutil --proxy | awk '/HTTPSProxy/ {print $3; exit}')"
  port="$(scutil --proxy | awk '/HTTPSPort/ {print $3; exit}')"

  if [[ "$enabled" == "1" && -n "$host" && -n "$port" ]]; then
    printf 'http://%s:%s' "$host" "$port"
  fi
}

screen -S "$BACKEND_SESSION" -X quit >/dev/null 2>&1 || true
screen -S "$FRONTEND_SESSION" -X quit >/dev/null 2>&1 || true
stop_pid_file "$BACKEND_PID_FILE"
stop_pid_file "$FRONTEND_PID_FILE"
stop_port 3001
stop_port 5176

: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"

AI_PROXY_URL_VALUE="${AI_PROXY_URL:-$(detect_macos_https_proxy)}"
BACKEND_ENV=(PORT=3001)
if [[ -n "$AI_PROXY_URL_VALUE" ]]; then
  BACKEND_ENV+=(AI_PROXY_URL="$AI_PROXY_URL_VALUE")
fi

printf -v BACKEND_ENV_COMMAND '%q ' "${BACKEND_ENV[@]}"

screen -dmS "$BACKEND_SESSION" bash -lc "cd '$ROOT_DIR/backend' && exec env $BACKEND_ENV_COMMAND npm run dev > '$BACKEND_LOG' 2>&1"
wait_for_port 3001 "Backend"
write_pid_for_port 3001 "$BACKEND_PID_FILE"

screen -dmS "$FRONTEND_SESSION" bash -lc "cd '$ROOT_DIR/frontend' && exec env VITE_API_PROXY_TARGET=http://127.0.0.1:3001 npm run dev -- --host 127.0.0.1 --port 5176 --strictPort > '$FRONTEND_LOG' 2>&1"
wait_for_port 5176 "Frontend"
write_pid_for_port 5176 "$FRONTEND_PID_FILE"

echo "Preview started from $ROOT_DIR"
echo "Backend:  http://127.0.0.1:3001"
echo "Frontend: http://127.0.0.1:5176/job-search/jobs"
echo "Logs:     $BACKEND_LOG"
echo "          $FRONTEND_LOG"
if [[ -n "$AI_PROXY_URL_VALUE" ]]; then
  echo "AI proxy: $AI_PROXY_URL_VALUE"
fi
echo
echo "Run: bash scripts/status-preview.sh"
