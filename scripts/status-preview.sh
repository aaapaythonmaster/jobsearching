#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_port() {
  local label="$1"
  local port="$2"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"

  echo "[$label] port $port"
  if [[ -z "$pids" ]]; then
    echo "  not listening"
    return
  fi

  for pid in $pids; do
    echo "  pid: $pid"
    ps -p "$pid" -o pid,ppid,lstart,command
    local cwd
    set +o pipefail
    cwd="$(lsof -p "$pid" 2>/dev/null | awk '$4=="cwd" {print $9; exit}')"
    set -o pipefail
    echo "  cwd: ${cwd:-unknown}"
  done
}

check_url() {
  local label="$1"
  local url="$2"
  local status
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)"
  echo "[$label] $url -> $status"
}

print_macos_proxy() {
  if ! command -v scutil >/dev/null 2>&1; then
    return
  fi

  local enabled host port
  enabled="$(scutil --proxy | awk '/HTTPSEnable/ {print $3; exit}')"
  host="$(scutil --proxy | awk '/HTTPSProxy/ {print $3; exit}')"
  port="$(scutil --proxy | awk '/HTTPSPort/ {print $3; exit}')"

  if [[ "$enabled" == "1" && -n "$host" && -n "$port" ]]; then
    echo "macOS HTTPS proxy: http://$host:$port"
  else
    echo "macOS HTTPS proxy: disabled"
  fi
}

echo "Preview root: $ROOT_DIR"
print_macos_proxy
echo "Screen sessions:"
screen -ls | sed 's/^/  /' || true
echo
print_port "backend" 3001
echo
print_port "frontend" 5176
echo
check_url "backend statuses" "http://127.0.0.1:3001/api/job-search/statuses"
check_url "frontend proxy statuses" "http://127.0.0.1:5176/api/job-search/statuses"
