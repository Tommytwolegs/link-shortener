# Jimothy's Link Shortener — Handoff

Context document for picking up work on a new machine (or in a new Claude
session). Last updated 2026-04-30 at v1.6.2.

---

## What this is

A Chrome MV3 (also published as Firefox MV3) extension that strips tracking
parameters from URLs on a fixed list of supported sites. Published on:

- **Chrome Web Store** as "Jimothy's Link Shortener" — currently shipping v1.6.0
  publicly; v1.6.2 update under review (the v1.6.1 update was rejected for
  "excessive keywords", and v1.6.2 is the cleanup of that). Owner account:
  tommydpowers@gmail.com.
- **Mozilla Add-ons (AMO)** — v1.6.2 xpi prepared and ready to submit; under
  developer account tied to a Firefox Account.

GitHub repo: <https://github.com/Tommytwolegs/link-shortener>.

Author: Thomas Powers. Extension ID (Firefox): `link-shortener@tommytwolegs.github.io`.

---

## Supported sites (12)

Each has a dedicated pure-function URL module under `src/`:

- **Amazon** — full ASIN + slug handling, in-page link rewriting, regional TLDs.
  Optional "Include Amazon item name" toggle preserves the product title slug.
- **Booking.com, Expedia, Airbnb, Agoda** — hotel/rental listings. Address-bar
  cleanup PLUS a floating toolbar with "Share Property" and "Share with Dates"
  copy buttons.
- **Facebook, Instagram** — combined `enabledSocial` toggle. Address-bar only.
  Includes `fb.watch` short links and `m.facebook.com` mobile.
- **YouTube** — keeps `?v=` and `?t=` only, drops `si`/`pp`/`feature`/`list`/
  etc. Covers `/watch`, `/shorts/`, `/live/`, `/embed/`, `/playlist`, `/clip/`,
  and `youtu.be` short form. `m.youtube.com` and `music.youtube.com` too.
- **Twitter/X** — `twitter.com`, `x.com`, and `mobile.twitter.com` all match.
  Cleans `/status/` URLs.
- **TikTok** — `/@user/video/`, `/@user/photo/`, `/t/`, plus `vm.tiktok.com`
  and `vt.tiktok.com` short links.
- **Reddit** — `/r/<sub>/comments/<id>/<slug>` and the newer `/r/<sub>/s/<short>`
  form. `redd.it` short links. `old.reddit.com` and `np.reddit.com` preserved.
- **Spotify** — `open.spotify.com` only. Cleans `/track/`, `/album/`,
  `/playlist/`, `/artist/`, `/episode/`, `/show/`, `/user/`, plus locale-prefixed
  paths (`/intl-de/`, `/intl-pt/`, etc.).

---

## Architecture

- `src/<site>.js` — pure URL functions for each site. Each exposes
  `is<Site>Host()`, `shortenUrl()`, `needsShortening()`, and a `STORAGE_KEY`
  constant. Dependency-free, runs in three contexts (content script via classic
  load, service-worker via importScripts, Node via `require()` for tests).
- `src/site-toolbar.js` — shared floating-toolbar implementation used by the
  four hotel sites. Closed Shadow DOM for style isolation. Auto-hides on
  viewports < 600px wide (handles Firefox Android + narrow desktop windows).
- `src/social-content.js` — dispatcher used by the seven social/media sites.
  Detects which `*LinkShortener` global the manifest loaded for the current
  tab, reads that module's `STORAGE_KEY` from chrome.storage.sync, gates the
  cleanup on that flag. No in-page link rewriting (unlike Amazon's).
- `src/content.js` — Amazon-specific content script. Rewrites address bar AND
  in-page anchor `href`s. Has a MutationObserver for SPA carousels/pagination.
  Second DOM-ready pass when `includeAmazonTitle` is enabled and the URL has
  no slug to extract.
- `src/background.js` — service worker (Chrome) / event page (Firefox). Pings
  content scripts on `webNavigation` history-state events. Reloads matching
  tabs on extension update. Renders the toolbar badge. Guards `importScripts()`
  behind `typeof importScripts === 'function'` so the same file works in both
  modes.
- `src/popup.html`/`popup.js`/`popup.css` — the toolbar popup. Master toggle,
  10 per-site toggles, plus two feature flags (hide travel popup, include
  Amazon item name).
- `tests/<site>.test.js` — dependency-free Node tests for each URL module.
  **584 total, all passing as of v1.6.2.** Run with `node tests/<file>.test.js`
  one at a time, or loop them.

---

## Build and ship

Two distribution targets share one source tree. `manifest.json` is the
Chrome-canonical manifest; the Firefox build injects extra fields at package time.

**On Windows (the platform you're moving to):**

```powershell
cd "<repo-root>"
.\package.ps1
```

Produces:
- `dist/link-shortener-<version>.zip` — upload to Chrome Web Store
- `dist/link-shortener-<version>.xpi` — upload to AMO

Uses Windows's built-in `Compress-Archive`. No need for zip, bash, or WSL.
First-run only: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**On macOS/Linux (or in Claude's sandbox):**

```bash
bash package.sh
```

Equivalent behavior. Requires `zip` and `python3`.

The Firefox build injects three things into the manifest:
1. `browser_specific_settings.gecko.id` (`link-shortener@tommytwolegs.github.io`)
2. `gecko.strict_min_version` (`121.0` — first Firefox with full MV3 SW support)
3. `gecko.data_collection_permissions.required = ["none"]` (AMO requirement
   added late 2024)
4. `background.scripts` array (Mozilla linter requires a fallback alongside
   `service_worker`)

The Chrome zip ships `manifest.json` byte-identical to what's on disk.

---

## Recent history (most-recent first)

- **v1.6.2 (current)** — Description rewritten to drop excessive brand keywords
  after Chrome Web Store rejected v1.6.1's update. The Web Store policy caps
  how many times brand names can appear; the previous long description named
  Amazon ~10 times and each social platform 2-3 times. Now each is mentioned
  once. New short description in manifest: "Cleans long URLs on shopping,
  travel, and social sites — strips tracking and gives you a clean shareable
  link." Full new long description in STORE_LISTING.md.

- **v1.6.1** — Three things in one release. (1) Mobile auto-hide for the
  floating travel toolbar (viewport < 600px hides it; resize listener rechecks).
  (2) Firefox AMO compliance: `background.scripts` fallback alongside
  `service_worker`, plus `importScripts` guarded behind `typeof` check.
  (3) Firefox AMO compliance: `data_collection_permissions: { required:
  ["none"] }` declared.

- **v1.6.0** — Added 5 new sites: YouTube, Twitter/X, TikTok, Reddit, Spotify.
  Each is a pure URL module sharing the `social-content.js` dispatcher.
  Combined "Facebook/Instagram" toggle preserved; new toggles per added site.
  204 new tests.

- **v1.5.0** — Added Facebook and Instagram. Pure URL modules + new
  `social-content.js` dispatcher. Combined `enabledSocial` toggle.

- **v1.4.0** — "Include Amazon item name" toggle. New `extractTitleSlug`,
  `extractSlug`, `slugifyTitle` helpers in asin.js. DOM-ready second pass in
  content.js when the URL doesn't already have a slug.

- **v1.3.4** — Fixed manifest description over 132-char limit; renamed
  extension to "Jimothy's Link Shortener" (was "Link Shortener" then briefly
  "Bickleson's Link Shortener").

- **v1.3.x** — Hide travel popup toggle. Orange logo bars. On-update tab reload
  so existing tabs pick up new content scripts after upgrade.

- **v1.3.0** — Per-site toggles.

- **v1.2.0** — Booking, Expedia, Airbnb added (Agoda was earlier).

- **v1.1.0** — Agoda.

- **v1.0.0** — Initial Amazon-only release.

---

## Things to know / gotchas

- **The Web Store has a strict "excessive keywords" rule.** Repeating brand
  names many times in the description is treated as spam. Be conservative:
  each supported site should appear once or twice in the long description, with
  Amazon getting a few extra mentions because it has unique features. URL
  examples that include domain names (`youtube.com`, `m.youtube.com`,
  `music.youtube.com`) also count toward the brand-mention total.

- **AMO requires `data_collection_permissions` to be explicitly declared.**
  We declare `"none"` since the extension makes zero network requests. This
  is handled automatically by the build script.

- **Firefox event-page mode vs service-worker mode.** Chrome runs background.js
  as a true service worker (`importScripts` available). Firefox runs it as an
  event page via the `scripts` array (no `importScripts`; modules load via the
  manifest list). The `typeof importScripts === 'function'` guard in
  background.js handles both cleanly. Don't remove it.

- **Mount-sync issues during builds.** Earlier in development (in Claude's
  sandbox) the Edit tool sometimes wrote files to disk truncated even though
  the tool reported success. Bash heredoc rewrites worked around this. On a
  real Windows machine with normal filesystem behavior this doesn't apply.

- **Permission justifications for store listings** are in STORE_LISTING.md. The
  one quirk worth noting: on Amazon, when "Include Amazon item name" is on,
  the extension reads `#productTitle` from the page to derive the slug. This
  is the only place we read page content beyond the URL itself. It's called out
  preemptively in the host_permissions justification so reviewers don't flag it.

- **The popup is getting long.** With 11 per-site toggles + 3 feature toggles
  the popup is taller than ideal. Future work could collapse sites into
  category groups (shopping / travel / social) with expandable sections, but
  it's fine for now.

---

## Open threads / wishlist

These came up in conversation but weren't built:

- **LinkedIn / eBay / Etsy / Threads / Pinterest** — second-tier shopping
  and social sites that have similar URL-cleanup value. Same pattern as the
  v1.6.0 additions; each is a ~50-line URL module plus tests, a toggle, and a
  manifest entry.

- **Universal UTM stripper** — a single optional toggle that strips
  `utm_*`, `gclid`, `fbclid`, `mc_cid`, `igshid`, etc. from EVERY URL on
  EVERY site. Bigger scope (host_permissions for `<all_urls>` or similar),
  bigger review burden, but potentially the highest-leverage feature
  available. Save for a v2.0.

- **Firefox Android testing.** The xpi should work on Firefox for Android
  (which supports MV3 extensions) but hasn't been physically tested. The
  mobile auto-hide for the travel toolbar was added for this case.

- **Edge Web Store** — uses the same zip as Chrome; just a separate listing
  submission.

- **README and PRIVACY.md** — haven't been kept rigorously in sync with the
  feature set. They mention the original five sites in places. Worth a
  refresh pass.

---

## Reference

- **Repo root** (current machine): `C:\Users\tommy\Documents\Link Shortener\Link Shortener Chrome Add On\`
- **Chrome Web Store dev console**: <https://chrome.google.com/webstore/devconsole/>
- **AMO developer hub**: <https://addons.mozilla.org/developers/>
- **GitHub**: <https://github.com/Tommytwolegs/link-shortener>
- **Privacy policy**: <https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md>

Author: Thomas Powers (tommydpowers@gmail.com).
