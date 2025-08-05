#!/usr/bin/env bash
set -euo pipefail
set -x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

(
  cd "${ROOT_DIR}"
  docker run --privileged \
    --cap-drop=SETPCAP \
    --cap-add=IPC_LOCK \
    --rm -i \
    --network host \
    -v "${ROOT_DIR}:/workspace" \
    -w /workspace \
    thv-containerized thv "$@"
)
