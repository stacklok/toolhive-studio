#!/bin/sh
# Path components must match FLATPAK_MODULE_DIR and EXECUTABLE_NAME in common/app-info.ts
export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID}"
exec zypak-wrapper.sh /app/toolhive/ToolHive "$@"
