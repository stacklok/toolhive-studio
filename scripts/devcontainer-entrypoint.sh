#!/usr/bin/env bash
set -e

# Clean up lingering services and stale lock files from a previous run
pkill -f 'Xvfb :99' 2>/dev/null || true
pkill -f 'fluxbox' 2>/dev/null || true
pkill -f 'x11vnc.*:99' 2>/dev/null || true
pkill -f 'websockify.*6080' 2>/dev/null || true
sleep 0.3
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

# Tear down on exit so Ctrl+C doesn't orphan the display stack
trap 'jobs -p | xargs -r kill 2>/dev/null' EXIT INT TERM

# Virtual framebuffer — CPU-only, no GPU needed
Xvfb :99 -screen 0 1440x900x24 -ac > /tmp/xvfb.log 2>&1 &
sleep 0.5

export DISPLAY=:99

# Minimal window manager — without this, Chromium-based apps map their window
# but never receive the MapNotify/Expose cycle that triggers the first paint.
fluxbox > /tmp/fluxbox.log 2>&1 &
sleep 0.5

# Expose the framebuffer as VNC on port 5900 (container-local)
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 -quiet > /tmp/x11vnc.log 2>&1 &

# Wrap VNC in WebSocket + serve the noVNC HTML client on port 6080
websockify --web=/usr/share/novnc 6080 localhost:5900 > /tmp/websockify.log 2>&1 &

sleep 1

pnpm start -- --no-sandbox --disable-dev-shm-usage --enable-logging=stderr
