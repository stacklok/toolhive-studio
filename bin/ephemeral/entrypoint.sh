#!/usr/bin/env sh
set -eu

export CI=true

/usr/local/bin/dockerd-entrypoint.sh &
until docker info >/dev/null 2>&1; do sleep 0.5; done
echo "🐳 Docker-in-Docker daemon is ready."

echo "none" | thv secret setup

exec  "$@"
