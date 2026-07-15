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
if ! command -v node >/dev/null 2>&1; then
  echo "error: 'node' is required (for the parse-check guardrail)" >&2
  exit 1
fi

# ----------------------------------------------------------------------------
# Guardrail: every JS file must parse cleanly before we package. Catches
# mid-line truncation, unterminated strings, missing braces, etc. — bugs
# that would otherwise silently ship a broken extension. This is what the
# v1.6.3 build cycle wanted: a truncated src/content.js made it into the
# xpi and got the package rejected by AMO with "JavaScript syntax error".
# ----------------------------------------------------------------------------
echo "Parse-checking JS files..."
parse_fail=0
for f in src/*.js; do
  if ! node --check "$f" 2>/dev/null; then
    echo "  PARSE FAIL: $f" >&2
    node --check "$f" >&2 || true
    parse_fail=1
  fi
done
if [ "$parse_fail" -ne 0 ]; then
  echo "error: one or more source files failed to parse; aborting build" >&2
  exit 1
fi
echo "  OK ($(ls src/*.js | wc -l | tr -d ' ') files)"

VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')"

OUT_DIR="$ROOT/dist"
OUT_ZIP="$OUT_DIR/link-shortener-${VERSION}.zip"
OUT_XPI="$OUT_DIR/link-shortener-${VERSION}.xpi"

mkdir -p "$OUT_DIR"
# Truncate rather than rm so the script also works on mounts where the
# parent directory's permissions disallow unlink (e.g. some sandboxed
# filesystems). zip will overwrite the empty file just fine.
: > "$OUT_ZIP"
: > "$OUT_XPI"

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
cp -r _locales "$CHROME_STAGE/"
# Build the zip in a tmp path then copy bytes into place. Works even on
# mounts where unlink is disallowed (we already truncated above).
(cd "$CHROME_STAGE" && zip -r -q "$STAGE_BASE/chrome.zip" .)
cat "$STAGE_BASE/chrome.zip" > "$OUT_ZIP"
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
    # strict_min_version 140: data_collection_permissions (140) and
    # optional_host_permissions (128) are both understood, silencing the
    # AMO upload warnings seen on v1.8.0 and guaranteeing the Universal
    # strip's runtime permission works on every installable version.
    # 140 is an ESR line; older releases are EOL.
    "gecko": {
        "id": "link-shortener@tommytwolegs.github.io",
        "strict_min_version": "140.0",
        # AMO requires every add-on to declare data collection. We collect
        # nothing — the extension makes zero network requests — so "none".
        "data_collection_permissions": {
            "required": ["none"],
        },
    },
    # Android gained data_collection_permissions in 142.
    "gecko_android": {
        "strict_min_version": "142.0",
    },
}
# Firefox ignores `background.service_worker` (and warns about it on AMO
# upload), so the Firefox manifest ships ONLY `background.scripts` — the
# event-page mode Firefox actually uses. The Chrome zip keeps
# service_worker. Order matters: URL modules must precede background.js
# since background.js uses self.*LinkShortener globals at top level.
m["background"] = {
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
        "src/linkedin.js",
        "src/ebay.js",
        "src/etsy.js",
        "src/threads.js",
        "src/pinterest.js",
        "src/walmart.js",
        "src/target.js",
        "src/substack.js",
        "src/bluesky.js",
        "src/github.js",
        "src/medium.js",
        "src/quora.js",
        "src/shopee.js",
        "src/lazada.js",
        "src/aliexpress.js",
        "src/temu.js",
        "src/mercadolibre.js",
        "src/rakuten.js",
        "src/trip.js",
        "src/hotelscom.js",
        "src/coupang.js",
        "src/flipkart.js",
        "src/tokopedia.js",
        "src/mercari.js",
        "src/vinted.js",
        "src/allegro.js",
        "src/vrbo.js",
        "src/steam.js",
        "src/imdb.js",
        "src/stackoverflow.js",
        "src/wikipedia.js",
        "src/goodreads.js",
        "src/soundcloud.js",
        "src/applemusic.js",
        "src/twitch.js",
        "src/wayfair.js",
        "src/bestbuy.js",
        "src/bandcamp.js",
        "src/letterboxd.js",
        "src/tripadvisor.js",
        "src/meesho.js",
        "src/carousell.js",
        "src/taobao.js",
        "src/jd.js",
        "src/leboncoin.js",
        "src/olx.js",
        "src/wallapop.js",
        "src/marktplaats.js",
        "src/kleinanzeigen.js",
        "src/zalando.js",
        "src/netflix.js",
        "src/roblox.js",
        "src/fandom.js",
        "src/bilibili.js",
        "src/shein.js",
        "src/news.js",
        "src/google.js",
        "src/gdrive.js",
        "src/bing.js",
        "src/duckduckgo.js",
        "src/naver.js",
        "src/weather.js",
        "src/samsung.js",
        "src/kayak.js",
        "src/skyscanner.js",
        "src/flightaware.js",
        "src/flightradar24.js",
        "src/airlines.js",
        "src/netsuite.js",
        "src/atlassian.js",
        "src/notion.js",
        "src/loom.js",
        "src/figma.js",
        "src/primevideo.js",
        "src/ecosia.js",
        "src/startpage.js",
        "src/bravesearch.js",
        "src/kagi.js",
        "src/pubmed.js",
        "src/scholar.js",
        "src/researchgate.js",
        "src/yelp.js",
        "src/playstore.js",
        "src/appstore.js",
        "src/parcels.js",
        "src/kickstarter.js",
        "src/gofundme.js",
        "src/patreon.js",
        "src/meetup.js",
        "src/allrecipes.js",
        "src/seriouseats.js",
        "src/foodnetwork.js",
        "src/bbcgoodfood.js",
        "src/costco.js",
        "src/homedepot.js",
        "src/lowes.js",
        "src/ikea.js",
        "src/nike.js",
        "src/adidas.js",
        "src/epic.js",
        "src/gog.js",
        "src/humble.js",
        "src/itchio.js",
        "src/accuweather.js",
        "src/wunderground.js",
        "src/espn.js",
        "src/flashscore.js",
        "src/sofascore.js",
        "src/zhihu.js",
        "src/weibo.js",
        "src/shopify.js",
        "src/godaddy.js",
        "src/producthunt.js",
        "src/changeorg.js",
        "src/eventbrite.js",
        "src/yahoojp.js",
        "src/niconico.js",
        "src/daum.js",
        "src/gmarket.js",
        "src/elevenst.js",
        "src/myntra.js",
        "src/zomato.js",
        "src/swiggy.js",
        "src/bol.js",
        "src/otto.js",
        "src/mediamarkt.js",
        "src/cdiscount.js",
        "src/fnac.js",
        "src/trendyol.js",
        "src/hepsiburada.js",
        "src/noon.js",
        "src/jumia.js",
        "src/daraz.js",
        "src/americanas.js",
        "src/magalu.js",
        "src/wildberries.js",
        "src/ozon.js",
        "src/avito.js",
        "src/redirect.js",
        "src/texturl.js",
        "src/utm.js",
        "src/background.js",
    ],
}
print(json.dumps(m, indent=2, ensure_ascii=False))
PY

cp -r src "$FIREFOX_STAGE/"
cp -r icons "$FIREFOX_STAGE/"
cp -r _locales "$FIREFOX_STAGE/"
(cd "$FIREFOX_STAGE" && zip -r -q "$STAGE_BASE/firefox.xpi" .)
cat "$STAGE_BASE/firefox.xpi" > "$OUT_XPI"
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
