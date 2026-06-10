# Chrome Web Store Listing Copy

Paste-ready text for the Chrome Web Store submission form. This file is for your reference only — it's not part of the extension itself. Last updated for v1.7.0 (added LinkedIn, eBay, Etsy, Threads, Pinterest, Walmart, Target; added an opt-in Universal tracking strip that works on any site; added a right-click "Copy clean URL" context menu; added an Advanced settings page for the strip; reorganized the popup into collapsible category groups; moved `*://*/*` from required to optional host permission so the install-time prompt no longer asks for access to every site). Brand-name discipline preserved from the v1.6.2 rewrite — each supported site is named exactly once in the long description except Amazon, which gets a few extra mentions because it has unique features.

**Important for v1.7.0 submission:** the install-time permission prompt is now minimal — only the fixed per-site host list is required. The Universal tracking strip's `*://*/*` access is requested at runtime, the first time the user enables the toggle, via `chrome.permissions.request`. The `contextMenus` + `activeTab` permissions are required for the new "Copy clean URL" right-click menu. See "Permission justifications" below.

---

## Name

Jimothy's Link Shortener

## Summary (132 chars max)

Cleans long URLs on shopping, travel, and social sites — strips tracking and gives you a clean shareable link.

## Category

Productivity

## Language

English

---

## Description (detailed — up to 16,000 chars)

Long URLs from popular shopping, travel, and social sites are full of tracking IDs, session tokens, and search-result breadcrumbs — easily hundreds of characters of clutter. Jimothy's Link Shortener strips it automatically, so what stays in your address bar (and what you copy to share) is the clean canonical form.

WHAT GETS SHORTENED

The extension cleans URLs on Amazon, eBay, Etsy, Walmart, Target, Booking, Expedia, Airbnb, Agoda, Facebook, Instagram, Threads, LinkedIn, YouTube, Twitter/X, TikTok, Reddit, Pinterest, and Spotify.

HOW IT WORKS

Land on a supported page and the URL in your address bar is rewritten to its canonical short form via history.replaceState — no reload, no flicker. Right-click → Copy link address on Amazon gives you the clean URL too, since in-page product links are also rewritten.

Right-click any link (or any page) and choose "Copy clean URL" to copy a cleaned version on the spot — works even on sites the extension doesn't auto-clean, because the universal tracking-param stripper kicks in as a fallback.

On hotel and rental listing pages, an unobtrusive floating widget appears with one-click copy buttons: one copies the bare listing URL, another copies it with your selected dates included. On phone-sized viewports the widget hides itself automatically.

On every other supported site, only the address bar is cleaned — no overlay, no UI on the page.

CONTROLS

A master on/off toggle puts the extension to sleep instantly with a visible "OFF" badge. Per-site toggles let you disable any site individually, grouped into collapsible Shopping / Travel / Social & media sections. A toggle controls whether the cleaned Amazon URL is the bare canonical form or includes the human-readable product title slug. A toggle hides the floating travel widget without disabling URL cleanup. An optional "Universal tracking strip" toggle (off by default) extends in-place cleanup to every site you visit, stripping common tracking parameters regardless of host — the first time you enable it, the browser prompts you to grant the broader permission, and you can revoke that permission at any time from the browser's extension settings. An Advanced settings page (linked from the popup footer) lets power users skip specific domains or keep specific parameters that would otherwise be stripped. All preferences sync across your browser installs.

ZERO DATA COLLECTION

No analytics, no telemetry, no remote calls. The extension makes zero network requests. The only thing it stores is a handful of booleans for your toggle preferences. Nothing ever leaves your browser.

TINY AND FAST

A few thousand lines of plain hand-written JavaScript running entirely on your machine. The travel-site widget lives in a closed Shadow DOM so the host page can't see or restyle it. The popup respects prefers-reduced-motion and prefers-color-scheme.

OPEN SOURCE

Source code and 1286 unit tests at https://github.com/Tommytwolegs/link-shortener

---

## Single-purpose description

The extension cleans up shareable URLs on a fixed list of supported shopping, travel, and social sites by stripping tracking parameters and unnecessary path components from the address bar (and from in-page links on Amazon). It also provides a right-click "Copy clean URL" menu for one-off cleanup, and an opt-in feature that strips common tracking parameters on every site. On hotel and rental listing pages it additionally adds copy-to-clipboard buttons for the cleaned URL. The extension does not collect, transmit, or share any user data.

---

## Permission justifications

**host_permissions for the per-site list**
Required so the content scripts can read and rewrite the URL of supported pages, and on hotel/rental sites, inject the copy-link toolbar. The extension does not run on any other sites for the per-site cleanup and never reads page content beyond the URL itself (with one narrow exception: on Amazon product pages, when the user has opted in to "Include Amazon item name", the extension reads the product title from the page's #productTitle element so it can build the slug-form URL).

**optional_host_permissions for `*://*/*` (Universal tracking strip)**
The "Universal tracking strip" feature requires content-script access to every http(s) page so it can strip common tracking parameters (utm_*, gclid, fbclid, mc_cid, msclkid, etc.) from the address bar regardless of host. This is declared as an *optional* permission — it is NOT requested at install time. The user must explicitly enable the toggle in the popup, which triggers `chrome.permissions.request({ origins: ['*://*/*'] })` — a browser-rendered prompt the user must accept. If the user declines, the toggle reverts to off and no permission is granted. The script reads ONLY the URL — never any page content — and makes ZERO network requests. The list of params we strip is in src/utm.js (a fixed allowlist of well-known tracking-param names and prefixes; nothing else). The user can revoke the permission at any time from the browser's extension settings; the extension listens for `chrome.permissions.onRemoved` and disables the feature automatically when that happens.

**webNavigation**
Used to detect in-page (single-page) navigations on supported sites so URLs are also handled when the page changes without a full reload — common on the social and media sites, which heavily use history.pushState.

**storage**
Used to remember the user's master on/off toggle, per-site toggle preferences, and the feature flags (hide travel popup, include Amazon title, universal tracking strip) across browser sessions and Chrome installations signed in to the same Google account.

**scripting**
Used to dynamically register the universal tracking-strip content script (`src/utm-content.js`) once the user has both enabled the toggle AND granted the optional `*://*/*` permission. Also used by the right-click context menu to inject a tiny clipboard-write function into the active tab when the user picks "Copy clean URL".

**contextMenus**
Used to register the right-click "Copy clean URL" menu item that appears on both links and the page itself.

**activeTab**
Used by the right-click "Copy clean URL" menu so the extension can briefly access the current tab — just long enough to write the cleaned URL to the clipboard — without needing broad host permissions for every site the user happens to be on.

---

## Data usage declarations

Check all "does not collect" boxes. The extension does not collect, transmit, or share any user data.

Privacy policy URL: https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md

---

## Chrome Web Store "What's new in this version?" (release notes)

v1.7.0 — major polish release.

* Seven new sites supported, bringing the total to nineteen. Each new site has its own per-site toggle in the popup.
* New "Universal tracking strip" feature (off by default, opt-in): strips utm_*, gclid, fbclid, and other common trackers from URLs on every site you visit. The first time you enable it, your browser asks permission to access all sites — decline and the feature stays off.
* New right-click "Copy clean URL" menu: works on any link or on the current page. Runs the URL through every supported per-site cleanup plus a fallback tracker strip, then writes the result to your clipboard.
* New Advanced settings page (linked from the popup): configure per-site exceptions for the Universal tracking strip — skip specific domains, or keep specific parameters that would otherwise be stripped.
* Popup redesigned: per-site toggles grouped into collapsible Shopping / Travel / Social & media sections with live counts. Smarter status text. Respects prefers-reduced-motion.
* Install-time permission prompt is now smaller: the all-sites access is no longer requested up front, only when you turn on the universal tracking strip.
* Fixed: in-page cleanup now preserves the URL parameters modern sites use for in-page state (modal/lightbox routes, photo carousels, variant selectors, queue context, comment deep-links, playlist position). Previously these were being stripped within a second of opening, which caused some modals to flash open then close and some on-page state to be lost.
* Fixed: in-page anchor links on shopping sites no longer reload the page; review-filter links route to the right place; URL fragments are preserved on hotel-site listing pages; observers disconnect when the extension is toggled off; URL polling pauses when the tab is in the background.
* Fixed: the in-page cleanup dispatcher was previously missing the seven sites added in v1.7.0, so their per-site toggles silently did nothing. Now wired up correctly.

---

## AMO (Firefox) reviewer notes — paste into "Notes to reviewer"

Jimothy's Link Shortener v1.7.0 — Firefox xpi submission.

WHAT THE ADDON DOES
Cleans up long URLs on a fixed list of 17 shopping, travel, and social sites (Amazon, eBay, Etsy, Booking, Expedia, Airbnb, Agoda, Facebook, Instagram, Threads, LinkedIn, YouTube, Twitter/X, TikTok, Reddit, Pinterest, Spotify). Rewrites the address-bar URL in place via history.replaceState. On hotel sites, injects a Shadow-DOM copy-link widget. Provides a right-click "Copy clean URL" context menu. Opt-in "Universal tracking strip" feature strips common tracking params (utm_*, gclid, fbclid, etc.) on every site after the user grants an optional host permission.

PERMISSION SUMMARY
* host_permissions: per-site list (Amazon stores, Booking, Expedia, Airbnb, Agoda, Facebook, Instagram, Threads, LinkedIn, YouTube, Twitter, TikTok, Reddit, Pinterest, Spotify, eBay markets, Etsy). 119 entries total. Required at install — these are the only sites the per-site cleanup touches.
* optional_host_permissions: ["*://*/*"]. NOT requested at install. Requested at runtime via browser.permissions.request when the user turns on the "Universal tracking strip" toggle in the popup. If declined, the toggle reverts off and no access is granted. Listens for permissions.onRemoved and disables the feature if the user later revokes.
* webNavigation: detect SPA navigations on supported sites.
* storage: remember toggle preferences (chrome.storage.sync).
* scripting: dynamically register the universal-strip content script after permission is granted; inject a clipboard-write function for the context menu.
* contextMenus: register the "Copy clean URL" menu item.
* activeTab: used by the context menu so the clipboard write can target the current tab without broad host permissions.

NO NETWORK REQUESTS
The extension makes zero network requests. No fetch, no XHR, no WebSocket, no remote scripts. All cleanup logic is pure URL string manipulation in src/asin.js, src/agoda.js, src/booking.js, src/expedia.js, src/airbnb.js, src/facebook.js, src/instagram.js, src/threads.js, src/linkedin.js, src/youtube.js, src/twitter.js, src/tiktok.js, src/reddit.js, src/pinterest.js, src/spotify.js, src/ebay.js, src/etsy.js, and src/utm.js.

NO DATA COLLECTED
data_collection_permissions.required = ["none"]. The only thing persisted is a small set of booleans in chrome.storage.sync recording the user's toggle preferences.

NO REMOTE CODE
No eval, no Function constructor, no remote script loading, no innerHTML on user-controlled data. All JS is shipped inside the xpi. No CDNs.

BUILD REPRODUCIBILITY
Built with package.sh from the same source tree at https://github.com/Tommytwolegs/link-shortener (tag v1.7.0). Zero npm dependencies — pure hand-written JS. To reproduce: clone the repo (the repo root is the extension root), check out tag v1.7.0, and run `bash package.sh`. The script parse-checks every src/*.js with `node --check` before zipping (guardrail added after v1.6.3 shipped truncated content.js). Output is dist/link-shortener-1.7.0.xpi. 1286 unit tests across 20 files in tests/, runnable with `for t in tests/*.test.js; do node "$t"; done`.

CHANGED FROM v1.6.3
- Seven new site modules: linkedin, ebay, etsy, threads, pinterest, walmart, target.
- New utm.js + utm-content.js for the opt-in Universal tracking strip (35+ tracker families). *://*/* is OPTIONAL — requested at runtime via permissions.request, not at install.
- New contextMenus + activeTab for the right-click "Copy clean URL" menu.
- New options page (chrome.runtime.openOptionsPage) for an advanced-settings page where users configure: domains the Universal strip should skip, and tracker params to always preserve.
- Popup reorganized into collapsible Shopping/Travel/Social & media category groups with live counts. Smarter status text. prefers-reduced-motion respected.
- Modal & SPA-state preservation: address-bar cleanup now respects URL params each site uses for in-page state on supported sites. Airbnb (?modal=), Instagram (?img_index=), Amazon (?th=1 & psc=1), Spotify (?context=), Reddit (?context=N on comment permalinks), LinkedIn (?commentUrn= & replyUrn= on /feed/update/), YouTube (?list= & index= on /watch and /playlist), Facebook (?comment_id= & reply_comment_id= on comment-thread URLs). Without these, modals were closing immediately after opening and slide/variant state was being lost.
- Several other bug fixes: Amazon anchor preservation, Amazon star-filter canonicalization, observer disconnect on toggle-off, polling pause when tab hidden, URL fragment preservation on Booking/Expedia/Agoda, social-content.js dispatcher missing 7 namespaces (caused per-site toggles for new sites to silently do nothing — now fixed).

GECKO SETTINGS
browser_specific_settings.gecko.id = link-shortener@tommytwolegs.github.io
browser_specific_settings.gecko.strict_min_version = 121.0 (needed for chrome.scripting.registerContentScripts and other MV3 APIs)
A background.scripts array is provided alongside service_worker because Firefox 121 still uses the event-page fallback. All URL modules are listed in load order before background.js.

---

## Screenshots to prepare (1280×800 recommended)

1. A long shopping-site URL in the address bar, then the shortened URL after the extension runs (before/after pair).
2. A travel listing page with the Link Shortener toolbar visible in the top-left, buttons labeled "Share Property" and "With Dates", plus the cleaned-up URL in the address bar.
3. The toolbar popup with the master toggle ON, showing the per-site list of supported sites and the feature toggles.
4. A long social/media URL before/after — long form with tracking parameters vs. clean canonical form.
5. The new right-click "Copy clean URL" menu item visible on a context menu over a link.

Optional:

6. The toolbar popup with the toggle OFF, with the red OFF badge visible on the toolbar icon.
7. A second before/after pair from a different supported site.

## Promotional tile (440×280)

The bundled tile in icons/promo-tile-440x280.png covers the navy/teal gradient background + orange-bar icon + "Jimothy's Link Shortener" title + tagline format the store recommends.
