#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

(
  cd "${ROOT_DIR}"

  docker run --privileged --rm -it \
    --network host \
    -v "${ROOT_DIR}:/workspace" \
    -w /workspace \
    thv-containerized thv "$@"
)
