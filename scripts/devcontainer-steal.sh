#!/usr/bin/env bash
# Stream a file out of a running devcontainer to the host filesystem.
#
# Why this exists: `/tmp` (and possibly other paths) inside the
# ToolHive Studio devcontainer are mounted as tmpfs. Docker's `docker cp`
# cannot read from tmpfs mounts — it only traverses the container's overlay
# layers — so `docker cp $C:/tmp/foo .` returns "Could not find the file"
# even when `ls /tmp/foo` inside the container confirms it exists. This
# script bypasses `docker cp` by streaming the file via `docker exec cat`,
# which works regardless of mount type.
#
# Usage:
#   devcontainer-steal.sh <container-id> <container-path> <host-path>
#
# Example:
#   devcontainer-steal.sh "$C" /tmp/foo.bin ./foo.bin
#
# Tip: the screenshot helper (devcontainer-screenshot.sh) calls this
# internally, so most callers don't need to invoke it directly. Reach for
# this script when extracting non-screenshot artifacts (logs, generated
# files, etc.) from /tmp or any other tmpfs-backed path.
set -euo pipefail

CONTAINER="${1:?usage: devcontainer-steal.sh <container-id> <container-path> <host-path>}"
SRC="${2:?missing container path}"
DEST="${3:?missing host path}"

docker exec -u node "$CONTAINER" cat "$SRC" > "$DEST"
