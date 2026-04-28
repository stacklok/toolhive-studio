#!/usr/bin/env bash
# Capture the running ToolHive Studio screen via X11 (Xvfb on :99) inside
# the project's devcontainer and place the PNG at the given host path.
#
# Default host path: ./toolhive-shot.png
#
# Internally:
#   1. Locate the devcontainer attached to the current workspace (or
#      $GITHUB_WORKSPACE in CI).
#   2. Run `import -window root` inside the container to capture the root
#      window of Xvfb on display :99.
#   3. Stream the file back to the host via devcontainer-steal.sh
#      (necessary because /tmp inside the container is tmpfs — see that
#      script for full context).
#   4. Clean up the intermediate file inside the container.
#
# Usage:
#   devcontainer-screenshot.sh [host-path]
#
# Prints the absolute host path on stdout for ergonomic chaining:
#   SHOT=$(scripts/devcontainer-screenshot.sh)
#   <feed $SHOT to a vision model, attach to a PR, etc.>
set -euo pipefail

HOST_PATH="${1:-./toolhive-shot.png}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"

CONTAINER=$(docker ps \
  --filter "label=devcontainer.local_folder=$WORKSPACE" \
  --format '{{.ID}}' | head -1)

if [ -z "$CONTAINER" ]; then
  echo "devcontainer-screenshot.sh: no devcontainer found for $WORKSPACE" >&2
  echo "  (is the devcontainer running? try: pnpm devContainer:dev)" >&2
  exit 1
fi

CONTAINER_TMP="/tmp/.devcontainer-shot-$$.png"

docker exec -u node "$CONTAINER" bash -c \
  "DISPLAY=:99 import -window root '$CONTAINER_TMP'"

"$SCRIPT_DIR/devcontainer-steal.sh" "$CONTAINER" "$CONTAINER_TMP" "$HOST_PATH"

docker exec -u node "$CONTAINER" rm -f "$CONTAINER_TMP" || true

# Resolve to absolute path for downstream consumers.
case "$HOST_PATH" in
  /*) echo "$HOST_PATH" ;;
  *)  echo "$(cd "$(dirname "$HOST_PATH")" && pwd)/$(basename "$HOST_PATH")" ;;
esac
