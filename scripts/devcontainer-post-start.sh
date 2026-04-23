#!/usr/bin/env bash
# Docker daemon is provided by the docker-in-docker devcontainer feature; no
# manual container runtime setup needed here.

# In Codespaces, auto-start the display stack + dev server so the noVNC preview
# pane opens without the user typing anything. Locally, users run
# `pnpm devContainer:dev` explicitly (which also opens the host browser).
if [ -n "$CODESPACES" ]; then
  nohup bash scripts/devcontainer-entrypoint.sh > /tmp/entrypoint.log 2>&1 &
fi
