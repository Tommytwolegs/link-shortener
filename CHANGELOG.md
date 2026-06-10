# Changelog

All notable changes to Jimothy's Link Shortener. Versions follow
[Semantic Versioning](https://semver.org/) loosely — minor bumps mark new
features, patch bumps mark bug-fix-only releases.

## [1.7.0] — 2026-05-29

### Added
- **5 new supported sites**: LinkedIn, eBay, Etsy, Threads, Pinterest. Each
  has its own toggle in the popup.
  - LinkedIn: `/posts/`, `/feed/update/urn:li:...`, `/pulse/`, `/jobs/view/`,
    `/events/`.
  - eBay: `/itm/<id>` and `/itm/<title>/<id>` both fold to `/itm/<id>`.
    Preserves the variation selector (`?var=`); supports 19 regional TLDs.
  - Etsy: `/listing/<id>/<slug>` with optional locale prefix preserved.
  - Threads: `/@user/post/<id>` on both `threads.net` and `threads.com`.
  - Pinterest: `/pin/<id>/` and `pin.it/<short>` short links.
- **Universal tracking strip** (off by default) — an opt-in toggle that
  strips well-known tracking parameters (utm_*, gclid, fbclid, mc_cid,
  msclkid, igshid, mkt_tok, _hsenc, hsa_*, pk_*, ml_subscriber, _kx,
  vero_id, irclickid, and others — full list in `src/utm.js`) from the
  address bar on every http(s) page. Requires the optional `*://*/*` host
  permission, which is requested only when you flip the toggle on. If you
  never turn it on, the broad permission is never requested.
- **Popup reorganization**: per-site toggles are now grouped into
  collapsible Shopping / Travel / Social & media sections (with the
  Shopping group expanded by default), each summary showing "N of M on".
- **2 more supported sites**: Walmart, Target. Both follow the Etsy
  pattern (path stays canonical, site-specific tracking stripped). The
  supported-site list is now 19.
- **Expanded universal tracker list** — 30+ new params and 5 new
  prefix families added to `utm.js`. Notable additions: TikTok Ads
  (`ttclid`), LinkedIn (`li_fat_id`, `trk`), Pinterest (`epik`),
  Snapchat (`ScCid`), Reddit Ads (`rdt_cid`), Branch.io
  (`_branch_match_id`), Bing Clarity (`msockid`), Klaviyo email
  (`_ke`), ConvertKit (`ck_subscriber_id`), Drip (`__s`), Bronto
  (`_bta_tid`/`_bta_c`), ExactTarget (`et_cid`/`et_rid`), Google Search
  (`gad_source`/`gad`), Facebook action params (`fb_action_ids`,
  `fb_action_types`, `fb_ref`, `fb_source`), Rakuten/AWIN/ShareASale/
  Refersion/TradeDoubler affiliate IDs. New prefix families: `mtm_`,
  `matomo_`, `_bsft_`, `iterable_`, `mailgun_`.
- **Advanced settings page** (`chrome://extensions` -> Options, or
  "Advanced" link in the popup footer). Two configurable lists for the
  Universal tracking strip: "Skip these domains" (host suffix match,
  use `.example.com` for subdomains) and "Always keep these
  parameters" (e.g. `utm_source` if a particular workflow needs it).
  Settings sync across browser installs via `chrome.storage.sync`.
- **Build-time parse-check guardrail**: every `src/*.js` file is run
  through `node --check` before packaging, so a truncated or malformed
  file fails the build instead of shipping. Both `package.sh` and
  `package.ps1`.
- **Right-click "Copy clean URL" context menu**: works on links and
  pages. Tries every per-site shortener, then strips tracking params
  as a fallback, then writes the result to the clipboard. Uses
  `contextMenus` + `activeTab` so it doesn't need broad host access.
- **GitHub Actions CI** (`.github/workflows/test.yml`): parse-checks
  every JS source file and runs all 1,276 unit tests on every push
  and pull request.
- **Accessibility polish**: popup respects `prefers-reduced-motion` —
  slider toggles and disclosure-triangle rotation become instant for
  users who request reduced motion. New "Report an issue" footer link
  in the popup.

### Fixed
- The universal tracking strip is now correctly gated on both the master
  "Shorten All Links" toggle AND its own toggle — turning the master off
  stops everything, including the universal strip.
- eBay variation selector (`?var=`) is now matched case-insensitively and
  normalized to the lowercase canonical form.
- `web_accessible_resources` block (briefly added speculatively) removed —
  `chrome.scripting.registerContentScripts` doesn't need it.
- Dead code removed (`matchListing()` in etsy.js, unused capture in
  pinterest.js's regex, unused CSS custom properties).

### Changed
- Smarter popup status text — distinguishes between "On — all sites",
  "On — 5 sites + universal", "On — universal only", etc. so the subtitle
  accurately reflects what's active.
- Dark-mode disclosure triangle in the popup is slightly darker for
  better contrast on the dark surface.


### Fixed — modal & SPA-state preservation (post-audit)

A research pass uncovered that our address-bar cleanup was stripping URL
params several supported sites use for in-page state (modals, photo
galleries, comment deep-links, variant selectors). Each fix below preserves
the param when the site relies on it; the canonical shareable forms produced
by the "Share Listing" / "Copy clean URL" buttons remain stripped.

- **Airbnb**: `?modal=PHOTO_TOUR_SCROLLABLE` (and `MAP`, `READ_REVIEWS`,
  `DESCRIPTION`, `HOST_PROFILE`, `SHARE`, etc.) preserved. Without this,
  opening "Show all photos" would briefly show the gallery, then our 500ms
  cleanup pass would strip the param and Airbnb's React app would close the
  modal — observed as the modal "popping up then going away."
- **Facebook**: `comment_id` + `reply_comment_id` preserved on `/posts/`,
  `/videos/`, `/reel/`, `/groups/.../posts/`, `/groups/.../permalink/`,
  `/photo.php`, `/permalink.php`, and `/watch/`. Used by "jump to this
  comment" deep-links; stripping lost the scroll-and-highlight behavior.
- **Instagram**: `img_index` preserved on `/p/` and `/reel/`. Without it, a
  shared "slide 3 of 7" carousel link snapped back to slide 1.
- **Amazon**: `th=1` + `psc=1` preserved on `/dp/`, `/gp/product/`, etc.
  These pre-lock the variant selector (size/color) on child-ASIN URLs; a
  shared "red, size M" link was losing the variant.
- **Spotify**: `context=spotify:playlist:<id>` preserved on `/track/` and
  `/episode/`. Controls what plays after the shared track ends; stripping
  broke queue continuity (track played in isolation).
- **Reddit**: `?context=N` preserved on comment permalinks
  (`/r/<sub>/comments/<post>/<slug>/<commentid>/`). Controls how many
  parent comments are rendered above the linked one.
- **LinkedIn**: `commentUrn` + `replyUrn` preserved on `/feed/update/`
  deep-links to specific comments.
- **YouTube**: `list` + `index` preserved on `/watch` and `/playlist` so
  shared "video #5 in playlist X" URLs keep playlist context.
- **Hotel sites**: `booking.js`, `expedia.js`, and `agoda.js` now preserve
  the URL fragment in `shortUrlForBar` (Airbnb already did). Matters most
  for Booking, which uses `#tab-reviews`, `#hotelTmpl`, `#map_opened` for
  in-page tab/modal state.
- **social-content.js dispatcher**: missing 7 site namespaces (LinkedIn,
  eBay, Etsy, Threads, Pinterest, Walmart, Target). The dispatcher was only
  loading the original 7 social sites; on the newer 7, the dispatcher's
  `M` resolved to null and in-page URL cleanup silently did nothing. All
  14 namespaces now in the chain.

### Permissions
- New required: `scripting` (for dynamic content script registration of the
  universal tracking strip + clipboard injection for the context menu).
- New required: `contextMenus` (for the "Copy clean URL" menu item).
- New required: `activeTab` (so the context menu's clipboard write can
  target the current tab without broad host permissions).
- New optional (not requested at install): `*://*/*`. Requested at runtime
  only when the user enables the Universal tracking strip toggle. The
  install-time prompt is now smaller than in v1.6.x.

### Documentation
- README refreshed to reflect 19 supported sites + universal tracking strip.
- PRIVACY policy updated to cover the new feature and the optional
  permission.
- This CHANGELOG file added.

## [1.6.3] — 2026-05-17

### Fixed
- **Amazon "5 star" / "4 star" review-filter links worked but did nothing
  visible.** The previous code collapsed every URL containing an ASIN to
  `/dp/<ASIN>`, including reviews-list and seller-list URLs that should
  preserve their path. Refactored asin.js into per-form URL_FORMS, each
  with its own canonical path and allowed-query-params list:
  - `/product-reviews/<ASIN>` keeps `filterByStar`, `pageNumber`, `sortBy`,
    `reviewerType`, `formatType`, `mediaType`.
  - `/gp/aw/reviews/<ASIN>` (mobile reviews) preserves its path.
  - `/gp/offer-listing/<ASIN>` (third-party sellers) keeps `condition`,
    `f_new`, `f_used`, `f_collectible`, `f_refurbished`, `startIndex`.
- **Amazon in-page section anchors (`#customerReviews`, `#aplus`, etc.)
  worked but reloaded the page.** Now the URL hash is preserved when
  shortening; same change applied across spotify, reddit, facebook,
  instagram, youtube, twitter, tiktok modules for consistency.
- **Spotify "Copy link at this moment" timestamp was stripped.**
  `?t=` is now preserved on `/track/` and `/episode/`.
- **Reddit subreddit front pages had tracking left intact** (only post URLs
  were cleaned before). Now `/r/<sub>/` and `/r/<sub>/<sort>/` are cleaned,
  keeping `?sort=` and `?t=` (timeframe) but stripping `utm_*` etc.
  Plus user-profile post permalinks (`/user/<u>/comments/...`) are now
  recognized.
- **Facebook missed several common post URL forms.** Added
  `/<user>/videos/<id>`, `/<user>/photos/<set>/<id>`,
  `/groups/<gid>/permalink/<id>`, `/events/<id>`, `/marketplace/item/<id>`
  (with numeric-only ID constraints so `/events/upcoming` isn't a false
  positive).
- **TikTok `/share/video/<id>` canonical share form** is now recognized.
- **All four hotel sites** (Agoda, Booking.com, Expedia, Airbnb) accept
  optional trailing slash on listing paths.
- **The Amazon content script no longer runs on AWS console, Seller
  Central, Music, Advertising, or Developer subdomains** — added
  `exclude_matches` so the MutationObserver isn't spinning on those
  unrelated heavy SPAs.
- **Amazon's MutationObserver disconnects when Amazon is toggled off** —
  previously left running even when nothing would be rewritten.
- **Content-script polling pauses when the tab is in the background**
  (`document.hidden` check). Resumes via `visibilitychange` when the tab
  returns to the foreground.
- **Background service worker dropped the wasted `onCommitted` listener**
  that fired CHECK_URL on every full page load before content scripts had
  even loaded — the message would error invisibly and get swallowed.

### Changed
- Test suite grew from 584 to 707 tests.

## [1.6.2] — Web Store description rewrite

Long description rewritten to drop excessive brand-name repetition that
triggered the Chrome Web Store's "excessive keywords" spam rule on the
v1.6.1 submission. New summary: "Cleans long URLs on shopping, travel, and
social sites — strips tracking and gives you a clean shareable link."

## [1.6.1] — Firefox AMO compliance

- Mobile auto-hide for the floating travel toolbar on viewports under
  600px wide.
- Firefox event-page background mode: `background.scripts` fallback
  alongside `service_worker`; `importScripts` guarded with a
  `typeof === 'function'` check.
- `data_collection_permissions: { required: ["none"] }` declared for AMO.

## [1.6.0] — Five social/media sites

Added YouTube, Twitter/X, TikTok, Reddit, Spotify. Each is a pure URL
module sharing a new `social-content.js` dispatcher. Combined
"Facebook/Instagram" toggle preserved; new toggles per added site. 204
new tests.

## [1.5.0] — Facebook + Instagram

Added Facebook and Instagram. Pure URL modules + new `social-content.js`
dispatcher. Combined `enabledSocial` toggle.

## [1.4.0] — Amazon item-name slug

"Include Amazon item name" toggle. New `extractTitleSlug`, `extractSlug`,
`slugifyTitle` helpers in asin.js. DOM-ready second pass in content.js
when the URL doesn't already have a slug.

## [1.3.x]

- 1.3.4 — fixed manifest description over 132-char limit; final rename to
  "Jimothy's Link Shortener" (was "Link Shortener" then briefly
  "Bickleson's Link Shortener").
- 1.3.x patches — hide-travel-popup toggle; orange logo bars; on-update
  tab reload so existing tabs pick up new content scripts.
- 1.3.0 — per-site toggles.

## [1.2.0]

Booking, Expedia, Airbnb added (Agoda was earlier).

## [1.1.0]

Agoda.

## [1.0.0]

Initial Amazon-only release.
