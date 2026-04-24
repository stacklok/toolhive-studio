#!/usr/bin/env bash
set -e

# Clean up lingering services and stale lock files from a previous run.
# The Electron + thv cleanup matters because pnpm/electron-forge don't reliably
# propagate SIGTERM to their children on Ctrl+C — without this, the host-side
# readiness poller would see leftover processes and fire the "ready" banner
# before the new run has even started.
pkill -f 'electron/dist/electron' 2>/dev/null || true
pkill -f 'thv serve' 2>/dev/null || true
pkill -f 'Xvfb :99' 2>/dev/null || true
pkill -f 'fluxbox' 2>/dev/null || true
pkill -f 'x11vnc.*:99' 2>/dev/null || true
pkill -f 'websockify.*6080' 2>/dev/null || true
pkill -f 'gnome-keyring-daemon' 2>/dev/null || true
pkill -f 'dbus-daemon.*--session' 2>/dev/null || true
sleep 0.5
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

# Tear down on exit so Ctrl+C doesn't orphan the display stack
trap 'jobs -p | xargs -r kill 2>/dev/null' EXIT INT TERM

# Virtual framebuffer — CPU-only, no GPU needed. Fixed size; noVNC scales
# the canvas in the browser (see resize=scale in the URL below).
Xvfb :99 -screen 0 1920x1200x24 -ac > /tmp/xvfb.log 2>&1 &
sleep 0.5

export DISPLAY=:99

# Fluxbox per-app rule: auto-fullscreen the Electron window so the VNC view
# shows the app edge-to-edge without WM decorations. Regenerated each run so
# the rule stays in sync with this script.
mkdir -p "$HOME/.fluxbox"
cat > "$HOME/.fluxbox/apps" <<'EOF'
[app] (class=ToolHive)
  [Fullscreen] {yes}
[end]
EOF

# Minimal window manager — without this, Chromium-based apps map their window
# but never receive the MapNotify/Expose cycle that triggers the first paint.
fluxbox > /tmp/fluxbox.log 2>&1 &
sleep 0.5

# Expose the framebuffer as VNC on port 5900 (container-local).
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -quiet > /tmp/x11vnc.log 2>&1 &

# Wrap VNC in WebSocket + serve the noVNC HTML client on port 6080
websockify --web=/usr/share/novnc 6080 localhost:5900 > /tmp/websockify.log 2>&1 &

# ToolHive's secret provider talks to gnome-keyring over D-Bus. Without these,
# the backend returns 500 on any endpoint that touches secrets (e.g. installing
# a server, which stores credentials). This mirrors the e2e CI setup in
# .github/workflows/_e2e.yml.
eval "$(dbus-launch --sh-syntax)"
export DBUS_SESSION_BUS_ADDRESS DBUS_SESSION_BUS_PID
echo "devcontainer-passphrase" | gnome-keyring-daemon \
  --unlock --components=secrets,ssh,pkcs11 > /tmp/keyring.log 2>&1 &

sleep 1

# Electron (via electron-forge in dev mode) exits with ELIFECYCLE 123 shortly
# after launch if stdin/stdout aren't TTYs — which happens when this script
# runs under CI, an automation harness, or a non-interactive `devcontainer
# exec`. Wrap `pnpm start` in `script` to provide a PTY transparently in that
# case. Interactive runs skip the wrapper to keep stdout formatting pristine.
CMD='pnpm start -- --no-sandbox --disable-dev-shm-usage --enable-logging=stderr'
if [ -t 0 ] && [ -t 1 ]; then
  eval "$CMD"
else
  exec script -qfc "$CMD" /dev/null
fi
