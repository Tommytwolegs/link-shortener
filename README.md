# Link Shortener

A tiny Chrome extension that cleans up long, tracking-laden URLs on the sites where they're worst. Five sites are supported today:

- **Amazon** — automatic address-bar and in-page link cleanup. Long product URLs become `/dp/ASIN` the moment the page loads.
- **Agoda**, **Booking.com**, **Expedia**, **Airbnb** — automatic address-bar cleanup on listing pages plus a small floating toolbar with one-click buttons to copy the short URL, optionally with your selected dates.

No analytics, no telemetry, no remote calls.

## Amazon

```
https://www.amazon.com/Some-Long-Title-Slug/dp/B08N5WRWNW/ref=sr_1_3?keywords=...&qid=1234&sr=8-3
                                            ↓
https://www.amazon.com/dp/B08N5WRWNW
```

Copy the URL from the address bar, or right-click any product link on the page and "Copy link address" — either way you get the clean version.

### Amazon features

- **Automatic address-bar cleanup.** Runs the moment a product page loads (and again on browser back/forward and SPA navigations) so the URL bar is always in canonical form.
- **In-page link rewriting.** Every product link on the page is rewritten in place, so right-click → Copy link address gives you the clean URL without having to open the product first. A MutationObserver catches links added dynamically (carousels, search pagination, SPA transitions).
- **Handles sponsored-link wrappers.** Amazon's `/sspa/click?...&url=<encoded-product>` redirectors and `/gp/slredirect/picassoRedirect.html` wrappers are unwrapped to the underlying product URL.
- **All regional storefronts.** amazon.com, .co.uk, .de, .fr, .it, .es, .nl, .se, .pl, .com.tr, .com.au, .co.jp, .in, .sg, .ae, .sa, .eg, .com.mx, .com.br, .ca, .com.be.
- **Preserves your storefront.** A page on amazon.de stays on amazon.de — only the path is shortened.

## Hotel & rental sites (Agoda, Booking.com, Expedia, Airbnb)

On a listing page, two things happen:

1. **The address bar is cleaned up automatically.** Tracking, session, search-id, and impression params are stripped, leaving just the listing URL plus your selected dates and occupancy. The page itself doesn't reload.
2. **A small floating toolbar appears in the top-left corner** with two copy buttons:
   - **Share Property / Share Listing** — copies the bare listing URL (no dates, no query string).
   - **With Dates** — copies the listing URL with check-in/check-out preserved. Disabled until you've actually picked dates.

The toolbar uses a closed Shadow DOM so the host site's CSS can't touch it. Both buttons show a brief "Copied!" confirmation when clicked.

### What gets kept

| Site | Address bar keeps | "With Dates" button copies |
|---|---|---|
| Agoda | `checkIn`, `los`, `adults`, `children`, `rooms`, `childAges` | `checkIn`, `los` |
| Booking.com | `checkin`, `checkout`, `group_adults`, `group_children`, `no_rooms`, `age` | `checkin`, `checkout` |
| Expedia | `chkin`, `chkout`, `rm1`, `rm2`, … (per-room occupancy) | `chkin`, `chkout` |
| Airbnb | `check_in`, `check_out`, `adults`, `children`, `infants`, `pets` | `check_in`, `check_out` |

### Example — Booking.com

```
https://www.booking.com/hotel/th/aira-bangkok.html?aid=304142&label=gen173nr-...
    &checkin=2026-05-28&checkout=2026-05-29&group_adults=2&group_children=0
    &no_rooms=1&srpvid=5a6ca638786801e7&...&matching_block_id=...
                                            ↓
   Address bar:     https://www.booking.com/hotel/th/aira-bangkok.html?checkin=2026-05-28&checkout=2026-05-29&group_adults=2&group_children=0&no_rooms=1
   Share Property:  https://www.booking.com/hotel/th/aira-bangkok.html
   With Dates:      https://www.booking.com/hotel/th/aira-bangkok.html?checkin=2026-05-28&checkout=2026-05-29
```

## Shared features

- **On/off toggles.** A toolbar popup lets you disable the extension entirely (master toggle) or just for individual sites (per-site toggles for Amazon, Agoda, Booking.com, Expedia, and Airbnb). When the master is off the toolbar icon shows a red "OFF" badge. Your preferences sync across Chrome profiles.
- **Zero data collection.** No analytics, no telemetry, no remote calls. The whole extension runs entirely on your machine.

## Install

### From the Chrome Web Store

*Coming soon.*

### From source (developer mode)

1. Clone or download this repo.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** in the top right.
4. Click **Load unpacked** and pick this folder.

## How it works

### Amazon
A content script runs at `document_start`. It uses a small set of regular expressions to find the ASIN (the 10-character product identifier) in any of Amazon's URL formats — `/dp/`, `/gp/product/`, `/gp/aw/d/`, `/product-reviews/`, `/exec/obidos/`, `/sspa/click?url=…`, etc. — and then calls `history.replaceState` to swap the address bar in place. No reload, no flicker.

For in-page links, the same content script walks the DOM on load and rewrites the `href` attribute of every anchor pointing at an Amazon product page. A `MutationObserver` watches for subsequent changes so links added by Amazon's own JavaScript also get cleaned up.

### Hotel & rental sites
Each site has a small URL module (`agoda.js`, `booking.js`, `expedia.js`, `airbnb.js`) of pure functions — listing-page detection plus three flavours of "make this URL short" (bare property URL, with dates, address-bar form). A shared `site-toolbar.js` module handles the UI: building the toolbar in a closed Shadow DOM, polling the URL every 500ms for SPA navigations, rewriting the address bar via `history.replaceState`, and copying via `navigator.clipboard.writeText()` with a `document.execCommand('copy')` fallback. Adding a new site is then a ~30-line wiring file plus a URL module.

### Shared
A background service worker watches `chrome.webNavigation` events as a safety net for SPA navigations on all sites, and pings the content script to re-check the URL.

## Permissions

| Permission | Why |
|---|---|
| Host access on Amazon, Agoda, Booking, Expedia, and Airbnb domains | Needed for the content scripts to read and rewrite the page's URL, and (on hotel sites) inject the toolbar. |
| `webNavigation` | Detect in-page navigations (pushState) so SPA transitions also get handled. |
| `storage` | Remember your on/off and per-site toggle preferences across browser restarts (uses `chrome.storage.sync`, local to your Google account). |

The extension does not request `tabs`, `cookies`, or any broader permission.

## Development

```
.
├── manifest.json             # MV3 manifest
├── src/
│   ├── asin.js               # Amazon ASIN extraction + URL building (pure functions)
│   ├── content.js            # Amazon content script; history.replaceState + link rewriting
│   ├── agoda.js              # Agoda URL parsing (pure functions)
│   ├── agoda-content.js      # Agoda toolbar wiring (~30 lines, calls SiteToolbar.init)
│   ├── booking.js            # Booking.com URL parsing
│   ├── booking-content.js    # Booking toolbar wiring
│   ├── expedia.js            # Expedia URL parsing
│   ├── expedia-content.js    # Expedia toolbar wiring
│   ├── airbnb.js             # Airbnb URL parsing
│   ├── airbnb-content.js     # Airbnb toolbar wiring
│   ├── site-toolbar.js       # Shared toolbar module — UI, clipboard, address-bar cleanup
│   ├── background.js         # Service worker; SPA-navigation fallback + badge
│   ├── popup.html            # Toolbar popup markup
│   ├── popup.css             # Popup styles (respects prefers-color-scheme)
│   └── popup.js              # Master + per-site toggle wiring — chrome.storage.sync
├── icons/                    # 16/32/48/128 PNGs
├── tests/
│   ├── asin.test.js          # Node-runnable unit tests for asin.js
│   ├── agoda.test.js         # Node-runnable unit tests for agoda.js
│   ├── booking.test.js       # Node-runnable unit tests for booking.js
│   ├── expedia.test.js       # Node-runnable unit tests for expedia.js
│   └── airbnb.test.js        # Node-runnable unit tests for airbnb.js
└── package.sh                # Builds a Web-Store-ready zip
```

Run all tests:

```
node tests/asin.test.js
node tests/agoda.test.js
node tests/booking.test.js
node tests/expedia.test.js
node tests/airbnb.test.js
```

Build a Web-Store-ready zip:

```
./package.sh
```

The script writes `dist/link-shortener-<version>.zip`.

## Roadmap

- Optional: also strip tracking params on other shopping sites (eBay, Walmart, Etsy).
- Optional: Vrbo / Hotels.com support (similar URL shape to Expedia).
- Optional: setting to keep your affiliate tag (`?tag=…`) for Amazon Associates members.

## License

MIT — see [LICENSE](LICENSE).
