#!/usr/bin/env bash
# Build a Chrome Web Store-ready zip of the extension.
#
# Output: dist/amazon-link-shortener-<version>.zip
#
# Includes only the files Chrome actually loads — README/PRIVACY/LICENSE/etc.
# stay in the repo but are not shipped in the package, since the Web Store
# already surfaces them via separate fields and including them only bloats the
# install size and broadens the review surface.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: 'zip' is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  # Fall back to a tiny Python one-liner if jq isn't installed.
  VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')"
else
  VERSION="$(jq -r .version manifest.json)"
fi

OUT_DIR="$ROOT/dist"
OUT_ZIP="$OUT_DIR/amazon-link-shortener-${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"

# Stage the files we want to ship into a temp dir, then zip from there.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp manifest.json "$STAGE/"
cp -r src "$STAGE/"
cp -r icons "$STAGE/"

(cd "$STAGE" && zip -r -q "$OUT_ZIP" .)

echo "Built $OUT_ZIP"
echo "Contents:"
unzip -l "$OUT_ZIP"
