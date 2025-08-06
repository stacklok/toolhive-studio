#!/usr/bin/env sh
set -eu

export CI=true

/usr/local/bin/dockerd-entrypoint.sh &
until docker info >/dev/null 2>&1; do sleep 0.5; done
echo "🐳 Docker-in-Docker daemon is ready."

# Ensure runtime dirs exist and are secure
mkdir -p /tmp/xdg-runtime/keyring
chmod 700 /tmp/xdg-runtime /tmp/xdg-runtime/keyring

# Start a DBus session and gnome-keyring-daemon in the same shell
eval "$(dbus-launch --sh-syntax)"
export XDG_RUNTIME_DIR=/tmp/xdg-runtime

# Start gnome-keyring-daemon and unlock it with a default password
echo "default-password" | gnome-keyring-daemon --unlock --components=secrets,ssh &
sleep 2

# Export the keyring environment variables
export GNOME_KEYRING_CONTROL GNOME_KEYRING_PID

exec "$@"
