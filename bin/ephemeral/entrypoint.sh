#!/bin/sh
set -e

/usr/local/bin/dockerd-entrypoint.sh &
until docker info >/dev/null 2>&1; do sleep 0.5; done

exec "$@"
