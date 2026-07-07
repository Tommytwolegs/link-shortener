# Chrome Web Store Listing Copy

Paste-ready text for the Chrome Web Store submission form. This file is for your reference only — it's not part of the extension itself. Last updated for v1.7.0 (added LinkedIn, eBay, Etsy, Threads, Pinterest, Walmart, Target, Substack, Bluesky, GitHub, Medium, Quora — 24 supported sites; added an opt-in Universal tracking strip that works on any site; added a right-click "Copy clean URL" context menu; added an Advanced settings page for the strip; reorganized the popup into collapsible category groups; moved `*://*/*` from required to optional host permission so the install-time prompt no longer asks for access to every site). Brand-name discipline tightened for v1.7.0: the public Chrome description now contains ZERO site brand names (the v1.6.2 "named once" rule still drew keyword-spam flags). Sites are described generically by category; the full list lives in the popup and on GitHub. AMO reviewer notes are exempt — they're private and reviewers want brand-by-brand detail.

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

Long URLs from shopping, travel, and social sites are stuffed with tracking IDs, session tokens, and search breadcrumbs — often hundreds of characters of clutter. Jimothy's Link Shortener strips it automatically, so the link in your address bar (and the one you copy to share) is the clean canonical form.

WHAT GETS CLEANED

More than sixty popular sites are supported — shopping, travel booking, social media, and entertainment platforms across every world region — each with hand-tuned rules for that site's URL structure. The full list is visible in the extension's popup and on the project page.

The cleanup is careful about what it keeps. Parameters that change what the recipient actually sees survive: product variant selections stay locked, playlist position is kept, comment deep-links still scroll to the right comment, video timestamps survive, and paywall gift links keep working. Only the tracking clutter goes.

HOW IT WORKS

Land on a supported page and the address-bar URL is rewritten to its canonical short form in place — no reload, no flicker. On the largest supported shopping site, in-page product links are rewritten too, so right-click → Copy link address also gives the clean form.

Right-click any link (or any page) and choose "Copy clean URL" to clean it on the spot — this works on every site, because the universal tracking-parameter stripper kicks in as a fallback.

On hotel and rental listing pages, a small floating widget offers one-click copy buttons: the bare listing URL, or the listing with your selected dates included. It hides itself automatically on small screens.

CONTROLS

A master toggle turns everything off instantly, with a visible OFF badge. Every site has its own toggle, organized into collapsible category groups that remember how you left them. An opt-in "Universal tracking strip" (off by default) extends cleanup to every site you visit — the browser asks you to grant the wider permission the first time you enable it, and you can revoke it at any time. An Advanced settings page lets you skip chosen domains or always keep chosen parameters. All preferences sync across your browser installs.

ZERO DATA COLLECTION

No analytics, no telemetry, no network requests of any kind. The only thing stored is your toggle settings. Nothing ever leaves your browser.

OPEN SOURCE

Plain, dependency-free JavaScript with 2,694 unit tests: https://github.com/Tommytwolegs/link-shortener

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

### v1.8.0 (THE next submission, once v1.7.0 clears review — all interim dev versions folded in)

v1.8.0 — the everywhere release.

* Dozens of new sites supported (eighty-plus total, up from twenty-four): international marketplaces and classifieds across Asia, Europe, and Latin America; more travel booking sites; streaming, gaming, music, film, books, and Q&A platforms; plus a news pack covering more than fifty outlets across every region — each with its own toggle.
* Functional state always survives cleanup: variant and size selections, playlist and queue context, video timestamps, answer pagination, private-server invites, and paywall gift links all keep working. Only tracking clutter is removed.
* The popup is organized by world region — Global, Americas, Asia-Pacific, Europe — with site-type subheadings, and remembers which sections you keep open.
* This update requests access to the newly supported sites; as always the extension makes zero network requests and collects nothing.

Reminder for the v1.8.0 AMO notes: 121 sites (119 toggles) / 332 host permissions / 2,694 tests; the extension is unchanged architecturally — every module is a pure URL function.

Older draft notes below were written while this work was tagged 1.9–1.11 during development; they're folded into the single 1.8.0 submission above.

#### (dev notes, folded in)

* Fifteen more sites supported (sixty-three total): major home-goods and electronics retailers, independent music and film-diary platforms, the world's biggest travel-review site, and the leading marketplaces and classifieds of France, Germany, Spain, the Netherlands, Poland, India, China, and Southeast Asia.
* As always, functional state survives: variant and size selections, item identity, and review pagination are preserved while share tokens and click-path attribution are stripped.

Reminder for the v1.11.0 AMO notes: 63 sites / 264 host permissions / 2,427 tests; 15 new modules (wayfair, bestbuy, bandcamp, letterboxd, tripadvisor, meesho, carousell, taobao, jd, leboncoin, olx, wallapop, marktplaats, kleinanzeigen, zalando).

#### (dev notes, folded in — formerly 1.10.0)

v1.10.0 — media & entertainment expansion.

* Eight more sites supported (forty-seven total) across music, video, gaming, film, books, and Q&A — the everyday "let me send you this" links.
* Functional state survives as always: video timestamps, track deep-links within albums, and playlist context are preserved; share tokens, click-path breadcrumbs, and affiliate tags are stripped. On one Q&A network, the share button embeds the sharer's user id in the link path itself — that's now removed too.
* The Global category now has separate Social and Media & entertainment sections.

Reminder for the v1.10.0 AMO notes: 47 sites / 205 host permissions / 2,163 tests; new modules steam, imdb, stackoverflow, wikipedia, goodreads, soundcloud, applemusic, twitch.

#### (dev notes, folded in — formerly 1.9.0)

v1.9.0 — regional expansion, round two.

* Seven more sites supported (thirty-nine total), including major marketplaces in Korea, India, Indonesia, Japan, and Europe, plus another vacation-rental booking site (which gets the floating copy-link widget).
* The popup is now organized by world region — Global, Americas, Asia-Pacific, Europe — with site-type subheadings inside each group, so the growing site list stays navigable.
* Variant and option selections survive cleanup on the new sites, consistent with everywhere else.

Reminder for the v1.9.0 AMO notes: 39 sites / 192 host permissions / 1,935 tests; new modules coupang, flipkart, tokopedia, mercari, vinted, allegro, vrbo (vrbo uses the travel toolbar).

#### (dev notes, folded in — formerly 1.8.0-dev)

v1.8.0 — international expansion.

* Eight new sites supported (thirty-two total), with a new "International shopping" section in the popup: six major international marketplaces and two more travel booking sites (which get the floating copy-link widget).
* Variant selections and SKU choices survive cleanup on the new sites, same as everywhere else.
* One of the new marketplaces hides its tracking in the URL fragment rather than the query string — cleanup handles that too.
* Popup now has four collapsible categories: Shopping, International shopping, Travel, Social & media.

Reminder for the v1.8.0 AMO notes: update counts to 32 sites / 164 host permissions / 1,756 tests, and mention the new modules (shopee, lazada, aliexpress, temu, mercadolibre, rakuten, trip, hotelscom — the last two use the travel toolbar).

### v1.7.0 (as submitted)

v1.7.0 — major release.

* Twelve new sites supported, bringing the total to twenty-four. Each new site has its own per-site toggle in the popup.
* Smarter about what to keep: variant selections, playlist position, comment deep-links, video timestamps, and paywall gift links all survive cleanup on the sites that use them.
* New "Universal tracking strip" feature (off by default, opt-in): strips utm_*, gclid, fbclid, and other common trackers from URLs on every site you visit. The first time you enable it, your browser asks permission to access all sites — decline and the feature stays off.
* New right-click "Copy clean URL" menu: works on any link or on the current page. Runs the URL through every supported per-site cleanup plus a fallback tracker strip, then writes the result to your clipboard.
* New Advanced settings page (linked from the popup): configure per-site exceptions for the Universal tracking strip — skip specific domains, or keep specific parameters that would otherwise be stripped.
* Popup redesigned: per-site toggles grouped into collapsible Shopping / Travel / Social & media sections with live counts that remember how you left them. Smarter status text. Respects prefers-reduced-motion.
* Install-time permission prompt is now smaller: the all-sites access is no longer requested up front, only when you turn on the universal tracking strip.
* Fixed: in-page cleanup now preserves the URL parameters modern sites use for in-page state (modal/lightbox routes, photo carousels, variant selectors, queue context, comment deep-links, playlist position). Previously these were being stripped within a second of opening, which caused some modals to flash open then close and some on-page state to be lost.
* Fixed: in-page anchor links on shopping sites no longer reload the page; review-filter links route to the right place; URL fragments are preserved on hotel-site listing pages; observers disconnect when the extension is toggled off; URL polling pauses when the tab is in the background.
* Fixed: the in-page cleanup dispatcher was previously missing several newly added sites, so their per-site toggles silently did nothing. Now wired up correctly.

---

## AMO (Firefox) reviewer notes — paste into "Notes to reviewer"

(2,066 chars — AMO's field caps at ~3,000. This is the version submitted with v1.7.0.)

Jimothy's Link Shortener v1.7.0.

WHAT IT DOES: Cleans long URLs on a fixed list of 24 shopping/travel/social sites (full list = manifest host_permissions) by rewriting the address bar via history.replaceState. Hotel sites get a Shadow-DOM copy-link widget. Right-click "Copy clean URL" menu. Opt-in "Universal tracking strip" removes utm_*/gclid/fbclid etc. on any site, only after the user grants an optional host permission.

PERMISSIONS:
- host_permissions (128 entries): the fixed per-site list — the only sites per-site cleanup touches.
- optional_host_permissions ["*://*/*"]: NOT requested at install; requested via permissions.request when the user enables the Universal strip toggle. Declining reverts the toggle; permissions.onRemoved disables the feature on revoke.
- webNavigation: detect SPA navigations. storage: settings sync. scripting: register the strip script after grant + inject clipboard-write for the menu. contextMenus/activeTab: the menu item + its clipboard write without broad host access.

NO NETWORK / NO DATA / NO REMOTE CODE: Zero network requests of any kind; all logic is pure URL string manipulation in src/. data_collection_permissions=["none"]. Only settings persist in storage.sync (toggles, two user-typed lists, popup group state). No eval/Function; all JS ships in the xpi.

REPRODUCIBLE BUILD: https://github.com/Tommytwolegs/link-shortener (repo root = extension root). Check out tag v1.7.0, run `bash package.sh`; output is dist/link-shortener-1.7.0.xpi. Zero npm deps. 1545 unit tests: for t in tests/*.test.js; do node "$t"; done

CHANGED FROM v1.6.3: 12 new site modules; opt-in universal strip + Advanced options page (skip-domains/keep-params); right-click menu; popup category groups; SPA-state fixes — params sites use for in-page state (modals, carousels, variant selectors, comment deep-links, e.g. Medium ?sk= gift-link key, Target ?preselect=) are now kept.

GECKO: id link-shortener@tommytwolegs.github.io; strict_min_version 121.0; background.scripts fallback provided, URL modules load before background.js.

---

## Microsoft Edge Add-ons (Partner Center)

Edge uses the SAME zip as the Chrome Web Store — `dist/link-shortener-<version>.zip`. No
manifest changes needed (Edge is Chromium; `minimum_chrome_version` is honored).

- Submit at: https://partner.microsoft.com/dashboard/microsoftedge/
- A (free) Partner Center account is required the first time.
- Reuse the long description, single-purpose description, and permission
  justifications above verbatim — Edge's form fields mirror Chrome's.
- Edge also asks for a privacy policy URL — use the same one:
  https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md
- Edge review historically takes a few business days; there is no equivalent
  of Chrome's "excessive keywords" rejection on record, but keep the brand
  discipline anyway (the same description ships everywhere).

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
