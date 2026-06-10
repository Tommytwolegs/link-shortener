# Privacy Policy

**Jimothy's Link Shortener** does not collect, store, transmit, sell, or share any personal data.

## What the extension does

The extension cleans long, tracking-laden URLs in your browser's address bar so the URL you copy or share is the short canonical form. It works on a fixed list of supported shopping, travel, and social/media sites (see [README.md](README.md) for the current list), plus an opt-in "Universal tracking strip" mode that strips common tracking parameters (utm_*, gclid, fbclid, mc_cid, etc.) from URLs regardless of host.

All processing happens locally in your browser. The extension:

- **Does not** make any network requests of any kind.
- **Does not** use any analytics, tracking, or telemetry SDKs.
- **Does not** share any data with the developer or with any third party.
- **Does not** read or modify any web page content beyond the URL itself, with one narrow exception: on an Amazon product page, when you have opted in to the "Include Amazon item name" preference, the extension reads the `#productTitle` element to derive the URL's title slug. This text never leaves your browser.

## What the extension stores

The only data the extension stores is your settings:

- A handful of booleans: master on/off toggle, per-site toggles (one per supported site), and feature flags (hide travel popup, include Amazon item name, universal tracking strip).
- Two optional list fields used by the Advanced settings page for the Universal tracking strip: `utmStripSkipDomains` (hosts to skip — strings you typed) and `utmStripKeepParams` (param names to never strip — strings you typed). Both default to empty.

All of this is stored in `chrome.storage.sync`. It syncs between your own browser installations through your signed-in browser account; it is never sent to the developer or to any other party.

No browsing history, no URLs you've visited, no page content, no clicks, no clipboard data, no anything else is ever stored or transmitted.

## Permissions

| Permission | Purpose |
|---|---|
| Host access on the supported sites (Amazon, eBay, Etsy, Walmart, Target, Booking, Expedia, Airbnb, Agoda, Facebook, Instagram, Threads, LinkedIn, YouTube, Twitter/X, TikTok, Reddit, Pinterest, Spotify, plus their regional and short-link domains) | Allows the content scripts to run on those pages and rewrite the URL in the address bar (and on Amazon, the in-page anchor links). |
| `webNavigation` | Detects in-page navigations (single-page-app `pushState` transitions) on supported sites so URLs are also handled when the page changes without a full reload. |
| `storage` | Remembers your toggle preferences (a small number of booleans) across browser restarts and across browser installations signed in to the same account. |
| `scripting` | Used to dynamically register the optional Universal tracking strip content script when you enable it (and unregister it when you disable it). |
| `contextMenus` | Registers the right-click "Copy clean URL" menu item. |
| `activeTab` | Lets the "Copy clean URL" menu briefly access the current tab — just long enough to write the cleaned URL to your clipboard — without needing broad host access. |
| **Optional**: access to all sites (`*://*/*`) | **Only requested if you enable the "Universal tracking strip" toggle in the popup.** That feature, when on, needs to run on every page so it can strip tracking parameters regardless of host. If you never enable the toggle, this permission is never requested and the extension never reads URLs on sites outside the per-site supported list. You can revoke this permission at any time from your browser's extension management page. |

## What changed in version 1.7.0

Version 1.7.0 introduced these changes worth calling out:

- Seven additional supported sites (LinkedIn, eBay, Etsy, Threads, Pinterest, Walmart, Target). Same per-site cleanup model as before — the extension only reads URLs on the per-site supported list.
- An **opt-in** Universal tracking strip feature. This is off by default. When you turn it on, the browser asks you to grant access to "all websites" — this is the standard permission warning for a content script that runs on every page. The extension's behavior with this permission is exactly the same as without it for every site that's already supported per-site (the URL cleanup happens), and on every other site the only thing the extension does is strip well-known tracking-param names (utm_*, gclid, fbclid, mc_cid, mc_eid, msclkid, igshid, mkt_tok, hsa_*, pk_*, and similar) from the URL in your address bar. It never reads page content. It never makes a network request. It collects no data. The complete list of stripped parameters is in `src/utm.js` in the source tree.
- A right-click **"Copy clean URL"** context menu. When you pick it, the extension reads the link URL (or current page URL) the menu was opened on, runs it through the per-site cleanup + the universal tracking strip, and writes the result to your clipboard. It does not store the URL, does not transmit it, does not record that you used the feature.
- An **Advanced settings** page (linked from the popup footer) for the Universal tracking strip. Two text fields: a list of domains to skip (the strip won't touch URLs on those hosts) and a list of param names to always keep (those names won't be stripped even when they otherwise would be). Both default to empty. The lists are stored in `chrome.storage.sync` (see "What the extension stores" above) and never leave your browser.

If you turn the Universal tracking strip toggle off, the optional permission is no longer needed for the feature to do nothing — but the permission stays granted at the browser level so re-enabling later doesn't re-prompt. You can revoke it explicitly from the browser's extension management page if you prefer.

## Changes to this policy

If the extension's behavior ever changes in a way that affects privacy, this policy will be updated and the version number in `manifest.json` will be incremented.

## Contact

For questions, file an issue at the project's GitHub repository: <https://github.com/Tommytwolegs/link-shortener>.

_Last updated: 2026-06-06 for v1.7.0._
