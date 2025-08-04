#!/bin/sh
set -e

: "${XDG_RUNTIME_DIR:=/tmp/xdg-runtime}"
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"
eval "$(dbus-launch --sh-syntax --exit-with-session)"
trap 'kill "$DBUS_SESSION_BUS_PID"' EXIT   # tidy up on shutdown
eval "$(gnome-keyring-daemon --start --components=secrets,ssh,pkcs11)"
if ! secret-tool lookup sentinel sentinel 2>/dev/null; then
  printf '\n' | secret-tool store --label init sentinel sentinel || true
fi

/usr/local/bin/dockerd-entrypoint.sh &
until docker info >/dev/null 2>&1; do sleep 0.5; done

exec "$@"
