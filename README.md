# Amazon Link Shortener

A tiny Chrome extension that automatically rewrites Amazon product URLs in your address bar to the shortest shareable form:

```
https://www.amazon.com/Some-Long-Title-Slug/dp/B08N5WRWNW/ref=sr_1_3?keywords=...&qid=1234&sr=8-3
                                            ↓
https://www.amazon.com/dp/B08N5WRWNW
```

No clicks, no popup, no clipboard hijacking. Copy the URL from the address bar, or right-click any product link on the page and "Copy link address" — either way you get the clean version.

## Features

- **Automatic address-bar cleanup.** Runs the moment a product page loads (and again on browser back/forward and SPA navigations) so the URL bar is always in canonical form.
- **In-page link rewriting.** Every product link on the page is rewritten in place, so right-click → Copy link address gives you the clean URL without having to open the product first. A MutationObserver catches links added dynamically (carousels, search pagination, SPA transitions).
- **On/off toggle.** A toolbar popup lets you disable and re-enable the extension at any time. When it's off, the toolbar icon shows a red "OFF" badge so you can see the state at a glance. Your preference syncs across Chrome profiles.
- **All regional storefronts.** Works on amazon.com, .co.uk, .de, .fr, .it, .es, .nl, .se, .pl, .com.tr, .com.au, .co.jp, .in, .sg, .ae, .sa, .eg, .com.mx, .com.br, .ca, .com.be.
- **Preserves your storefront.** A page on amazon.de stays on amazon.de — only the path is shortened.
- **Strips everything.** Affiliate tags, referral parameters, search-result breadcrumbs, language paths — all gone.
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

A content script runs at `document_start` on every Amazon storefront URL. It uses a small set of regular expressions to find the ASIN (the 10-character product identifier) in any of Amazon's URL formats — `/dp/`, `/gp/product/`, `/gp/aw/d/`, `/product-reviews/`, `/exec/obidos/`, etc. — and then calls `history.replaceState` to swap the address bar in place. No reload, no flicker.

For in-page links, the same content script walks the DOM on load and rewrites the `href` attribute of every anchor pointing at an Amazon product page. A `MutationObserver` watches for subsequent changes so links added by Amazon's own JavaScript (carousels, search pagination, SPA navigations) also get cleaned up.

A background service worker watches `chrome.webNavigation` events as a safety net for the rare SPA navigations Amazon does in-place, and pings the content script to re-check the URL.

## Permissions

| Permission | Why |
|---|---|
| Host access on Amazon storefronts | Needed for the content script to read and rewrite the page's URL. |
| `webNavigation` | Detect in-page navigations (pushState) so SPA transitions also get cleaned up. |
| `storage` | Remember your on/off toggle preference across browser restarts (uses `chrome.storage.sync`, local to your Google account). |

The extension does not request `tabs`, `cookies`, or any broader permission.

## Development

```
.
├── manifest.json          # MV3 manifest
├── src/
│   ├── asin.js            # ASIN extraction + URL building (pure functions)
│   ├── content.js         # Runs in the page; calls history.replaceState
│   ├── background.js      # Service worker; SPA-navigation fallback + badge
│   ├── popup.html         # Toolbar popup markup
│   ├── popup.css          # Popup styles (respects prefers-color-scheme)
│   └── popup.js           # Toggle wiring — reads/writes chrome.storage.sync
├── icons/                 # 16/32/48/128 PNGs
├── tests/
│   └── asin.test.js       # Node-runnable unit tests for asin.js
└── package.sh             # Builds a Web-Store-ready zip
```

Run the tests:

```
node tests/asin.test.js
```

Build a Web-Store-ready zip:

```
./package.sh
```

The script writes `dist/amazon-link-shortener-<version>.zip`.

## Roadmap

- Optional: also strip tracking params on other shopping sites (eBay, Walmart, Etsy).
- Optional: a one-click "copy clean link" toolbar action for sites where rewriting the address bar isn't appropriate.
- Optional: setting to keep your affiliate tag (`?tag=…`) for Amazon Associates members.

## License

MIT — see [LICENSE](LICENSE).
