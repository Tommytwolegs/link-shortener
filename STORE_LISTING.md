# Chrome Web Store Listing Copy

Paste-ready text for the Chrome Web Store submission form. This file is for your reference only — it's not part of the extension itself.

---

## Name

Link Shortener

## Summary (132 chars max)

Cleans long Amazon, Agoda, Booking.com, Expedia, and Airbnb URLs — automatic address bar + one-click short-link toolbar.

## Category

Productivity

## Language

English

---

## Description (detailed — up to 16,000 chars)

Amazon, Agoda, Booking.com, Expedia, and Airbnb URLs are a mess. A link to a single product or hotel can be hundreds of characters of tracking IDs, session tokens, search-result breadcrumbs, and impression IDs. Link Shortener cleans them up automatically — and gives you a one-click way to share the short version.

🛒 AMAZON — AUTOMATIC

Every time you land on an Amazon product page, the extension rewrites the URL in your address bar to the shortest shareable form — just `amazon.com/dp/<product-id>`. It also rewrites every product link on the page, so right-click → Copy link address gives you the clean URL too, without having to open the product first. Sponsored-result wrappers (`/sspa/click?...&url=…`) and `/gp/slredirect/…` redirectors are unwrapped automatically.

🏨 AGODA, BOOKING.COM, EXPEDIA, AIRBNB — AUTOMATIC + ONE-CLICK

On a hotel or rental listing page, two things happen:

1. The address bar is cleaned up automatically. Tracking, session, search-id, and impression params are stripped, leaving just the listing URL plus your selected dates and occupancy. The page doesn't reload.
2. A small floating toolbar appears in the top-left corner with two copy buttons:
   • Share Property / Share Listing — copies the bare listing URL (no dates, no query string).
   • With Dates — copies the listing URL with check-in/check-out preserved. Disabled until you've actually picked dates.

Click a button, the link is on your clipboard, a brief "Copied!" confirmation appears. That's it.

🔧 ON ALL SUPPORTED SITES

• Master on/off toggle in the toolbar popup, with a visible "OFF" badge when disabled.
• Per-site toggles for Amazon, Agoda, Booking.com, Expedia, and Airbnb, so you can keep the extension on for the sites you care about and quiet for the rest.
• Your toggle preferences sync across Chrome installations via your Google account.
• Works on browser back/forward and in-page (single-page) navigations.

🌍 WORKS ACROSS REGIONAL DOMAINS

Amazon: amazon.com, .co.uk, .de, .fr, .it, .es, .nl, .se, .pl, .com.tr, .com.au, .co.jp, .in, .sg, .ae, .sa, .eg, .com.mx, .com.br, .ca, .com.be. A page on amazon.de stays on amazon.de — only the path is shortened.

Booking.com and Agoda each use a single global domain. Expedia and Airbnb are supported across their major regional TLDs (.com, .co.uk, .ca, .com.au, .de, .fr, .it, .es, .nl, .com.mx, .com.br, .co.jp, .com.sg, .co.in).

🔒 ZERO DATA COLLECTION

No analytics. No telemetry. No remote calls. The extension makes zero network requests. It stores up to six booleans in `chrome.storage.sync`: one for the master on/off toggle and one per supported site. That's it.

⚡ TINY AND FAST

The entire extension is a few hundred lines of JavaScript running entirely on your machine. The Amazon URL rewrite uses `history.replaceState`, so there's no reload and no flicker. The hotel-site toolbar uses a closed Shadow DOM so the host site's CSS can't touch it.

📖 OPEN SOURCE

Full source code and unit tests are available on GitHub: https://github.com/Tommytwolegs/link-shortener

---

## Single-purpose description

The extension shortens shareable URLs on five shopping/booking sites: it rewrites Amazon product URLs in the address bar and in-page links to the canonical amazon.com/dp/ASIN form, and on Agoda, Booking.com, Expedia, and Airbnb listing pages it cleans up the address bar to dates + occupancy only, and adds copy-to-clipboard buttons that produce short listing URLs.

---

## Permission justifications

**host_permissions (Amazon storefronts + agoda.com + booking.com + expedia regional TLDs + airbnb regional TLDs)**
Required so the content scripts can read and rewrite the URL of supported pages, and inject the copy-link toolbar on hotel/rental listing pages. The extension does not run on any other sites.

**webNavigation**
Used to detect in-page (single-page) navigations on all supported sites so URLs are also handled when the page changes without a full reload.

**storage**
Used to remember the user's master on/off toggle and per-site toggle preferences across browser sessions and Chrome installations signed in to the same Google account. Up to six booleans are stored.

---

## Data usage declarations

Check all "does not collect" boxes. The extension does not collect, transmit, or share any user data.

Privacy policy URL: https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md

---

## Screenshots to prepare (1280×800 recommended)

1. A long Amazon product URL in the address bar, then the shortened URL after the extension runs.
2. A Booking.com (or Agoda / Expedia / Airbnb) hotel page with the Link Shortener toolbar visible in the top-left, buttons labeled "Share Property" and "With Dates", plus the cleaned-up URL in the address bar.
3. The toolbar popup with the toggle ON ("On — cleaning Amazon, Agoda, Booking, Expedia & Airbnb links").
4. The toolbar popup with the toggle OFF, with the red OFF badge visible on the toolbar icon.

Optional:

5. A side-by-side: original long URL (copied from clipboard) vs. clean short URL.

## Promotional tile (440×280, optional)

Icon on left, "Link Shortener" text on right, brief tagline like "Clean Amazon, Agoda, Booking, Expedia & Airbnb URLs, automatically."
