#!/usr/bin/env bash
# Build distributable packages for the extension.
#
# Outputs:
#   dist/link-shortener-<version>.zip       — Chrome Web Store package
#   dist/link-shortener-<version>.xpi       — Firefox add-on (AMO) package
#
# The Firefox xpi uses the same source files but adds a
# `browser_specific_settings.gecko.*` block to manifest.json (required by AMO).
# That field is Mozilla-specific; we don't ship it in the Chrome zip to avoid
# any risk of the Chrome Web Store validator flagging an unrecognized field
# during a future review.
#
# Includes only the files Chrome/Firefox actually load — README/PRIVACY/
# LICENSE/etc. stay in the repo but are not shipped in either package.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: 'zip' is required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "error: 'python3' is required" >&2
  exit 1
fi

VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')"

OUT_DIR="$ROOT/dist"
OUT_ZIP="$OUT_DIR/link-shortener-${VERSION}.zip"
OUT_XPI="$OUT_DIR/link-shortener-${VERSION}.xpi"

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP" "$OUT_XPI"

STAGE_BASE="$(mktemp -d)"
trap 'rm -rf "$STAGE_BASE"' EXIT

# ----------------------------------------------------------------------------
# Chrome zip — manifest.json shipped as-is.
# ----------------------------------------------------------------------------

CHROME_STAGE="$STAGE_BASE/chrome"
mkdir -p "$CHROME_STAGE"
cp manifest.json "$CHROME_STAGE/"
cp -r src "$CHROME_STAGE/"
cp -r icons "$CHROME_STAGE/"
(cd "$CHROME_STAGE" && zip -r -q "$OUT_ZIP" .)
echo "Built $OUT_ZIP"

# ----------------------------------------------------------------------------
# Firefox xpi — manifest.json gets browser_specific_settings.gecko injected.
# The id is a permanent identifier; do not change it once an addon is
# published on AMO under this id.
# ----------------------------------------------------------------------------

FIREFOX_STAGE="$STAGE_BASE/firefox"
mkdir -p "$FIREFOX_STAGE"

python3 <<'PY' > "$FIREFOX_STAGE/manifest.json"
import json
with open("manifest.json") as f:
    m = json.load(f)
m["browser_specific_settings"] = {
    "gecko": {
        "id": "link-shortener@tommytwolegs.github.io",
        "strict_min_version": "121.0",
        # AMO requires every add-on to declare data collection. We collect
        # nothing — the extension makes zero network requests — so "none".
        "data_collection_permissions": {
            "required": ["none"],
        },
    },
}
# Mozilla's add-ons linter requires a `background.scripts` fallback alongside
# `service_worker`. Order matters: URL modules must precede background.js
# since background.js uses self.*LinkShortener globals at top level.
m["background"] = {
    "service_worker": m["background"]["service_worker"],
    "scripts": [
        "src/asin.js",
        "src/agoda.js",
        "src/booking.js",
        "src/expedia.js",
        "src/airbnb.js",
        "src/facebook.js",
        "src/instagram.js",
        "src/youtube.js",
        "src/twitter.js",
        "src/tiktok.js",
        "src/reddit.js",
        "src/spotify.js",
        "src/background.js",
    ],
}
print(json.dumps(m, indent=2, ensure_ascii=False))
PY

cp -r src "$FIREFOX_STAGE/"
cp -r icons "$FIREFOX_STAGE/"
(cd "$FIREFOX_STAGE" && zip -r -q "$OUT_XPI" .)
echo "Built $OUT_XPI"

echo
echo "Chrome zip contents:"
unzip -l "$OUT_ZIP" | tail -5
echo
echo "Firefox xpi contents:"
unzip -l "$OUT_XPI" | tail -5
echo
echo "Firefox manifest verification:"
unzip -p "$OUT_XPI" manifest.json | python3 -c "
import json, sys
m = json.load(sys.stdin)
print('  name:', m['name'])
print('  version:', m['version'])
print('  gecko.id:', m['browser_specific_settings']['gecko']['id'])
print('  gecko.strict_min_version:', m['browser_specific_settings']['gecko']['strict_min_version'])
"
