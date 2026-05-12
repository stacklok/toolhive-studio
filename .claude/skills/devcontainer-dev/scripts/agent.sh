#!/usr/bin/env bash
# Tightly-scoped wrapper around the agent-driving recipes documented in
# .claude/skills/devcontainer-dev/SKILL.md. Each subcommand finds the
# devcontainer for *this* worktree by label, validates inputs, and execs
# only the documented commands — so the allowlist can target this single
# script instead of broad `Bash(docker exec *)`.
#
# Usage (run from anywhere inside the repo — uses `git rev-parse` to
# locate the repo root):
#
#   bash .claude/skills/devcontainer-dev/scripts/agent.sh shot [--crop WxH+X+Y] [PATH]
#   bash .claude/skills/devcontainer-dev/scripts/agent.sh xdo  <args...>
#   bash .claude/skills/devcontainer-dev/scripts/agent.sh tail LOG [N]
#   bash .claude/skills/devcontainer-dev/scripts/agent.sh health

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "agent.sh: must be run from inside the repo (git rev-parse failed)" >&2
  exit 1
fi

DISPLAY_NAME=":99"
URL_CACHE_FILE="$HOME/.cache/toolhive-studio-url"

find_container() {
  local container
  container=$(docker ps \
    --filter "label=devcontainer.local_folder=$REPO_ROOT" \
    --format '{{.ID}}' | head -1)
  if [ -z "$container" ]; then
    echo "agent.sh: no devcontainer running for $REPO_ROOT" >&2
    echo "          start one with: pnpm devContainer:dev" >&2
    exit 1
  fi
  printf '%s' "$container"
}

# Allowlist of log basenames the `tail` subcommand will read. Keeps the
# subcommand from being a generic `cat /any/path` in disguise.
ALLOWED_LOGS=(
  xvfb
  fluxbox
  x11vnc
  websockify
  keyring
  entrypoint
)

is_allowed_log() {
  local name="$1" allowed
  for allowed in "${ALLOWED_LOGS[@]}"; do
    [ "$name" = "$allowed" ] && return 0
  done
  return 1
}

cmd_shot() {
  local crop="" out_path=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --crop)
        crop="${2:-}"
        if ! [[ "$crop" =~ ^[0-9]+x[0-9]+\+[0-9]+\+[0-9]+$ ]]; then
          echo "agent.sh shot: --crop expects WxH+X+Y (integers), got: $crop" >&2
          exit 2
        fi
        shift 2
        ;;
      -*)
        echo "agent.sh shot: unknown flag: $1" >&2
        exit 2
        ;;
      *)
        out_path="$1"
        shift
        ;;
    esac
  done
  [ -z "$out_path" ] && out_path="/tmp/shot.png"

  local container in_path import_args
  container=$(find_container)
  in_path="/tmp/agent-shot-$$.png"
  if [ -n "$crop" ]; then
    import_args="-window root -crop $crop +repage"
  else
    import_args="-window root"
  fi

  # shellcheck disable=SC2086
  docker exec "$container" bash -c \
    "DISPLAY=$DISPLAY_NAME import $import_args $in_path"
  docker cp "$container:$in_path" "$out_path"
  docker exec "$container" rm -f "$in_path" >/dev/null 2>&1 || true

  local abs_out
  abs_out=$(readlink -f "$out_path" 2>/dev/null || echo "$out_path")
  echo "wrote: $abs_out"
}

cmd_xdo() {
  if [ $# -eq 0 ]; then
    echo "agent.sh xdo: requires xdotool args (e.g., 'mousemove 100 200 click 1')" >&2
    exit 2
  fi
  local container
  container=$(find_container)
  # Pass argv through positionally so quoted strings (e.g. 'type "hello world"')
  # survive without going through a shell -c.
  docker exec -e "DISPLAY=$DISPLAY_NAME" "$container" xdotool "$@"
}

cmd_tail() {
  if [ $# -lt 1 ]; then
    echo "agent.sh tail: usage: tail LOG [N]" >&2
    echo "  LOG ∈ {${ALLOWED_LOGS[*]}}" >&2
    exit 2
  fi
  local log="$1" n="${2:-50}"
  if ! is_allowed_log "$log"; then
    echo "agent.sh tail: unknown log '$log'" >&2
    echo "  allowed: ${ALLOWED_LOGS[*]}" >&2
    exit 2
  fi
  if ! [[ "$n" =~ ^[0-9]+$ ]]; then
    echo "agent.sh tail: N must be a positive integer, got: $n" >&2
    exit 2
  fi
  local container
  container=$(find_container)
  docker exec "$container" tail -n "$n" "/tmp/${log}.log"
}

cmd_health() {
  local container fail=0
  container=$(find_container) || exit 1
  echo "container: $container"

  if docker exec "$container" pgrep -f '[e]lectron/dist/electron' >/dev/null 2>&1; then
    echo "electron:   running"
  else
    echo "electron:   NOT running"
    fail=1
  fi

  if docker exec "$container" pgrep -f '[t]hv serve' >/dev/null 2>&1; then
    echo "thv serve:  running"
  else
    echo "thv serve:  NOT running"
    fail=1
  fi

  if docker exec "$container" bash -c "DISPLAY=$DISPLAY_NAME xdotool search --class ToolHive >/dev/null 2>&1"; then
    echo "window:     ToolHive present"
  else
    echo "window:     ToolHive NOT mapped"
    fail=1
  fi

  if docker exec "$container" curl -sf -o /dev/null -m 3 http://localhost:6080/; then
    echo "noVNC:6080: ok (in-container)"
  else
    echo "noVNC:6080: NOT responding (in-container)"
    fail=1
  fi

  if [ -f "$URL_CACHE_FILE" ]; then
    local url
    url=$(cat "$URL_CACHE_FILE")
    if curl -sf -o /dev/null -m 3 "$url"; then
      echo "noVNC host: ok ($url)"
    else
      echo "noVNC host: NOT responding ($url)"
      fail=1
    fi
  else
    echo "noVNC host: unknown (no $URL_CACHE_FILE)"
  fi

  exit "$fail"
}

usage() {
  local fd="${1:-2}"
  cat >&"$fd" <<EOF
Usage: $0 <subcommand> [args...]

Subcommands:
  shot [--crop WxH+X+Y] [PATH]   Screenshot the in-container display to
                                 PATH on the host (default: /tmp/shot.png).
                                 --crop forwards to ImageMagick \`import\`.
  xdo  <args...>                 Run \`xdotool <args>\` against DISPLAY=:99
                                 inside the devcontainer. Covers click,
                                 key, type, mousemove, search, etc.
  tail LOG [N]                   Tail /tmp/<LOG>.log (last N lines, default
                                 50). LOG ∈ {${ALLOWED_LOGS[*]}}.
  health                         Print readiness of electron, thv serve,
                                 the ToolHive X window, and noVNC. Exit 0
                                 if all green.

Each subcommand finds the devcontainer for this worktree by label
(devcontainer.local_folder=$REPO_ROOT) — never accepts a container ID.
EOF
}

main() {
  local sub="${1:-}"
  [ $# -gt 0 ] && shift
  case "$sub" in
    shot)         cmd_shot "$@" ;;
    xdo)          cmd_xdo "$@" ;;
    tail)         cmd_tail "$@" ;;
    health)       cmd_health "$@" ;;
    -h|--help|help) usage 1; exit 0 ;;
    "")           usage; exit 1 ;;
    *) echo "agent.sh: unknown subcommand: $sub" >&2; usage; exit 1 ;;
  esac
}

main "$@"
