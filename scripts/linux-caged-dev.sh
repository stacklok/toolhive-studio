#!/usr/bin/env bash
set -e

DEVCONTAINER="npx --yes @devcontainers/cli"
WORKDIR="$(pwd)"

# Build and start the devcontainer first (slow step — do before cage opens a window)
$DEVCONTAINER up --workspace-folder "$WORKDIR"

# Cage runs devcontainer exec as its child application and sets WAYLAND_DISPLAY
# in the child's environment automatically. The child sh expands $WAYLAND_DISPLAY
# (cage-set) and passes it into the container via bash -c.
exec env -u WAYLAND_DISPLAY cage -- sh -c "exec $DEVCONTAINER exec \
  --workspace-folder '$WORKDIR' \
  -- bash -c \"WAYLAND_DISPLAY=\$WAYLAND_DISPLAY XDG_RUNTIME_DIR=/tmp/rt ELECTRON_OZONE_PLATFORM_HINT=wayland pnpm start -- --no-sandbox --ozone-platform=wayland --use-angle=vulkan\""
