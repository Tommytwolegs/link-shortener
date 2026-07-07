# Changelog

All notable changes to Jimothy's Link Shortener. Versions follow
[Semantic Versioning](https://semver.org/) loosely — minor bumps mark new
features, patch bumps mark bug-fix-only releases.

## [1.8.0] — unreleased

**This is one consolidated release.** Everything below down to the v1.7.0
entry ships together as v1.8.0 (the interim development tags 1.8–1.11
were collapsed on 2026-06-12; they were never submitted anywhere).

### Added — streaming, gaming, wikis, and news (final round)
- **Netflix** (strips the trkid share tracker on /title/ and /watch/),
  **Roblox** (preserves ?privateServerLinkCode= — it's an invite),
  **Fandom** (the Wikipedia treatment: denylist, section anchors sacred),
  **Bilibili** (+ b23.tv short links; preserves ?t= timestamp and ?p=
  part number; strips the infamous share-junk avalanche), **SHEIN**
  (strips src_*/mallCode junk).
- **News pack** — one module, 51 outlets worldwide, EACH with its own
  toggle in a dedicated collapsible "News outlets" popup group broken
  down by region (Americas / Europe / Asia-Pacific / Middle East &
  Africa / Global agencies) — a single misbehaving outlet can be turned
  off without losing the rest. Strips each outlet's share attribution
  (smid, CMP, itid, at_*, xtor, ftcamp, maca, sara_ref, module/pgtype,
  iref, n_cid, traffic_source, utm_*, ...) while PRESERVING gift/paywall
  tokens (NYT unlocked_article_code, Bloomberg accessToken, WSJ st, FT
  shareType/token) — guaranteed by the per-outlet denylist design.

- **Google Search** — cleans shared result URLs down to the query and
  real filters (mode, language, pagination), stripping ved/ei/sca_esv/
  gs_* session tracking. Scoped to www.google.com /search only; no other
  Google property is touched.
- **Google Drive/Docs/Sheets/Slides/Forms** — strips usp= share
  attribution, ts, and notably ouid= (the sharing user's account id);
  PRESERVES resourcekey= (access breaks without it), gid= (sheet tab),
  and #heading anchors.
- **Host-scoped fallback cleanup on 16 major modules** — paths that
  match no recognized permalink form (search results, profiles,
  category pages, news stories shared from feeds) still get the site's
  own tracking params stripped while functional params like search
  keywords survive. Covers LinkedIn (lipi/trk/...), Twitter/X
  (?s=&t=/ref_src), Amazon (ref/crid/sprefix — non-retail subdomains
  like AWS are left untouched), YouTube (si), Facebook (mibextid),
  TikTok, eBay (_trkparms), Etsy, Reddit (share_id), Steam (snr),
  Spotify, Pinterest, Medium, Shopee, Walmart, and Target (searchTerm
  survives). LinkedIn News /news/story/ is now also a recognized form.
  All 16 also strip the universal click junk — utm_* (prefix), fbclid,
  gclid — so default-config users (universal strip off) get clean URLs
  on these paths too, matching the established denylist modules.
- **Redirector unwrapping in the right-click menu** — "Copy clean URL"
  on a link wrapped by Gmail/Google (/url?q=), Facebook (l.php?u=),
  Reddit (out.reddit.com), or YouTube (/redirect) now copies the real
  destination, cleaned by whichever site module matches it. Works
  everywhere, needs no new permissions, capped at 3 hops, http(s)
  targets only.
- **Copy clean URL from the popup** — the popup now previews the
  current page's cleaned URL (with a "Removes N tracking params" note)
  and copies it in one click. Uses the same pipeline as the context
  menu via a background message, so redirect unwrapping and per-site
  rules apply identically. Hidden on non-http(s) pages.
- **Keyboard shortcut** — Ctrl+Shift+L (Cmd+Shift+L on Mac) copies a
  clean URL of the current page. Registered via the `commands` manifest
  key (no new permissions); rebindable in the browser's extension
  shortcut settings.
- **Six more sites (127 total)** — two more of the world's search
  engines (one major, one privacy-focused: q and functional filters
  survive, entry-point/telemetry junk dies), Korea's everything-portal
  (search/blog/cafe/news; legacy query-functional forms like
  blogId=/logNo= are why it's a strict denylist), the leading weather
  site (partner + Coremetrics campaign junk), a major consumer
  electronics brand's store (cid/ppc/click-ids; modelCode survives),
  and Japan's biggest news portal as news outlet #52.
- **Site filter in the popup** — a search box above the 125 toggles
  live-filters rows by name, auto-expanding matching groups and hiding
  empty ones. Clearing (or Esc) restores the previous open/closed
  arrangement without persisting the temporary state.

### Formerly tagged v1.11.0 during development

### Added
- **15 more sites** (63 total): Wayfair (preserves ?piid= variant ids),
  Best Buy (preserves ?intl=nosplash), Bandcamp (wildcard artist
  subdomains), Letterboxd, Tripadvisor (pagination lives in the PATH —
  kept verbatim; denylist query strip), Meesho (incl. the /s/p/ share
  short form — URL model verified), Carousell, Taobao/Tmall (identity
  lives in the QUERY — keeps ?id= + ?skuId=), JD.com, Leboncoin (modern
  /ad/ + legacy .htm forms — verified), OLX (6 country TLDs — verified),
  Wallapop, Marktplaats, Kleinanzeigen, Zalando (preserves ?size=).
- Popup regional groups grow accordingly: Europe goes from 2 to 8
  shopping sites; Americas gains Best Buy; Asia-Pacific gains four.

### Formerly tagged v1.10.0 during development

### Added
- **8 media & entertainment sites** (47 total): Steam (strips the snr
  click-path breadcrumb), IMDb (strips ref_/pf_rd_*), Stack Overflow +
  the Stack Exchange network (rewrites share links — /q/<id>/<user> and
  /a/<id>/<user> carry the sharer's user id as an attribution PATH
  segment, now removed; answer/comment hash anchors preserved),
  Wikipedia (strips the mobile apps' ?wprov= share attribution;
  denylist strategy; section anchors sacred), Goodreads, SoundCloud
  (strips the si= share token; preserves ?in= playlist context),
  Apple Music/Podcasts (preserves ?i= track/episode deep links; strips
  at/ct affiliate tokens), Twitch (VODs + clips; preserves ?t=
  timestamps; channel pages deliberately out of scope).
- **Global group now has separate "Social" and "Media & entertainment"
  subheadings** — 33 toggles under Global stay navigable.

### Fixed — UX pass (2026-06-12)
User-visible state that cleanup was stripping, caught in an annoyance
audit before release:
- Stack Overflow: `?page=` (big questions paginate answers) and
  `?answertab=`/`?tab=` sort state now survive — refreshing page 2 no
  longer snaps you to page 1.
- Steam: `?l=` display-language override preserved.
- Apple Music/Podcasts: `?l=` display-language override preserved.
- Twitch: `?collection=` VOD queue context preserved (the Twitch analog
  of Spotify's `?context=`).

### Formerly tagged v1.9.0 during development

### Added
- **7 more sites** (39 total): Coupang (preserves itemId/vendorItemId —
  the option/seller variant), Flipkart (preserves pid — the exact
  variant), Tokopedia (denylist strategy + shop blocklist, so accidental
  path matches can only ever lose known tracking params), Mercari (JP +
  US forms), Vinted (19 European/US markets), Allegro (PL/CZ/SK/HU),
  and Vrbo (joins the travel toolbar; handles both chkin/chkout and
  startDate/endDate param generations).
- **Popup restructured to world region → site type**: four collapsible
  region groups (Global, Americas, Asia-Pacific, Europe) with
  Shopping / Travel / Social & media subheadings inside — built to keep
  scaling as more sites are added. Group state still persists.

### Formerly tagged v1.8.0-dev during development

#### Added
- **8 new international sites** (32 total), in a new "International
  shopping" popup group plus two travel additions:
  - **Shopee** (12 regional TLDs + shp.ee short links) — slug and
    /product/ forms; strips sp_atk/xptdk/publish_id share tracking.
  - **Lazada** (6 SE-Asia TLDs + .com) — /products/...-i<id>-s<sku>.html;
    strips spm/scm/pvid/clickTrackInfo.
  - **AliExpress** (.com + .us, all locale subdomains) — /item/<id>.html;
    strips spm/gatewayAdapt/pdp_npi/aff_* junk.
  - **Temu** — slug, /g-, and /goods.html forms; **preserves ?sku_id=**
    (variant selector); strips _bg_fs/refer_page_*/_x_sessn_id.
  - **Mercado Libre / Mercado Livre** (9 LatAm TLDs + .com.br) — item and
    /p/ catalog forms; **preserves ?searchVariation=**; strips query junk
    AND the fragment — the one site where the hash carries pure tracking
    (#polycard_client=...&tracking_id=...), a documented exception to the
    hash-preservation rule.
  - **Rakuten Ichiba** (item.rakuten.co.jp) — shop/item form; **preserves
    ?variantId=** (SKU selector); strips rafcid/scid/s-id affiliate ids.
  - **Trip.com** — /hotels/detail/?hotelId= pages get the floating travel
    toolbar (Share Property / With Dates) + address-bar cleanup keeping
    hotelId, dates, occupancy, cityId. URL model verified live.
  - **Hotels.com** — /ho<id>/ pages get the travel toolbar; handles both
    the modern (chkin/chkout/rmN) and legacy (q-check-in/q-room-*) param
    generations without renaming either.
- **Popup reorganized into four collapsible groups**: Shopping (5),
  International shopping (6), Travel (6), Social & media (15) — with
  remembered expand/collapse state, as before.

## [1.7.0] — 2026-06-11

### Added
- **10 new supported sites** (rounds 1–3: LinkedIn, eBay, Etsy, Threads,
  Pinterest; wishlist round: Substack, Bluesky, GitHub, Medium, Quora). Each
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
  pattern (path stays canonical, site-specific tracking stripped). With
  the wishlist round below, the supported-site list is now 24.
- **Expanded universal tracker list** — 30+ new params and 5 new
  prefix families added to `utm.js`. Notable additions: TikTok Ads
  (`ttclid`), LinkedIn (`li_fat_id`, `trkCampaign`), Pinterest (`epik`),
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
  every JS source file and runs all 1,545 unit tests on every push
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
- **Hotel sites**: `booking.js`, `expedia.js`, `agoda.js`, and `airbnb.js`
  now preserve the URL fragment in `shortUrlForBar`. Matters most for
  Booking, which uses `#tab-reviews`, `#hotelTmpl`, `#map_opened` for
  in-page tab/modal state.
- **social-content.js dispatcher**: missing 7 site namespaces (LinkedIn,
  eBay, Etsy, Threads, Pinterest, Walmart, Target). The dispatcher was only
  loading the original 7 social sites; on the newer 7, the dispatcher's
  `M` resolved to null and in-page URL cleanup silently did nothing. All
  14 namespaces now in the chain.

### Added — wishlist build-out (2026-06-11)

- **5 more supported sites** (24 total): Substack (posts, comments,
  Notes, the open.substack share-redirect form; strips `r=` referral
  codes), Bluesky (posts, custom feeds, starter packs), GitHub
  (issue/PR/discussion/commit/release permalinks; strips
  `notification_referrer_id` and friends; `#issuecomment-` anchors
  preserved), Medium (**preserves `?sk=`, the Friend Link share key —
  paywall gift links keep working**; strips `source=`), and Quora
  (questions + answers; strips `share`/`ch`/`oid`/`srid`).
- **New URL forms on existing sites**: Twitter/X `/i/lists/<id>`;
  Reddit user-profile front pages (keep `?sort=`/`?t=`); TikTok
  `/share/photo/<id>` + `/share/user/<id>`; Spotify `/embed/` player
  forms (keep `?theme=`, `?t=`); LinkedIn `/jobs/search/` (keeps
  `currentJobId`, `keywords`, `geoId`, `f_TPR`, `distance` — the params
  that define what the recipient sees).
- **Popup remembers your expanded categories** across opens
  (`popupOpenGroups` in chrome.storage.sync).
- **Pre-commit hook** at `scripts/pre-commit` mirroring CI (parse-check
  + NUL-byte scan + full test run); install with
  `cp scripts/pre-commit .git/hooks/pre-commit`.
- **URL-state assumptions browser-verified** before building: Target's
  own site config allowlists `preselect` on product pages; Airbnb's
  gallery adds `?modal=PHOTO_TOUR_SCROLLABLE`; Booking's reviews tab
  sets `#tab-reviews`; Medium's `sk=` confirmed as the gift-link token.

### Fixed — pre-release code review (2026-06-11)

A full-codebase review before submission caught one would-have-shipped
packaging bug and a round of smaller defects:

- **package.ps1** (Windows build): the Firefox `background.scripts` array
  was missing `walmart.js`, `target.js`, and `utm.js` — a Windows-built
  xpi would have thrown on every navigation event in Firefox's event-page
  mode. Now identical to package.sh (21 entries). Also added a guardrail
  that fails the build if zip entries contain backslash separators
  (Windows PowerShell 5.1's Compress-Archive does this; the stores reject
  such archives).
- **CI workflow**: removed a bad `working-directory` that pointed at a
  nonexistent subdirectory; the workflow could never have passed.
- **Target**: `?preselect=` is now preserved — it carries the child TCIN
  of the variant (size/color) the user picked, Target's analog of
  Amazon's `th`/`psc`. Previously stripped, which snapped shared links
  back to the default variant.
- **Universal strip**: bare `trk` removed from the universal denylist —
  too generic a name for a host-agnostic strip (the LinkedIn module still
  strips it on linkedin.com). Also fixed a defensive-cleanup regex that
  could eat a literal `?` inside the URL fragment.
- **URL-object inputs**: `walmart.js`, `target.js`, and `utm.js` no longer
  mutate a caller-supplied `URL` object (which also made their
  `needsShortening`/`needsStripping` checks self-defeating for that input
  type). Regression tests added.
- **Airbnb**: `shortUrlForBar` now preserves the URL fragment like the
  other three hotel modules.
- **Background**: the "Copy clean URL" context menu is re-created on
  browser startup (Firefox event pages don't reliably persist it);
  duplicate-id errors are checked via `runtime.lastError` instead of a
  no-op try/catch; the user's keep-params list is read fresh on every
  click (a module-level cache could race service-worker wake-up); the
  `webNavigation` listener now passes its URL filters so it doesn't fire
  on unrelated sites; per-site host checks are defensive against a
  missing module.
- **Popup**: status line said "On some sites" when every per-site toggle
  was on; now says "On all sites".
- **Travel toolbar**: the SPA-watchdog poll now stops when the site
  toggle is off; per-button "Copied!" reset timers (clicking a second
  button within 1.5s no longer leaves the first stuck on "Copied!").
- **Options page**: a settings sync from another device no longer
  overwrites a textarea you're actively editing.

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
- README refreshed to reflect 24 supported sites + universal tracking strip.
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
