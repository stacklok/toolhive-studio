#!/usr/bin/env bash
#
# Build a .deb package, extract the .desktop file from it,
# install it into ~/.local/share/applications/, and rebuild
# the desktop file database so the toolhive-gui:// protocol
# handler is registered for the current user.
#
# Usage: pnpm run install-deep-link-handler

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEB_DIR="$PROJECT_ROOT/out/make/deb/x64"
EXTRACT_DIR="$PROJECT_ROOT/out/deb-extracted"
APPLICATIONS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

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

echo "==> Installing .desktop file to $APPLICATIONS_DIR"
mkdir -p "$APPLICATIONS_DIR"
cp "$DESKTOP_FILE" "$APPLICATIONS_DIR/"

echo "==> Rebuilding desktop file database..."
update-desktop-database "$APPLICATIONS_DIR"

INSTALLED_NAME=$(basename "$DESKTOP_FILE")
echo "==> Done! Installed $INSTALLED_NAME"
echo ""
echo "Verify with:"
echo "  xdg-mime query default x-scheme-handler/toolhive-gui"
