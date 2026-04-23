#!/usr/bin/env bash
set -e

# If we're already inside a container (Codespaces, VS Code Dev Containers, etc.),
# skip the build/exec dance and run the display stack directly. Port 6080 is
# forwarded via devcontainer.json, and Codespaces auto-opens the preview pane.
if [ -f /.dockerenv ]; then
  exec bash scripts/devcontainer-entrypoint.sh
fi

DEVCONTAINER="npx --yes @devcontainers/cli"
WORKDIR="$(pwd)"
URL="http://localhost:6080/vnc.html?autoconnect=1&resize=remote"

# Build and start the devcontainer
$DEVCONTAINER up --workspace-folder "$WORKDIR"

echo ""
echo "→ Open: $URL"
echo ""

# Try to launch the default browser (best-effort; not all hosts have one)
case "$(uname)" in
  Darwin) open "$URL" 2>/dev/null || true ;;
  Linux)  xdg-open "$URL" 2>/dev/null || true ;;
esac

# Start Xvfb + x11vnc + websockify/noVNC + dev server inside the container
$DEVCONTAINER exec \
  --workspace-folder "$WORKDIR" \
  -- bash scripts/devcontainer-entrypoint.sh
