#!/usr/bin/env sh
set -eu

export CI=true

###############################################################################
# 0. Runtime dir for D-Bus
###############################################################################
export XDG_RUNTIME_DIR=/tmp/xdg-runtime
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

###############################################################################
# 1. Session D-Bus (no dbus-run-session needed)
###############################################################################
dbus-daemon --session \
            --address="unix:path=$XDG_RUNTIME_DIR/bus.sock" \
            --nopidfile --nofork &
DBUS_SESSION_BUS_PID=$!
export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus.sock"
trap 'kill "$DBUS_SESSION_BUS_PID"' EXIT

###############################################################################
# 2. Start + unlock gnome-keyring (prints env; we eval it)
#    • empty password (printf '\n') ⇒ unlocked
#    • forks once, but that’s fine outside dbus-run-session
###############################################################################
eval "$(printf '\n' | gnome-keyring-daemon \
                     --unlock \
                     --components=secrets,ssh)"
#         ↑ prints GNOME_KEYRING_CONTROL, SSH_AUTH_SOCK, etc.

# Ensure the collection exists (idempotent)
printf '\n' | secret-tool store --label init sentinel sentinel || true
echo "✅ GNOME Keyring is running and unlocked."

###############################################################################
# 3. Start Docker-in-Docker daemon in background
###############################################################################
/usr/local/bin/dockerd-entrypoint.sh &
until docker info >/dev/null 2>&1; do sleep 0.5; done
echo "🐳 Inner Docker daemon is ready."

###############################################################################
# 4. Hand control to *your* command
###############################################################################
exec "$@"
