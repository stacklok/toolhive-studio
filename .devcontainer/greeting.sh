#!/usr/bin/env bash
# Source-me: shown by /etc/bash.bashrc in every interactive shell inside a
# Codespace. No-op elsewhere so local dev is untouched.
#
# Each check is sub-second (pgrep + ss are in-kernel) so the greeting adds
# negligible latency to terminal open.

# Only greet in Codespaces — local users see the launcher banner and terminal title.
[ -n "$CODESPACES" ] || return 0
# Only interactive terminals (don't pollute script output or ssh exec commands).
[ -t 1 ] || return 0
# One greeting per terminal session (not on every subshell).
[ -z "$_TOOLHIVE_GREETED" ] || return 0
export _TOOLHIVE_GREETED=1

url="https://${CODESPACE_NAME}-6080.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}/vnc.html?autoconnect=1&resize=scale"

if ss -tln 2>/dev/null | grep -q ':6080 ' \
   && pgrep -f 'electron/dist/electron' >/dev/null 2>&1 \
   && pgrep -f 'thv serve' >/dev/null 2>&1; then
  printf '\n\033[1;37m────────────────────────────────────────────────────────\033[0m\n'
  printf '  \033[1;37mToolHive Studio dev\033[0m  \033[1;32m✓ Ready\033[0m\n'
  printf '  \033[36m%s\033[0m\n' "$url"
  printf '\033[1;37m────────────────────────────────────────────────────────\033[0m\n\n'
else
  printf '\n\033[1;37m────────────────────────────────────────────────────────\033[0m\n'
  printf '  \033[1;37mToolHive Studio dev\033[0m  \033[1;33m⚠ Not running\033[0m\n'
  printf '  Start it with: \033[1;37mpnpm devContainer:dev\033[0m\n'
  printf '  Expected URL once running:\n    \033[36m%s\033[0m\n' "$url"
  printf '\033[1;37m────────────────────────────────────────────────────────\033[0m\n\n'
fi
