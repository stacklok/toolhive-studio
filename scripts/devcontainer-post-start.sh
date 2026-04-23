#!/usr/bin/env bash
set -e

# Start rootful Podman + Docker-compatible socket for ToolHive's bundled thv CLI
sudo podman system service --time=0 unix:///run/podman.sock > /tmp/podman-service.log 2>&1 &
for i in $(seq 1 50); do [ -S /run/podman.sock ] && break; sleep 0.1; done
sudo chmod 666 /run/podman.sock
sudo ln -sf /run/podman.sock /var/run/docker.sock

# In Codespaces, auto-start the display stack + dev server so the noVNC preview
# pane opens without the user typing anything. Locally, users run
# `pnpm devContainer:dev` explicitly (which also opens the host browser).
if [ -n "$CODESPACES" ]; then
  nohup bash scripts/devcontainer-entrypoint.sh > /tmp/entrypoint.log 2>&1 &
fi
