#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
VERSION="$(awk -F'"' '/"version"[[:space:]]*:/ { print $4; exit }' "$ROOT_DIR/manifest.json")"
ZIP_NAME="focusview-$VERSION.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

mkdir -p "$DIST_DIR"
rm -f "$ZIP_PATH"

cd "$ROOT_DIR"
zip -q -r "$ZIP_PATH" \
  manifest.json \
  popup.html \
  popup.css \
  src/content.js \
  src/transform-state.js \
  src/review-prompt-state.js \
  src/overlay.css \
  icons/icon-16.png \
  icons/icon-32.png \
  icons/icon-48.png \
  icons/icon-128.png

echo "Built $ZIP_PATH"
