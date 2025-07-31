#!/usr/bin/env bash
# ./ephemeral/thv.sh – run `thv` inside its Docker-in-Docker sandbox
# Works even when you give it no arguments (defaults to port 8080).

set -euo pipefail

# ── locate the project root (one dir up from this script) ──────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── quick scan for a --port flag; if absent, default to 8080 ───────────
PORT=8080
for (( i=1; i<=$#; i++ )); do
  arg="${!i}"
  case "$arg" in
    --port=*) PORT="${arg#--port=}" ;;
    --port)
      next=$((i+1))
      if (( next <= $# )); then PORT="${!next}"; fi
      ;;
  esac
done

# ── run container from the project root ────────────────────────────────
(
  cd "${ROOT_DIR}"

  docker run --privileged --rm -it \
    -p "${PORT}:${PORT}" \
    -v "${ROOT_DIR}:/workspace" \
    -w /workspace \
    thv-containerized thv "$@"
)
