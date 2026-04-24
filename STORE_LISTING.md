# Chrome Web Store Listing Copy

Paste-ready text for the Chrome Web Store submission form. This file is for your reference only — it's not part of the extension itself.

---

## Name

Amazon Link Shortener

## Summary (132 chars max)

Rewrites long Amazon product URLs — in your address bar and in links on the page — to the clean amazon.com/dp/ASIN form.

## Category

Productivity

## Language

English

---

## Description (detailed — up to 16,000 chars)

Amazon product URLs are a mess. A link to a single item can be 200+ characters long, full of tracking parameters, affiliate tags, search breadcrumbs, and a title slug nobody needs. Amazon Link Shortener fixes that.

Every time you land on an Amazon product page, the extension rewrites the URL in your address bar to the shortest shareable form — just `amazon.com/dp/<product-id>`. It also rewrites every product link on the page, so right-click → Copy link address gives you the clean URL too, without having to open the product first. No clicks, no popup, no clipboard hijacking.

🛒 WHAT IT DOES

• Automatically rewrites the address bar to `amazon.com/dp/ASIN` the moment a page loads.
• Rewrites every product link on the page, including links added dynamically by carousels, search pagination, and SPA transitions.
• Works on browser back/forward and in-page (single-page) navigations.
• One-click on/off toggle in the toolbar popup, with a visible "OFF" badge when disabled.
• Your toggle preference syncs across Chrome installations via your Google account.

🌍 WORKS ON ALL AMAZON STOREFRONTS

amazon.com, .co.uk, .de, .fr, .it, .es, .nl, .se, .pl, .com.tr, .com.au, .co.jp, .in, .sg, .ae, .sa, .eg, .com.mx, .com.br, .ca, .com.be. A page on amazon.de stays on amazon.de — only the path is shortened.

🧹 STRIPS EVERYTHING

Affiliate tags, referral parameters, search-result breadcrumbs, language paths — all gone. What's left is the canonical link that every Amazon URL eventually resolves to.

🔒 ZERO DATA COLLECTION

No analytics. No telemetry. No remote calls. The extension makes zero network requests. It stores one thing in `chrome.storage.sync`: a single boolean for your on/off toggle. That's it.

⚡ TINY AND FAST

The entire extension is a couple hundred lines of JavaScript running entirely on your machine. The URL rewrite uses `history.replaceState`, so there's no reload and no flicker.

📖 OPEN SOURCE

Full source code and unit tests are available on GitHub: https://github.com/Tommytwolegs/link-shortener

---

## Single-purpose description

The extension rewrites Amazon product URLs in the active tab's address bar to the canonical amazon.com/dp/ASIN form.

---

## Permission justifications

**host_permissions (Amazon storefronts)**
Required so the content script can read and rewrite the URL of Amazon product pages. The extension does not run on any non-Amazon site.

**webNavigation**
Used to detect in-page (single-page) navigations on Amazon so URLs are also cleaned up when the page changes without a full reload.

**storage**
Used to remember the user's on/off toggle preference across browser sessions and Chrome installations signed in to the same Google account. A single boolean is stored.

---

## Data usage declarations

Check all "does not collect" boxes. The extension does not collect, transmit, or share any user data.

Privacy policy URL: https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md

---

## Screenshots to prepare (1280×800 recommended)

1. A long Amazon product URL in the address bar, then the shortened URL after the extension runs.
2. The toolbar popup with the toggle ON ("On — cleaning Amazon URLs").
3. The toolbar popup with the toggle OFF, with the red OFF badge visible on the toolbar icon.

Optional:

4. A side-by-side: original long URL (copied from clipboard) vs. clean short URL.

## Promotional tile (440×280, optional)

Icon on left, "Amazon Link Shortener" text on right, brief tagline like "Clean Amazon URLs, automatically."
