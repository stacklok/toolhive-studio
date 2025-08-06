#!/usr/bin/env sh
set -eu

export CI=true

/usr/local/bin/dockerd-entrypoint.sh &
until docker info >/dev/null 2>&1; do sleep 0.5; done
echo "🐳 Docker-in-Docker daemon is ready."

mkdir -p /tmp/xdg-runtime/keyring
chmod 700 /tmp/xdg-runtime /tmp/xdg-runtime/keyring

eval "$(dbus-launch --sh-syntax)"
export XDG_RUNTIME_DIR=/tmp/xdg-runtime

echo "default-password" | gnome-keyring-daemon --unlock --components=secrets,ssh &
sleep 2

export GNOME_KEYRING_CONTROL GNOME_KEYRING_PID

exec "$@"
