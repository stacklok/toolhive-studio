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

# Pick a host port. Preference order:
#   1. If a container for this worktree already exists, reuse whatever port it
#      already has bound — otherwise devcontainer CLI would detect a runArgs
#      change and recreate the container, wiping DinD state.
#   2. If 6080 is free on the host, use it (predictable, bookmarkable URL).
#   3. Otherwise, let Docker pick a random free host port (0).
EXISTING_ID=$(docker ps -a --filter "label=devcontainer.local_folder=$WORKDIR" --format '{{.ID}}' | head -1)
if [ -n "$EXISTING_ID" ]; then
  EXISTING_PORT=$(docker port "$EXISTING_ID" 6080/tcp 2>/dev/null | head -1 | awk -F: '{print $NF}')
fi
if [ -n "${EXISTING_PORT:-}" ]; then
  export NOVNC_HOST_PORT="$EXISTING_PORT"
elif ss -Htln 'sport = :6080' 2>/dev/null | grep -q .; then
  export NOVNC_HOST_PORT=0
else
  export NOVNC_HOST_PORT=6080
fi

# Build and start the devcontainer
$DEVCONTAINER up --workspace-folder "$WORKDIR"

# Resolve the actual host port Docker bound (for NOVNC_HOST_PORT=0 this is
# a random free port; for 6080 it echoes 6080).
CONTAINER_ID=$(docker ps --filter "label=devcontainer.local_folder=$WORKDIR" --format '{{.ID}}' | head -1)
HOST_PORT=$(docker port "$CONTAINER_ID" 6080/tcp 2>/dev/null | head -1 | awk -F: '{print $NF}')
URL="http://localhost:${HOST_PORT:-6080}/vnc.html?autoconnect=1&resize=scale"

# Save the URL somewhere stable so it's recoverable after the pnpm/vite/
# electron output exhausts the terminal scrollback.
URL_FILE="$HOME/.cache/toolhive-studio-url"
mkdir -p "$(dirname "$URL_FILE")"
echo "$URL" > "$URL_FILE"

# Set the terminal tab title so the URL stays visible in the tab bar regardless
# of how much output scrolls by.
printf '\033]0;ToolHive: %s\a' "$URL"

printf '\n\033[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
printf '  ToolHive dev server:\n  %s\n\n' "$URL"
printf '  Lost this URL? Run:\n    cat %s\n' "$URL_FILE"
printf '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m\n\n'

# Clear any leftovers from a previous run before the readiness poller starts.
# The entrypoint also does this, but `devcontainer exec` has enough startup
# overhead that the poller would otherwise see stale processes from the
# previous session and fire the ready banner before anything new had started.
docker exec "$CONTAINER_ID" bash -c '
  pkill -f "electron/dist/electron" 2>/dev/null
  pkill -f "thv serve" 2>/dev/null
  pkill -f "websockify.*6080" 2>/dev/null
  pkill -f "x11vnc.*:99" 2>/dev/null
  pkill -f "Xvfb :99" 2>/dev/null
  exit 0
' 2>/dev/null || true
sleep 1

# Poll three signals from a background subshell and, once all are satisfied,
# print a prominent banner and open the browser:
#   1. noVNC's HTTP endpoint answers → browser tab will actually load.
#   2. The Electron binary is running → the app process is alive (not just
#      dev-server bootstrap or thv verification transients).
#   3. `thv serve` is running → the ToolHive backend has been spawned by the
#      Electron main. Matching on "thv serve" specifically avoids false
#      positives from the short-lived `thv version` invocation that happens
#      during startup to verify the binary.
# Opening the browser only at ready-time means the user lands on a functional
# app rather than a blank/connecting noVNC page.
(
  for _ in $(seq 1 180); do
    if curl -sf -o /dev/null "http://localhost:${HOST_PORT:-6080}/vnc.html" 2>/dev/null \
       && docker exec "$CONTAINER_ID" bash -c \
            'pgrep -f "electron/dist/electron" >/dev/null && pgrep -f "thv serve" >/dev/null' \
            2>/dev/null; then
      printf '\n\033[30;42;1m  ✓ ToolHive ready — %s  \033[0m\n\n' "$URL"
      printf '\033]0;✓ ToolHive: %s\a' "$URL"
      case "$(uname)" in
        Darwin) open "$URL" 2>/dev/null || true ;;
        Linux)  xdg-open "$URL" 2>/dev/null || true ;;
      esac
      exit 0
    fi
    sleep 1
  done
  printf '\n\033[33m⚠ ToolHive did not become ready within 3 minutes. Check the output above.\033[0m\n\n'
) &
READY_PID=$!
trap 'kill $READY_PID 2>/dev/null || true' EXIT INT TERM

# Start Xvfb + x11vnc + websockify/noVNC + dev server inside the container
$DEVCONTAINER exec \
  --workspace-folder "$WORKDIR" \
  -- bash scripts/devcontainer-entrypoint.sh
