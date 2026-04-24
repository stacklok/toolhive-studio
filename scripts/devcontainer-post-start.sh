#!/usr/bin/env bash
# Docker daemon is provided by the docker-in-docker devcontainer feature; no
# manual container runtime setup needed here.

# In Codespaces, auto-start the display stack + dev server so the noVNC preview
# pane opens without the user typing anything. Locally, users run
# `pnpm devContainer:dev` explicitly (which also opens the host browser).
if [ -n "$CODESPACES" ]; then
  # Persist the forwarded noVNC URL so `cat ~/.cache/toolhive-studio-url`
  # works identically to the local setup. The greeting script in
  # /etc/bash.bashrc is the primary user-facing surface; this is backup.
  mkdir -p "$HOME/.cache"
  printf 'https://%s-6080.%s/vnc.html?autoconnect=1&resize=scale\n' \
    "$CODESPACE_NAME" "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}" \
    > "$HOME/.cache/toolhive-studio-url"

  nohup bash scripts/devcontainer-entrypoint.sh > /tmp/entrypoint.log 2>&1 &
fi
