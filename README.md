# Jimothy's Link Shortener

A small browser extension (Chrome MV3, also Firefox MV3) that strips
tracking parameters and other URL clutter from shopping, travel, and
social-media pages — so the URL you copy or share is the clean canonical
form.

No analytics. No telemetry. No remote calls.

## Supported sites

Thirty-nine, organized by world region and type in the popup:

- **Global** — Shopping: Amazon, eBay, Etsy, AliExpress, Temu ·
  Travel: Booking.com, Expedia, Airbnb, Trip.com, Hotels.com, Vrbo ·
  Social & media: Facebook, Instagram, Threads, LinkedIn, YouTube,
  Twitter/X, TikTok, Reddit, Pinterest, Spotify, Bluesky, GitHub,
  Medium, Quora, Substack
- **Americas** — Shopping: Walmart, Target, Mercado Libre
- **Asia-Pacific** — Shopping: Shopee, Lazada, Tokopedia, Coupang,
  Flipkart, Mercari, Rakuten · Travel: Agoda
- **Europe** — Shopping: Vinted, Allegro

Plus an opt-in **Universal tracking strip** mode that strips well-known
tracking parameters (`utm_*`, `gclid`, `fbclid`, `mc_cid`, `igshid`,
`msclkid`, etc.) from URLs on every site you visit. Off by default.

## What it does on each site

### Amazon
Long product URLs become the canonical short form the moment the page
loads:

```
https://www.amazon.com/Some-Long-Title-Slug/dp/B08N5WRWNW/ref=sr_1_3?keywords=...&qid=1234
                                            ↓
https://www.amazon.com/dp/B08N5WRWNW
```

Right-click any product link on the page and "Copy link address" — you
get the clean URL too, because in-page anchor `href`s are also rewritten
in place (a MutationObserver keeps up with carousels, search pagination,
and SPA transitions). The reviews list (`/product-reviews/<ASIN>`) and
third-party sellers (`/gp/offer-listing/<ASIN>`) keep their path and
preserve filter/sort/pagination params so links like "See 5-star
reviews" still work. Optional toggle to keep the human-readable title
slug in URLs (`/<slug>/dp/<ASIN>` instead of bare `/dp/<ASIN>`). All 21
regional storefronts are supported.

### eBay, Etsy
Item / listing URLs collapse to the canonical short form. eBay's `?var=`
variation selector is preserved (a `var=0` "no variation" sentinel is
dropped). Etsy preserves the slug and locale prefix.

### Booking.com, Expedia, Airbnb, Agoda
Address-bar URLs are auto-cleaned on listing pages — dates + occupancy
are kept, everything else (tracking, session, search-id, impression
params) is stripped. A small floating toolbar appears in the top-left
with two copy buttons:

- **Share Property / Share Listing** — copies the bare listing URL.
- **With Dates** — copies the listing URL with check-in/check-out
  preserved. Disabled until you pick dates.

The toolbar lives in a closed Shadow DOM so the host site's CSS can't
touch it. It auto-hides on phone-sized viewports (under 600px wide) and
can be hidden entirely via a popup toggle.

### Facebook, Instagram, Threads, LinkedIn, YouTube, Twitter/X, TikTok, Reddit, Pinterest, Spotify, Bluesky, GitHub, Medium, Quora, Substack
Address-bar URLs cleaned in place. Each site has its own rules for which
query parameters are meaningful and which are tracking:

- **YouTube** keeps `?v=`, `?t=` (timestamp), `?list=` and `?index=`
  (playlist context + position); drops `si`, `pp`, `feature`,
  `ab_channel`, `utm_*`.
- **Spotify** keeps `?t=` (podcast moment-share) and `?context=` (queue
  continuity) on `/track/` and `/episode/`, and `?theme=` on `/embed/`
  forms; strips everything else.
- **Medium** keeps `?sk=` — the Friend Link share key that lets
  non-members read a paywalled story — and strips the `source=`
  attribution junk.
- **GitHub** cleans issue / PR / discussion / commit / release-tag
  permalinks (dropping `notification_referrer_id` and friends) while
  leaving functional routes like file views and `?tab=` pages alone.
  Hash deep-links (`#issuecomment-...`) are preserved.
- **Reddit** cleans post permalinks, the new `/r/<sub>/s/<short>` form,
  user-profile permalinks, and subreddit front pages (keeping `?sort=`
  and `?t=`); preserves `old.reddit.com`, `np.reddit.com`, and other
  intentional subdomains.
- **Facebook** handles posts, photos, videos, reels, groups, events,
  marketplace items, `/watch?v=`, `/photo.php`, `/permalink.php`,
  `fb.watch` short links.
- **TikTok** handles `/@user/video/`, `/@user/photo/`, `/t/`,
  `/share/video/`, plus `vm.tiktok.com` and `vt.tiktok.com` shorts.
- And so on — see each site's module in `src/` for the full rules.

URL hash fragments (`#customerReviews`, `#aplus`, `#section`, etc.) are
preserved across all sites so in-page anchor links keep working as
intended.

### Universal tracking strip (off by default)

A single toggle in the popup. When you turn it on, the browser asks you
to grant access to all websites — this is the standard MV3 permission
prompt for a content script that runs on every page. Once granted, the
extension strips a fixed allowlist of cross-site tracking parameters
(see `src/utm.js` for the full list) from URLs on every http(s) page.
It still reads only the URL — never page content — and still makes zero
network requests.

The toggle is gated on the master "Shorten All Links" toggle, so
flipping the master off stops the universal strip too. You can revoke
the broad permission at any time from your browser's extension
management page; the toggle will auto-untoggle in sync.

## Install

### From the Chrome Web Store

[**Jimothy's Link Shortener**](https://chrome.google.com/webstore/) on the
Chrome Web Store.

### From Firefox Add-ons (AMO)

[**Jimothy's Link Shortener**](https://addons.mozilla.org/) on AMO.

### From source (developer mode)

1. Clone or download this repo.
2. Open `chrome://extensions` (or `about:debugging` in Firefox).
3. Toggle **Developer mode** in the top right (Chrome) or click **This
   Firefox** (Firefox).
4. Click **Load unpacked** (Chrome) / **Load Temporary Add-on…**
   (Firefox) and pick this folder (Chrome) or the .xpi file from
   `dist/` (Firefox).

## How it works

### Per-site cleanup
Each supported site has a pure-function URL module under `src/`
(asin.js, ebay.js, youtube.js, …). Each exports `is<Site>Host()`,
`shortenUrl()`, `needsShortening()`, and a `STORAGE_KEY` constant.
Dependency-free, runs in three contexts: classic content script,
service-worker `importScripts`, and Node `require()` for unit tests.

For Amazon, a dedicated content script (`src/content.js`) handles both
address-bar rewriting and in-page anchor `href` rewriting, with a
`MutationObserver` for SPA carousels and pagination. For the four hotel
sites, a shared `site-toolbar.js` handles the floating-toolbar UI in a
closed Shadow DOM. For all twelve other sites, a shared
`src/social-content.js` dispatcher picks up whichever per-site
`*LinkShortener` global is loaded and uses its `STORAGE_KEY` to gate
the cleanup.

### Universal tracking strip
`src/utm.js` is a pure function that takes a URL and returns the same
URL with universal tracking parameters stripped. `src/utm-content.js`
is the content script that uses it, registered dynamically by
`background.js` (`chrome.scripting.registerContentScripts`) when the
`enabledUtmStrip` storage flag is true AND the `*://*/*` host permission
is granted.

### Background service worker
`src/background.js` runs as a service worker in Chrome (and as an
event-page script in Firefox via the `background.scripts` fallback the
build script injects). It watches `chrome.webNavigation` events on every
per-site host and pings the content script on history-state updates so
SPA transitions get picked up. It also keeps the toolbar badge in sync
with the master toggle (empty when on, red "OFF" when off), reloads
matching tabs on extension update, and handles the dynamic UTM content
script registration described above.

## Tests

1923 unit tests across 40 modules, runnable with plain Node. From the
repo root:

```
node tests/asin.test.js
node tests/agoda.test.js
# ...etc
```

Or loop them:

```bash
for f in tests/*.test.js; do node "$f"; done
```

## Build

A Web-Store / AMO ready zip + xpi:

```bash
# macOS / Linux
bash package.sh

# Windows
.\package.ps1
```

Both scripts parse-check every `src/*.js` with `node --check` before
staging — a truncated or malformed source file aborts the build. The
output goes to `dist/link-shortener-<version>.zip` (Chrome) and
`dist/link-shortener-<version>.xpi` (Firefox).

A pre-commit hook mirroring CI (parse-check + NUL-byte scan + full test
run) lives at `scripts/pre-commit`. Install it once per clone:

```bash
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Permissions

| Permission | Why |
|---|---|
| Host access on supported sites | For per-site content scripts to read and rewrite the page's URL, and on hotel sites, inject the toolbar. |
| `webNavigation` | Detect in-page navigations (pushState) so SPA transitions also get handled. |
| `storage` | Remember your toggle preferences across browser restarts (`chrome.storage.sync`). |
| `scripting` | Dynamically register the Universal tracking strip content script when you enable it. |
| **Optional**: access to all sites (`*://*/*`) | Only requested if you enable the Universal tracking strip toggle in the popup. |

The extension does not request `tabs`, `cookies`, `webRequest`, or any
broader permission.

## License

MIT — see [LICENSE](LICENSE).
