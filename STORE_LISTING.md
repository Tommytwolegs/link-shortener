# Chrome Web Store Listing Copy

Paste-ready text for the Chrome Web Store submission form. This file is for your reference only — it's not part of the extension itself. Last updated for v1.6.2 (rewrote summary + description to satisfy the Web Store's "excessive keywords" / spam policy after the v1.6.1 update was rejected for naming brand sites too many times).

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

The extension cleans URLs on Amazon, Booking, Expedia, Airbnb, Agoda, Facebook, Instagram, YouTube, Twitter/X, TikTok, Reddit, and Spotify.

HOW IT WORKS

Land on a supported page and the URL in your address bar is rewritten to its canonical short form via history.replaceState — no reload, no flicker. Right-click → Copy link address on Amazon gives you the clean URL too, since in-page product links are also rewritten.

On hotel and rental listing pages, an unobtrusive floating widget appears with one-click copy buttons: one copies the bare listing URL, another copies it with your selected dates included. On phone-sized viewports the widget hides itself automatically.

On every other supported site, only the address bar is cleaned — no overlay, no UI on the page.

CONTROLS

A master on/off toggle puts the extension to sleep instantly with a visible "OFF" badge. Per-site toggles let you disable any site individually. A second toggle controls whether the cleaned Amazon URL is the bare canonical form or includes the human-readable product title slug. A third toggle hides the floating travel widget without disabling URL cleanup. All preferences sync across your browser installs.

ZERO DATA COLLECTION

No analytics, no telemetry, no remote calls. The extension makes zero network requests. The only thing it stores is a handful of booleans for your toggle preferences. Nothing ever leaves your browser.

TINY AND FAST

About a thousand lines of plain hand-written JavaScript running entirely on your machine. The travel-site widget lives in a closed Shadow DOM so the host page can't see or restyle it.

OPEN SOURCE

Source code and 584 unit tests at https://github.com/Tommytwolegs/link-shortener

---

## Single-purpose description

The extension cleans up shareable URLs on a fixed list of supported shopping, travel, and social sites by stripping tracking parameters and unnecessary path components from the address bar (and from in-page links on Amazon). On hotel and rental listing pages it additionally adds copy-to-clipboard buttons for the cleaned URL. The extension does not collect, transmit, or share any user data.

---

## Permission justifications

**host_permissions (all listed hosts)**
Required so the content scripts can read and rewrite the URL of supported pages, and on hotel/rental sites, inject the copy-link toolbar. The extension does not run on any other sites and never reads page content beyond the URL itself (with one narrow exception: on Amazon product pages, when the user has opted in to "Include Amazon item name", the extension reads the product title from the page's #productTitle element so it can build the slug-form URL).

**webNavigation**
Used to detect in-page (single-page) navigations on supported sites so URLs are also handled when the page changes without a full reload — common on the social and media sites, which heavily use history.pushState.

**storage**
Used to remember the user's master on/off toggle, per-site toggle preferences, and the two feature flags (hide travel popup, include Amazon title) across browser sessions and Chrome installations signed in to the same Google account.

---

## Data usage declarations

Check all "does not collect" boxes. The extension does not collect, transmit, or share any user data.

Privacy policy URL: https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md

---

## Screenshots to prepare (1280×800 recommended)

1. A long shopping-site URL in the address bar, then the shortened URL after the extension runs (before/after pair).
2. A travel listing page with the Link Shortener toolbar visible in the top-left, buttons labeled "Share Property" and "With Dates", plus the cleaned-up URL in the address bar.
3. The toolbar popup with the master toggle ON, showing the per-site list of supported sites and the feature toggles.
4. A long social/media URL before/after — long form with tracking parameters vs. clean canonical form.

Optional:

5. The toolbar popup with the toggle OFF, with the red OFF badge visible on the toolbar icon.
6. A second before/after pair from a different supported site.

## Promotional tile (440×280)

The bundled tile in icons/promo-tile-440x280.png covers the navy/teal gradient background + orange-bar icon + "Jimothy's Link Shortener" title + tagline format the store recommends.
