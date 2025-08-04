#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

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

(
  cd "${ROOT_DIR}"

  docker run --privileged --rm -it \
    -p ${PORT}:${PORT} \
    -v "${ROOT_DIR}:/workspace" \
    -w /workspace \
    thv-containerized thv "$@"
)
