# Jimothy's Link Shortener — Handoff

Context document for picking up work on a new machine (or in a new Claude
session). Last updated 2026-06-12 at v1.9.0 (second international round +
region-based popup; v1.7.0 is submitted and in review at both stores — do
NOT touch the 1.7.0 packages while that's pending. v1.8.0 and v1.9.0 are
tagged but unsubmitted; when 1.7.0 clears, submit the NEWEST version).

---

## What this is

A Chrome MV3 (also published as Firefox MV3) extension that strips tracking
parameters from URLs on a fixed list of supported sites. Published on:

- **Chrome Web Store** as "Jimothy's Link Shortener" — v1.6.3 approved and
  shipping publicly. v1.7.0 zip is built and ready to upload but not yet
  submitted. Owner account: tommydpowers@gmail.com.
- **Mozilla Add-ons (AMO)** — v1.6.3 xpi approved and shipping (the first
  v1.6.3 submission was rejected for a truncated `src/content.js`; the
  rebuilt xpi cleared review). v1.7.0 xpi is built and ready but not yet
  submitted.

GitHub repo: <https://github.com/Tommytwolegs/link-shortener>.

Author: Thomas Powers. Extension ID (Firefox): `link-shortener@tommytwolegs.github.io`.

**v1.7.0 is a large release.** It bundles twelve new sites, the opt-in
Universal tracking strip, an Advanced settings page, a right-click context
menu, a popup redesign, a build-time parse-check guardrail, GitHub Actions
CI, and a meaningful round of bug fixes for SPA-state preservation. See
"Recent history" below for the full breakdown.

---

## Supported sites (39)

Each has a dedicated pure-function URL module under `src/`. The popup
groups them into Shopping / Travel / Social & media:

**Shopping (5):**
- **Amazon** — full ASIN + slug handling, per-form URL canonicalization
  (`/dp/`, `/product-reviews/`, `/gp/aw/reviews/`, `/gp/offer-listing/` each
  preserve their path with per-form `keepParams` allowlists), in-page link
  rewriting, regional TLDs. Optional "Include Amazon item name" toggle
  preserves the product title slug. Hash fragments (`#customerReviews`)
  preserved. `?th=1` + `?psc=1` preserved on /dp/ to keep the variant
  selector locked. `exclude_matches` keeps the script off AWS console,
  sellercentral, music, advertising, developer subdomains.
- **eBay** — `/itm/<id>` and `/itm/<title>/<id>` both fold to `/itm/<id>`.
  Preserves `?var=` (item variation selector); drops `var=0`. 19 regional TLDs.
- **Etsy** — `/listing/<id>/<slug>` with optional `/<locale>/` prefix
  preserved. 15 regional TLDs.
- **Walmart** — `/ip/<id>` and `/ip/<slug>/<id>` both kept as-is; strips
  ath* / from / wmlspartner / selectedSellerId / sourceid / etc.
- **Target** — `/p/<slug>/-/A-<tcin>` kept as-is; preserves `preselect`
  (variant child-TCIN, Target's analog of Amazon's th/psc); strips lnk /
  clkid / ref / linkId / searchTerm.

**International shopping (12):**
- **Coupang** — `/vp/products/<id>`; preserves `itemId`+`vendorItemId`
  (option/seller variant); strips searchId/rank/src/spec junk.
- **Flipkart** — `/<slug>/p/itm<id>`; preserves `pid` (variant); strips
  lid/otracker/ssid junk.
- **Tokopedia** — `/<shop>/<product>` two-segment form with a
  navigational-segment blocklist. DENYLIST param strategy (strips only
  known-bad: extParam/src/refined/whid/trkid/utm_*) so accidental
  matches can't lose functional state.
- **Mercari** — `/item/m<id>` (jp.) and `/us/item/m<id>` (www.).
  Strip-all.
- **Vinted** — `/items/<id>-<slug>`, 19 TLDs. Strip-all.
- **Allegro** — `/oferta/<slug>-<id>`, PL/CZ/SK/HU. Strip-all.
- **Shopee** — slug (`/<name>-i.<shopid>.<itemid>`) + `/product/<shopid>/
  <itemid>` forms, 12 regional TLDs + `shp.ee` short links. Strip-all.
- **Lazada** — `/products/...i<id>[-s<sku>].html` (sku lives in the PATH),
  6 SE-Asia TLDs + .com. Strip-all.
- **AliExpress** — `/item/<id>.html` + legacy `/i/<id>.html`, .com/.us any
  subdomain. Strip-all.
- **Temu** — `-g-<id>.html`, `/g-<id>.html`, `/goods.html?goods_id=`.
  Preserves `sku_id` (variant). Strip the rest.
- **Mercado Libre** — `ML<X>-<digits>-<slug>-_JM` + `/p/ML<X><digits>`,
  9 LatAm TLDs + mercadolivre.com.br. Preserves `searchVariation`.
  **Drops the hash** — ML tracks in the fragment; the ONE exception to
  the hash-preservation rule (see gotchas).
- **Rakuten Ichiba** — `item.rakuten.co.jp/<shop>/<item>/` only.
  Preserves `variantId`. Strip-all otherwise.

**Travel (7):**
- **Booking.com, Expedia, Airbnb, Agoda, Trip.com, Hotels.com, Vrbo** —
  hotel/rental listings. Address-bar cleanup PLUS a floating toolbar with
  "Share Property" and "With Dates" copy buttons. Trip.com is the odd one:
  hotel identity lives in `?hotelId=` (query, not path) — verified live
  2026-06-12. Hotels.com and Vrbo each handle two param generations
  (chkin/chkout+rmN / q-check-in+q-room-*, and chkin/chkout /
  startDate/endDate respectively) — both bot-walled during research, on
  the smoke-test list. URL fragments preserved (matters for Booking's `#tab-reviews`
  etc.). Airbnb's `?modal=` preserved so the photo gallery / map / reviews
  modals stay open.

**Social & media (15):**
- **Facebook, Instagram** — combined `enabledSocial` toggle. Facebook
  preserves `comment_id` + `reply_comment_id` for deep-links to specific
  comments across `/posts/`, `/videos/`, `/reel/`, group permalinks,
  `/photo.php`, `/permalink.php`, `/watch/`. Instagram preserves `img_index`
  for carousel slide position.
- **Threads** — `/@user/post/<id>` on both `threads.net` and `threads.com`.
- **LinkedIn** — `/posts/`, `/feed/update/urn:li:.../`, `/pulse/`,
  `/jobs/view/`, `/events/`. Preserves `commentUrn` + `replyUrn` on
  `/feed/update/` for comment deep-links.
- **YouTube** — keeps `?v=`, `?t=`, `?list=`, `?index=` on /watch; covers
  `/shorts/`, `/live/`, `/embed/`, `/playlist`, `/clip/`, and `youtu.be`.
- **Twitter/X** — `twitter.com`, `x.com`, mobile subdomains. Cleans /status/.
- **TikTok** — `/@user/video/`, `/@user/photo/`, `/t/`, `/share/video/`,
  plus `vm.tiktok.com` and `vt.tiktok.com`.
- **Reddit** — `/r/<sub>/comments/...`, `/r/<sub>/s/<short>`, user-profile
  permalinks, subreddit front pages with sort+timeframe params. Preserves
  `?context=N` on comment-permalink URLs so shared threads show the right
  amount of parent context. `redd.it` short links.
- **Pinterest** — `/pin/<id>/` with locale prefix. 19 regional TLDs. `pin.it/<short>`.
- **Spotify** — `open.spotify.com` only. Preserves `?t=` (timestamp) and
  `?context=` (playlist/album queue continuity) on `/track/` and
  `/episode/`. `/embed/<kind>/<id>` forms keep `?theme=` (+ `?t=` on
  playable kinds).
- **Bluesky** — `bsky.app/profile/<handle>/post/<rkey>`, custom feeds,
  starter packs. Strips `ref_src`/`ref_url` embed referrers.
- **GitHub** — issue / PR / discussion / commit / release-tag permalinks
  only (tight allowlist — GitHub uses functional query params on most
  other routes). Strips `notification_referrer_id` + notification/email
  junk. Hash deep-links (`#issuecomment-...`, `#discussion_r...`) are
  where GitHub keeps its state — always preserved.
- **Medium** — `/@user/<slug>-<hex>`, `/<pub>/<slug>-<hex>`, `/p/<hex>`,
  and `<user>.medium.com/<slug>-<hex>`. **Preserves `?sk=` (Friend Link
  share key — paywall gift links break without it)**; strips `source=`
  and the rest. Custom-domain publications are out of scope.
- **Quora** — question pages + `/answer/<user>` + `/unanswered/` forms.
  Slug must contain a hyphen + reserved-segment blocklist so
  navigational routes aren't touched. Strips `share`/`ch`/`oid`/`srid`.
- **Substack** — `<pub>.substack.com/p/<slug>` (+ `/comments`,
  `/comment/<id>`), `open.substack.com/pub/...` share-redirect form, and
  substack.com `@user` post/Note forms. Strips `r=` referral codes,
  `utm_*`, `triedRedirect`. Custom-domain publications are out of scope.

Plus an opt-in **Universal tracking strip** that runs on every http(s)
page (default OFF). See `utm.js` below.

---

## Architecture

### Per-site URL modules

- `src/<site>.js` — pure URL functions. Each exposes `is<Site>Host()`,
  `shorten<Site>Url()`, `shortenUrl()` (alias for the dispatcher),
  `needsShortening()`, and a `STORAGE_KEY` constant. Dependency-free; runs
  in three contexts (content script, service-worker importScripts, Node
  require for tests).

### Content-script dispatchers

- `src/social-content.js` — dispatcher used by **all 31** sites that don't
  have their own dedicated content script (the social/media/shopping
  sites that load social-content.js + their URL module). Detects which
  `*LinkShortener` global is loaded, reads that module's `STORAGE_KEY`,
  gates the cleanup on the master flag + per-site flag. **The dispatcher's
  `M = self.FacebookLinkShortener || self.InstagramLinkShortener || ...`
  chain MUST include every namespace it can possibly receive — adding a
  new site means adding it here too**, or the dispatcher silently no-ops on
  that site (this is exactly the bug we fixed when v1.7.0's audit caught
  LinkedIn/eBay/Etsy/Threads/Pinterest/Walmart/Target missing from the
  chain). Polling pauses on `document.hidden`.
- `src/content.js` — Amazon-specific content script (not via dispatcher
  because Amazon does in-page anchor `href` rewriting that the other sites
  don't need). MutationObserver for SPA carousels/pagination; disconnects
  when Amazon is toggled off. Second DOM-ready pass when
  `includeAmazonTitle` is enabled and the URL has no slug to extract.
- `src/site-toolbar.js` + `<hotel>-content.js` — shared floating-toolbar
  implementation used by the four hotel sites. Closed Shadow DOM for style
  isolation. Auto-hides on viewports < 600px wide.

### Universal tracking strip

- `src/utm.js` — pure URL function. Set of exact-match tracking params
  (~70 entries) plus prefix families (`utm_`, `pk_`, `piwik_`, `mtm_`,
  `matomo_`, `hsa_`, `_bsft_`, `iterable_`, `mailgun_`). Accepts an
  optional `{ keepParams }` option (case-insensitive list of param names
  the user wants preserved, from the Advanced settings page).
- `src/utm-content.js` — content script that runs the universal stripper.
  NOT a static `content_scripts` entry — registered dynamically by
  `background.js` via `chrome.scripting.registerContentScripts` when both
  the `enabledUtmStrip` storage flag is true AND the optional `*://*/*`
  permission has been granted. Reads `utmStripSkipDomains` from storage
  and skips the strip on hosts the user has listed (supports leading-dot
  for subdomain match: `.example.com` matches `example.com` and any
  subdomain). Reads `utmStripKeepParams` and passes it to
  `stripTrackingParams(href, { keepParams })`.

### Background

- `src/background.js` — service worker (Chrome) / event page (Firefox).
  - `importScripts()` guarded behind `typeof importScripts === 'function'`
    so the same file works in both modes (Firefox loads modules via the
    manifest `background.scripts` array instead).
  - Pings content scripts on `webNavigation.onHistoryStateUpdated`.
  - Renders the toolbar badge (red "OFF" when master toggle is off).
  - Reloads matching tabs on extension update so they pick up new content
    scripts.
  - Dynamic registration of `utm-content.js` based on toggle + permission
    state. Listens for `chrome.permissions.onRemoved` to flip the storage
    flag back to false when the user revokes externally.
  - **Context menu**: registers "Copy clean URL" on `link` + `page`
    contexts. On click, runs `cleanAnyUrl()` (every per-site shortener in
    sequence, falls back to UTM strip), then injects a clipboard-write
    function into the active tab via `chrome.scripting.executeScript`
    (uses `activeTab` permission so we don't need broad host access for
    the context menu).
  - The context-menu click handler reads `utmStripKeepParams` from
    storage **fresh on every click** (a module-level cache raced
    service-worker wake-up: the click that wakes the SW could run before
    the cache loaded). Skip-domains is intentionally not honored in the
    context menu — the menu is an explicit user gesture, the user wants
    the cleanest URL.
  - The menu itself is (re)created via `removeAll` + `create` on BOTH
    `onInstalled` and `onStartup` — Firefox event pages don't reliably
    persist menus across browser restarts; Chrome doesn't mind.

### Popup

- `src/popup.html` / `popup.js` / `popup.css` — toolbar popup. Master
  toggle, 38 per-site toggles (39 sites; Facebook+Instagram share one)
  organized by WORLD REGION → SITE TYPE: collapsible Global / Americas /
  Asia-Pacific / Europe `<details>` groups, each with Shopping / Travel /
  Social & media subheadings (`.group-subhead`). Global default-open;
  expanded/collapsed state persists via `popupOpenGroups` in
  chrome.storage.sync (keys = data-group values: global/americas/apac/
  europe — old keys from previous layouts are ignored harmlessly). Four feature flags (hide travel popup, include Amazon
  item name, universal tracking strip with NEW badge). Footer has version,
  "Advanced" link (opens options page via `chrome.runtime.openOptionsPage`),
  and "Report an issue" link. `popup.js` requests the optional `*://*/*`
  permission via `chrome.permissions.request` when the user flips the UTM
  toggle on; if denied, the checkbox reverts and storage is not written.
  Respects `prefers-reduced-motion` and `prefers-color-scheme`.

### Options page (advanced settings)

- `src/options.html` / `options.css` / `options.js` — full options page,
  opened via `chrome.runtime.openOptionsPage` (in-app frame, not new tab —
  configured by `options_ui.open_in_tab: false` in the manifest).
  - **Skip these domains** textarea: hosts to bypass the Universal strip.
    One per line. Leading dot enables subdomain match.
    Stored as `utmStripSkipDomains` in `chrome.storage.sync`.
  - **Always keep these parameters** textarea: param names that should
    never be stripped even when they otherwise would. Case-insensitive.
    Stored as `utmStripKeepParams` in `chrome.storage.sync`.
  - Save / Reset buttons. Live status banner that reflects whether the
    Universal strip is currently on.

### Tests

- `tests/<site>.test.js` — dependency-free Node tests for each URL module.
  **1,935 total assertions across 40 test files, all passing.** Run with:
  ```bash
  for f in tests/*.test.js; do node "$f"; done
  ```
  GitHub Actions runs this on every push + PR (`.github/workflows/test.yml`).

---

## Build and ship

Two distribution targets share one source tree. `manifest.json` is the
Chrome-canonical manifest; the Firefox build injects extra fields at
package time.

**On Windows:**

```powershell
cd "<repo-root>"
.\package.ps1
```

**On macOS/Linux:**

```bash
bash package.sh
```

Both scripts produce:
- `dist/link-shortener-<version>.zip` — Chrome Web Store
- `dist/link-shortener-<version>.xpi` — AMO (Firefox)

**Build-time parse-check guardrail.** Every `src/*.js` is run through
`node --check` before staging. A truncated or unparseable file aborts the
build with a clear error. This was added after v1.6.3 shipped a truncated
`src/content.js` to AMO and got rejected for "JavaScript syntax error".
**Do not disable this.**

The Firefox xpi injects four things into the manifest:
1. `browser_specific_settings.gecko.id` (`link-shortener@tommytwolegs.github.io`)
2. `gecko.strict_min_version` (`121.0` — first Firefox with full MV3 SW support)
3. `gecko.data_collection_permissions.required = ["none"]` (AMO requirement)
4. `background.scripts` array (41 entries — Mozilla linter requires a
   fallback alongside `service_worker`; order matters since `background.js`
   uses `self.*LinkShortener` globals at top level)

The Chrome zip ships `manifest.json` byte-identical to disk.

**Submission docs.** `STORE_LISTING.md` has paste-ready text for both
stores:
- Long description (Chrome public listing) — brand-disciplined, each
  supported site named exactly once except Amazon
- "What's new in this version?" release notes — **generic, zero brand
  names** to avoid Chrome's "excessive keywords" spam rule
- Permission justifications (paste into both stores' justification fields)
- AMO reviewer notes (paste into Firefox "Notes to reviewer") — these are
  detailed and brand-specific since AMO reviewers want concrete info

**Privacy policy URL** to use when submitting:
<https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md>

---

## Recent history (most-recent first)

### v1.7.0 (current, ready to ship)

A major release with three rounds of work.

**Round 1 — Five new sites + Universal tracking strip + popup redesign.**
Added LinkedIn, eBay, Etsy, Threads, Pinterest as per-site modules.
Introduced opt-in Universal tracking strip (`utm.js` + `utm-content.js`)
with `*://*/*` declared as optional permission, requested at runtime via
`chrome.permissions.request`. Popup reorganized into collapsible category
groups. Build-time parse-check guardrail added.

**Round 2 — Polish.** Right-click "Copy clean URL" context menu
(`contextMenus` + `activeTab` permissions). prefers-reduced-motion in the
popup. "Report an issue" footer link. GitHub Actions CI workflow at
`.github/workflows/test.yml` runs parse-check + tests on every push/PR.

**Round 3 — Two more sites + options page + expanded trackers.**
Walmart and Target added (paths kept canonical, site-specific tracking
stripped). `utm.js` expanded with ~30 modern trackers (`ttclid`,
`li_fat_id`, `epik`, `msockid`, `_branch_match_id`, `_ke`,
`ck_subscriber_id`, `gad_source`, Rakuten/AWIN/ShareASale/Refersion/
TradeDoubler affiliate IDs, Facebook action params) + 5 new prefix
families (`mtm_`, `matomo_`, `_bsft_`, `iterable_`, `mailgun_`). New
Advanced settings page (`src/options.{html,css,js}`) for per-domain skip
list + per-param keep list.

**Round 4 — Audit + bug fixes.** A thorough code review caught one
critical bug (`social-content.js` dispatcher was missing 7 of the 14 site
namespaces — the in-page cleanup silently no-op'd on LinkedIn / eBay /
Etsy / Threads / Pinterest / Walmart / Target — now fixed). A deep
research pass on URL-state usage across the 19 supported sites surfaced
8 more would-break-feature bugs, all fixed in this release:

- **Airbnb** photo gallery: `?modal=PHOTO_TOUR_SCROLLABLE` was being
  stripped within 500ms, causing the React app to close the modal it had
  just opened. Now preserved (also `MAP`, `READ_REVIEWS`, `DESCRIPTION`,
  `HOST_PROFILE`, `SHARE`, etc.).
- **Facebook**: `comment_id` + `reply_comment_id` preserved across all
  comment-bearing URL forms.
- **Instagram**: `img_index` preserved on `/p/` and `/reel/` for carousel
  slide deep-links.
- **Amazon**: `th=1` + `psc=1` preserved on /dp/ for variant-selector lock.
- **Spotify**: `context` preserved on `/track/` + `/episode/` for queue
  continuity from playlists/albums.
- **Reddit**: `?context=N` preserved on comment permalinks for parent-
  comment depth control.
- **LinkedIn**: `commentUrn` + `replyUrn` preserved on `/feed/update/`
  for comment deep-links.
- **YouTube**: `list` + `index` preserved on `/watch` and `/playlist` for
  playlist position fidelity.
- **Hotel sites** (`booking.js`, `expedia.js`, `agoda.js`): URL fragments
  now preserved in `shortUrlForBar` so Booking's `#tab-reviews`,
  `#hotelTmpl`, `#map_opened` survive cleanup.

Reddit and LinkedIn modules refactored from "flat list of regexes" to
"list of {regex, keepParams}" to support per-form param preservation.

Test count: **1,045 → 1,276 (+231)** across **18 → 20 files**. 19 sites
+ universal stripper, 31 source files (was 28).

**v1.9.0 round — more international sites + region popup (2026-06-12).**
Seven more sites: Coupang, Flipkart, Tokopedia, Mercari, Vinted, Allegro
(shopping, via the dispatcher) and Vrbo (travel toolbar). Popup rebuilt
as world region → site type: Global / Americas / Asia-Pacific / Europe
groups with Shopping/Travel/Social subheadings — the scaling structure
for future expansion. Variant params preserved: Coupang
itemId+vendorItemId, Flipkart pid. Tokopedia uses the denylist strategy
(its product form is two generic path segments — a false-positive match
can only ever lose known tracking params). Vrbo handles both
chkin/chkout and startDate/endDate generations; bot-walled during
research, smoke-test before shipping. Tests: 1,756 → 1,935 across 40
files. Manifest: 192 host permissions, 39 content scripts, 41-entry
Firefox background.scripts.

**v1.8.0 round — international sites (2026-06-12).** Eight new sites:
Shopee, Lazada, AliExpress, Temu, Mercado Libre, Rakuten Ichiba (shopping,
via the dispatcher) and Trip.com + Hotels.com (travel, with the floating
toolbar). Popup reorganized into four groups with a new "International
shopping" section. Trip.com's query-param URL model verified live
(hotelId/checkIn/checkOut/adult/children/ages/crn/cityId functional; the
rest junk). Hotels.com was bot-walled — its module handles both param
generations and is on the smoke-test list. Mercado Libre is the first
site where the HASH is tracking — module drops it, gotcha documented.
Variant selectors preserved: Temu sku_id, ML searchVariation, Rakuten
variantId. Tests: 1,545 → 1,756 across 33 files. Manifest: 164 host
permissions, 32 content scripts. v1.7.0 was submitted to both stores
before this round started; 1.8.0 ships only after 1.7.0 clears review.

**Round 6 — wishlist build-out (2026-06-11).** Five new sites: Substack,
Bluesky, GitHub, Medium, Quora (24 total). Browser-verified URL-state
assumptions before building: Target's own site config allowlists
`preselect` on /p/ pages (confirms Round 5's fix); Airbnb adds
`?modal=PHOTO_TOUR_SCROLLABLE` on gallery open; Booking sets
`#tab-reviews` on the reviews tab; Medium's `sk=` Friend-Link key
documented as the paywall-bypass token (kept). Existing-site polish:
Twitter `/i/lists/<id>`, Reddit user-profile front pages (keep
sort/t), TikTok `/share/photo` + `/share/user`, Spotify `/embed/` forms
(keep theme), LinkedIn `/jobs/search/` (keep
currentJobId/keywords/geoId/f_TPR/distance). Popup `<details>`
group-state now persists (`popupOpenGroups`). `scripts/pre-commit` hook
mirrors CI. Edge Add-ons submission section added to STORE_LISTING.md.
Tests: 1,286 → 1,545 across 25 files.

**Round 5 — pre-release full-codebase review (2026-06-11).** Caught a
critical Windows-build bug before it shipped: `package.ps1`'s Firefox
`background.scripts` array was missing walmart/target/utm (a Windows-built
xpi would throw on every navigation in Firefox). Also: CI workflow had a
bogus `working-directory` (and was never committed — the whole repo was
uncommitted since the v1.6.2 tag; now committed); Target's `?preselect=`
(variant child-TCIN) is preserved instead of stripped; bare `trk` dropped
from the universal denylist; URL-object mutation bugs fixed in
walmart/target/utm; airbnb shortUrlForBar hash preservation; context-menu
re-creation on startup + fresh keep-params read per click; webNavigation
URL filters wired up; defensive isHandledHost; popup "all sites" status
text; travel-toolbar poll lifecycle + per-button toast timers; options
page mid-edit clobber guard. Tests: 1,276 → 1,286.

### v1.6.3

Substantial bug-fix pass. The biggest fix is in `asin.js`: previously
every URL form containing an ASIN collapsed to `/dp/<ASIN>`, breaking the
"5 star" / "4 star" filter links on Amazon product pages. Refactored into
URL_FORMS with per-form canonicalization + per-form `keepParams`. Also
introduced hash preservation across all modules (Amazon `#customerReviews`,
spotify `?t=`, reddit subreddit front pages, facebook 5 new forms, tiktok
`/share/video/`, hotel sites trailing slash, Amazon `exclude_matches` for
AWS/sellercentral/music/advertising, MutationObserver disconnects on
toggle-off, content-script polling pauses on `document.hidden`, dropped
wasted `onCommitted` listener). Test count: 584 → 707. First v1.6.3 xpi
was rejected by AMO for truncated `src/content.js`; the rebuilt v1.6.3
fixed it — this is what motivated the build-time parse-check guardrail.

### v1.6.2

Description rewritten to drop excessive brand keywords after Chrome Web
Store rejected v1.6.1 update for "excessive keywords" spam rule. Brand
discipline rule established: each supported site appears once in the long
description (Amazon gets 3 for its unique slug feature).

### v1.6.1

Mobile auto-hide for floating travel toolbar (< 600px viewport). Firefox
AMO compliance: `background.scripts` fallback + `importScripts` guarded.
`data_collection_permissions: { required: ["none"] }` declared.

### Earlier

- **v1.6.0** — Added YouTube, Twitter/X, TikTok, Reddit, Spotify. 204
  new tests.
- **v1.5.0** — Facebook + Instagram. New `social-content.js` dispatcher.
- **v1.4.0** — "Include Amazon item name" toggle.
- **v1.3.x** — Per-site toggles; hide travel popup; on-update tab reload.
- **v1.2.0** — Booking + Expedia + Airbnb.
- **v1.1.0** — Agoda.
- **v1.0.0** — Amazon only.

Full per-version detail in `CHANGELOG.md`.

---

## Things to know / gotchas

### Chrome Web Store policy traps

- **The "excessive keywords" rule is real.** Repeating brand names many
  times in the description is treated as spam. We learned this when
  v1.6.1's update was rejected for it. Current discipline:
  - **Long description**: each supported site named exactly once. Amazon
    gets 3 mentions (unique features: slug, item-name toggle, AWS
    exclude_matches story).
  - **"What's new in this version?" release notes**: zero brand names.
    Describe fix categories generically ("in-page cleanup now preserves
    URL params modern sites use for in-page state").
  - **Avoid example URLs** that contain brand names (`youtube.com`,
    `music.youtube.com` — these all count).
  - **Single-purpose description**: generic on purpose.
  - AMO reviewer notes are EXEMPT — those are private to the reviewer
    and they want concrete brand-by-brand detail.

### AMO (Firefox) gotchas

- **Reviewers reject truncated / unparseable JS.** The build-time
  parse-check guardrail is the mitigation. Do not disable.
- **`data_collection_permissions` is required** and must be declared
  explicitly. We declare `"none"` since the extension makes zero network
  requests. Handled automatically by the build script.
- **Optional host permissions are still reviewed.** AMO reviewers check
  `optional_host_permissions` alongside required ones — `*://*/*` needs
  a justification in the "Notes to reviewer" field even though we don't
  request it at install. The justification is in `STORE_LISTING.md`.
- **`background.scripts` order matters.** The 21-entry array lists URL
  modules first, then `utm.js`, then `background.js` last (which depends
  on the globals the earlier modules set up).

### Cross-browser MV3 gotchas

- **Firefox event-page mode vs Chrome service-worker mode.** Chrome runs
  background.js as a true SW (`importScripts` available). Firefox 121+
  runs it as an event page via the `scripts` array. The
  `typeof importScripts === 'function'` guard in `background.js`
  handles both. Do not remove.
- **Firefox 121 is the strict-min.** Older Firefox doesn't have full MV3
  SW support — strict_min_version of 121.0 is enforced.

### URL-cleanup design gotchas

- **SPA-state preservation is a real category of bug.** Many modern sites
  use URL query params for in-page state (modal routes, carousel slides,
  variant selectors, queue context, comment deep-links). If you strip
  them, the site's React app re-renders without the state and the
  feature breaks — typically observed as "modal flashes open then closes"
  because our 500ms cleanup pass races the user's click. The pattern when
  adding a new site:
  1. Identify the path forms the site uses.
  2. **Click through every interactive element** (photo gallery, map,
     reviews, "show more" expansions) and watch the address bar for
     `?modal=`, `?img_index=`, `?<thing>_id=` style additions.
  3. Put those param names in the per-site `keepParams` allowlist (or
     denylist depending on the module's strategy).
  4. Add regression tests.
  5. Keep the strict shareable forms (`shortPropertyUrl`,
     `shortUrlWithDates`) separate from the address-bar form
     (`shortUrlForBar`). Shareable URLs should be canonical; address-bar
     URLs need to keep SPA state.

- **`social-content.js` dispatcher must list every namespace.** Adding a
  new site = adding the site's URL module + adding
  `self.<Site>LinkShortener` to the `M = ... || ... ||` chain in
  `social-content.js`. We forgot this for 7 sites in the initial v1.7.0
  work and the per-site toggles silently did nothing for those sites.
  See "Round 4" of v1.7.0 history above.

- **Hash preservation.** Every per-site module preserves
  `location.hash`. Don't drop it — Amazon uses `#customerReviews`,
  Booking uses `#tab-reviews`, etc. Test coverage exists for this on
  every module. ONE deliberate exception: Mercado Libre, where the
  fragment carries pure tracking (#polycard_client=...&tracking_id=...)
  and mercadolibre.js drops it. Don't "fix" that back.

- **Edit tool truncation in Claude sandboxes.** The Edit tool sometimes
  writes files to disk truncated even when it reports success — that's
  how v1.6.3 shipped a broken `content.js`. A second observed failure
  mode (2026-06-11): an edit that SHRINKS a file can leave the file at
  its old size, padded with trailing NUL bytes. `node --check` does not
  reliably catch NUL padding in all file types (YAML, JSON, md), so also
  scan for `\x00` bytes before packaging. The mitigations:
  1. The build-time parse-check guardrail catches truncated JS.
  2. For non-trivial edits, prefer bash heredoc (`cat > file << 'EOF' ...`)
     or Python string-replace over the Edit tool. Verify with
     `wc -l` + `node --check` immediately after any write.
  3. On a real Windows machine with normal filesystem behavior this
     doesn't apply — only relevant when continuing work in a Claude
     session.

### Popup gotchas

- **Native `<details>` for category collapse.** No JS for expand/collapse
  itself — that's native HTML disclosure. `popup.js` keeps the "(N of M
  on)" indicators in sync with storage. Group-state IS persisted (as of
  the 2026-06-11 wishlist round) via `popupOpenGroups` in
  chrome.storage.sync; first run defaults to Shopping open, others closed.
- **`popup.js` SITES array must match `popup.html` ids exactly.** Each
  per-site checkbox needs an `id="enabled<Site>"` that the SITES array
  references. Mismatches cause silent toggle failures.

---

## Open threads / wishlist

These came up but aren't built. Ranked by ROI:

- **Load-the-extension smoke test** before submitting v1.7.0. URL-state
  assumptions were browser-verified on 2026-06-11 (Target preselect ✓,
  Airbnb ?modal ✓, Booking #tab-reviews ✓) but the extension itself
  hasn't been exercised end-to-end in a real profile this round.
  Recommended: load the unpacked build, then walk an Amazon variant URL,
  the Airbnb gallery, an Instagram carousel deep-link, a Medium friend
  link (sk= must survive), and a GitHub notification-opened issue.

- **Submit to the Edge Web Store.** Paste-ready section now exists in
  STORE_LISTING.md; uses the same zip as Chrome. Edge has meaningfully
  more users than Firefox.

- **Firefox Android testing.** The xpi should work on Firefox for Android
  (which supports MV3) but hasn't been physically tested. The mobile
  auto-hide for the travel toolbar was added with this in mind.

- **Expedia/Agoda modal behavior.** No public evidence they use URL state
  for modals (likely React-internal); hash preservation is in place
  regardless. Worth a quick manual click-through someday.

- **More sites someday:** Walmart Canada French paths, AliExpress,
  Temu, Best Buy, IMDb (`?ref_=`), Goodreads, Stack Overflow
  (`?so_medium=`), npm (`?activeTab=`). All carry tracking or
  state-bearing params with natural canonical forms.

- **Stripped-count badge on the toolbar icon.** Visible feedback that
  the Universal strip is doing something (e.g. "3" badge after stripping
  3 trackers on the current page). Adds polish but might add noise.
  (Considered and deliberately skipped in the 2026-06-11 round.)

- **Telemetry-free "what got stripped" history in the popup.** Local-only
  log of recent cleanups. Useful for users who want to verify the
  extension is working. (Considered and deliberately skipped in the
  2026-06-11 round.)

---

## Files in the repo

```
link-shortener/
├── .github/workflows/test.yml      — CI: parse-check + run all tests on push/PR
├── manifest.json                   — Chrome-canonical manifest (192 host_permissions, 39 content_scripts)
├── package.sh                      — macOS/Linux build script
├── package.ps1                     — Windows PowerShell build script
├── package_lf.sh                   — (older, retained for reference)
├── CHANGELOG.md                    — public release notes per version
├── HANDOFF.md                      — this file
├── PRIVACY.md                      — privacy policy (linked from both stores)
├── README.md                       — GitHub repo README
├── STORE_LISTING.md                — paste-ready store-submission copy
├── LICENSE                         — MIT
├── icons/                          — 16/48/128 px + promo tile
├── src/
│   ├── manifest's per-site modules (39): asin, agoda, booking, expedia,
│   │   airbnb, facebook, instagram, youtube, twitter, tiktok, reddit,
│   │   spotify, linkedin, ebay, etsy, threads, pinterest, walmart, target,
│   │   substack, bluesky, github, medium, quora, shopee, lazada,
│   │   aliexpress, temu, mercadolibre, rakuten, trip, hotelscom, coupang,
│   │   flipkart, tokopedia, mercari, vinted, allegro, vrbo
│   ├── per-site content scripts: agoda-content, booking-content,
│   │   expedia-content, airbnb-content, trip-content, hotelscom-content,
│   │   vrbo-content (the 7 travel sites' wiring), content.js
│   │   (Amazon-specific), social-content.js (dispatcher for the other 31)
│   ├── site-toolbar.js             — shared floating toolbar (hotel sites)
│   ├── background.js               — service worker / event page
│   ├── popup.html / popup.css / popup.js
│   ├── options.html / options.css / options.js  — advanced settings page
│   ├── utm.js                      — pure UTM stripper
│   └── utm-content.js              — dynamic content script for UTM strip
├── scripts/pre-commit              — local hook mirroring CI (install: cp into .git/hooks/)
├── tests/                          — 40 test files, 1,935 assertions
└── dist/                           — built zip + xpi packages
```

---

## Reference

- **Repo root**: `C:\Users\tommy\Documents\Projects\Link Shortener\link-shortener\`
- **Chrome Web Store dev console**: <https://chrome.google.com/webstore/devconsole/>
- **AMO developer hub**: <https://addons.mozilla.org/developers/>
- **GitHub**: <https://github.com/Tommytwolegs/link-shortener>
- **Privacy policy**: <https://github.com/Tommytwolegs/link-shortener/blob/main/PRIVACY.md>
- **Firefox extension ID**: `link-shortener@tommytwolegs.github.io` (permanent — don't change)

Author: Thomas Powers (tommydpowers@gmail.com).
