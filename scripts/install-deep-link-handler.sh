#!/usr/bin/env bash
#
# Build a .deb package, extract the .desktop file from it,
# install it into /usr/share/applications/ (system-wide, like a
# real .deb install), and rebuild the desktop file database so the
# toolhive-gui:// protocol handler is registered.
#
# Requires sudo for the system-wide install step.
#
# Usage: pnpm run install-deep-link-handler

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEB_DIR="$PROJECT_ROOT/out/make/deb/x64"
EXTRACT_DIR="$PROJECT_ROOT/out/deb-extracted"
SYSTEM_APPLICATIONS_DIR="/usr/share/applications"

echo "==> Building .deb package..."
cd "$PROJECT_ROOT"
pnpm exec tsc -b --clean && pnpm exec tsc -b
pnpm exec electron-forge make --targets deb

DEB_FILE=$(find "$DEB_DIR" -name '*.deb' -print -quit)
if [ -z "$DEB_FILE" ]; then
  echo "ERROR: No .deb file found in $DEB_DIR"
  exit 1
fi
echo "==> Found .deb: $DEB_FILE"

echo "==> Extracting .deb..."
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"
dpkg-deb -x "$DEB_FILE" "$EXTRACT_DIR"

DESKTOP_FILE=$(find "$EXTRACT_DIR" -name '*.desktop' -print -quit)
if [ -z "$DESKTOP_FILE" ]; then
  echo "ERROR: No .desktop file found in extracted .deb"
  exit 1
fi
echo "==> Found .desktop file: $DESKTOP_FILE"

# Verify that MimeType is present
if ! grep -q 'MimeType=.*x-scheme-handler/toolhive-gui' "$DESKTOP_FILE"; then
  echo "WARNING: .desktop file does not contain x-scheme-handler/toolhive-gui MimeType"
  echo "Contents:"
  cat "$DESKTOP_FILE"
  exit 1
fi

INSTALLED_NAME=$(basename "$DESKTOP_FILE")

# Patch the Exec line to point to the packaged binary in out/.
# A real .deb install would have the binary at /usr/lib/toolhive/ToolHive
# with a symlink from /usr/bin/toolhive, but we only extracted the .desktop
# file so we rewrite Exec to use the local packaged build instead.
PACKAGED_BIN="$PROJECT_ROOT/out/ToolHive-linux-x64/ToolHive"
if [ ! -x "$PACKAGED_BIN" ]; then
  echo "ERROR: Packaged binary not found at $PACKAGED_BIN"
  exit 1
fi
echo "==> Patching Exec to use packaged binary: $PACKAGED_BIN"
sed -i "s|^Exec=.*|Exec=$PACKAGED_BIN %U|" "$DESKTOP_FILE"

echo "==> Installing .desktop file to $SYSTEM_APPLICATIONS_DIR (requires sudo)..."
sudo cp "$DESKTOP_FILE" "$SYSTEM_APPLICATIONS_DIR/"

echo "==> Rebuilding desktop file database..."
sudo update-desktop-database "$SYSTEM_APPLICATIONS_DIR"

echo "==> Verifying protocol handler registration..."
HANDLER=$(xdg-mime query default x-scheme-handler/toolhive-gui)
if [ "$HANDLER" = "$INSTALLED_NAME" ]; then
  echo "==> Done! x-scheme-handler/toolhive-gui -> $HANDLER"
else
  echo "WARNING: Expected handler '$INSTALLED_NAME' but got '$HANDLER'"
  echo "The protocol handler may not be registered correctly."
  exit 1
fi
