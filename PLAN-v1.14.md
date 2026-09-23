# Plan: v1.14 — "Rather's Link Cleaner"

Drafted 2026-09-21, while v1.13.0 sits in store review. Decision log and
work slate for the next cycle. Two tracks: the SITE track ships
immediately (no store review involved), the EXTENSION track ships as one
v1.14 submission.

---

## Decision: rebrand to "Rather's Link Cleaner"

Agreed 2026-09-21. Rationale, recorded so future-us remembers why:

- Store search weights the NAME heavily. "Link shortener" searchers want
  bit.ly-style hosted short links and are the wrong users; "link cleaner"
  / "URL cleaner" searchers want exactly this product and our name does
  not contain their words.
- The ClearURLs one-star analysis (below) shows the category's incumbent
  bleeding users precisely among "url cleaner" searchers. Vacuum is open
  now.
- Brand equity today is near zero, so the rename is as cheap as it will
  ever be. IDs never change (Chrome extension id, gecko id
  link-shortener@tommytwolegs.github.io — NEVER touch), installs and
  reviews carry over on both stores.
- The old joke survives as the tagline: "the link cleaner that actually
  shortens links."

Mechanics checklist (extension track):
1. manifest.json "name" -> "Rather's Link Cleaner" (via __MSG_? name is
   currently a literal; consider extName i18n key while in there).
2. extDesc reworded in ALL 13 locales (lead with cleaner, keep shortener
   as the twist).
3. Store display names: Chrome dashboard + AMO listing (AMO slug
   rather-s-link-shortener CAN stay — slugs are cosmetic; decide at
   submission whether changing it is worth breaking inbound links: NO).
4. ratherlinks.com copy + <title>/og tags.
5. README/HANDOFF/STORE_LISTING headers.
6. GitHub repo slug STAYS link-shortener (redirects are automatic if
   ever renamed, but don't).
7. Icon/wordmark: no text in icon, unchanged.
8. TIMING RULE: never rename while a version is mid-review.

---

## Slate update 2026-09-23 (approved)

Second research pass (AdGuard TrackParamFilter diff + our AMO reviews,
which are still zero). Approved additions A/B/D/E/F built and committed
on main at 453d1c8, all suites green (utm 255 / dnr 155 / redirect 109,
225 files):

- **A. Denylist sweep 2026** — DONE. Includes a real bug fix: the
  Blueshift prefix was `_bsft_` but wild params are `bsft_eid` etc., so
  it never matched; both prefixes now listed. New exacts: ysclid,
  ym_tracking_id, tgclid, gad_campaignid, _gl, _bhlid (beehiiv),
  _cldee/_clde (Dynamics 365), xtor, wt_mc, x-clickref, af_xp/af_ad/
  af_adset/af_click_lookback, gps_adid, sms_click/sms_source/sms_uph,
  tw_source/tw_medium/tw_profile_id, at_link_id/at_recipient_id/
  at_recipient_list. New prefixes: itm_, _sgm_, adjust_, bsft_ (each
  with a dnr.js PREFIX_EXPANSIONS row). Deliberately skipped: adj_t
  (deep-link router on *.go.link), erid (Russian ad-label law),
  is_retargeting (generic name).
- **B. Redirectors** — DONE. l.wl.co (WhatsApp Web/Desktop wrapper,
  /l?u=) and l.threads.net (?u=) in the unwrap table + tab-layer skip
  filters. No DNR rules: targets are percent-encoded in practice.
- **D. Bookmark cleaner** — DONE. Options page section; optional
  `bookmarks` permission requested on click and REMOVED automatically
  after (scan-with-no-changes or apply); dry-run scan previews via the
  clean-links-batch pipeline (new dryRun flag so scans count nothing);
  apply re-runs non-dry for correct stats/history (host 'bookmarks').
- **E. Welcome page** — DONE. src/welcome.html, opened by onInstalled
  reason 'install' only. Badge, always-working, copy-anywhere, opt-ins,
  zero-data cards; fully local; 13 locales.
- **F. clean-page command + a11y** — DONE. Unbound command mirrors the
  popup button (activeTab granted by the shortcut press); gear buttons
  got aria-expanded, summary/gear focus-visible styles.
- 23 new i18n keys x 13 locales. NEW PERMISSION for reviewer notes:
  optional_permissions ["bookmarks"] (runtime-requested, auto-returned).
- Site: _bhlid + ysclid glossary pages added (21 total).
- **C. Coverage packs + category dropdowns** — DONE at 5bab1e9, scope
  settled 2026-09-23 (core-four ticketing US domains, US-four delivery).
  Per Thomas's direction the pack-vs-per-site question became "both":
  every popup category is now a dropdown with a tri-state master switch
  in the header and per-site toggles inside. Airlines split from one
  enabledAirlines key into 12 per-carrier keys (storageKeyFor pattern)
  with a one-shot update migration (pack off -> all carriers off). New
  modules tickets.js + fooddelivery.js, same pattern. NEEDS A VISUAL
  PASS: the popup dropdown redesign has not been seen by human eyes yet.
  Counts now: 218 modules / 285 toggles / 570 host permissions / 227
  test files.

## Status 2026-09-24: BUILD COMPLETE, awaiting Thomas's steps

Everything below is DONE and committed through 7314aed; packages
dist/link-shortener-1.14.0.{zip,xpi} built and verified; tag v1.14.0.
Landed since the slate update: auto-clean merged from the wip branch
(a04c219), fix-flow phase 2 (site-key resolver + per-site off button +
report context), options status line knows the redirect skip, travel
widget hidden by default, and the FULL rebrand in-package (manifest,
extDesc x13, welcome, popup/options headers, README). The site rename
is deliberately NOT applied: jimothylinks/scripts/rebrand-site.js runs
it on submission day (same day as the store uploads, never before).
Remaining human steps: visual pass, screenshots, Firefox Android test,
v1.13-is-live confirmation, uploads, site deploys, git push.
Expedia/Agoda modal item: considered MOOT (widget now hidden by
default); reopen only if a report comes in.

## Extension track (one submission)

1. **Per-site auto-clean** — the headline. Fully built and parked on
   branch `wip/autoclean-v1.14` (one commit ahead of dfbf29c). Resume:
   rebase onto v1.13.0 tag, run scripts/addkeys-autoclean-v114.js and
   delete it, re-run check-wiring, add a TESTING section, update the
   scripting justification (STORE_LISTING) for the registered
   autoclean-content script.
2. **Rebrand** (checklist above).
3. **Store screenshots refresh** — both listings still show the pre-1.13
   popup (toggle stack, old footer). New set: redesigned popup with
   Options dropdown + badge on icon, Recent activity view, active-skip
   shot. Compositor entries in scripts/make-screenshots.py; snips from
   Thomas as before.
4. Small carried items:
   - Fix flow phase 2: host -> siteKey map so "undo" can flip the
     per-site toggle; enrich the GitHub report with which layer acted.
   - Options-page status line learns about the active skip (4-state).
   - Firefox Android physical test (+ confirm Android compatibility got
     enabled on AMO during the 1.13 submission).
   - Expedia/Agoda modal click-through (5 minutes, close it forever).
   - Eventbrite secondary ccTLDs: STILL parked (permission footprint).
   - Denylist watch: ysclid (Yandex click id) and any new families from
     the next AdGuard/ClearURLs rules sweep.

## Site track (ships first, no review cycle)

1. **v1.13 feature copy** on ratherlinks.com (active skip, badge,
   history, per-site options, 13 languages).
2. **"Cleans without breaking" comparison section** — armed by the
   ClearURLs one-star analysis below. Tone: factual, link to their
   public review page, no dunking; the architecture difference does the
   talking.
3. **/trackers/ SEO glossary** — one static page per major param
   (fbclid, gclid, igsh, mibextid, srsltid, utm_*, wbraid/gbraid,
   ttclid, msclkid, twclid, epik, li_fat_id, mc_eid, _hsenc, sccid,
   rdt_cid, mkt_tok, jic...), generated from a params.json distilled
   out of utm.js comments + per-site modules. Index page, sitemap.xml,
   zero tracking on the pages themselves. Biggest organic lever we have.
4. Rebrand copy lands here at the SAME TIME as the extension submission
   (not before — the site shouldn't advertise a name the stores don't
   show yet).

---

## Reference: ClearURLs 1-star review analysis (2026-09-21)

Source: AMO ratings API, addon=clearurls, score=1 (87 total; 50 most
recent read in full). Categories by volume:

1. **Breaks websites** (dominant): Google Sheets Ctrl+F dead for months
   (Oct-Dec 2024), Google OAuth error 400, Google Translate URL-rewrite
   flicker loop, Google Images, Google AI Overview/AI mode, YouTube
   search filters (&sp= stripped -> freeze), Twitter search with spaces,
   3-D Secure payment redirects, SAML logins (RelayState/SAMLRequest
   stripped — Spain Cl@ve, NHS.UK), Prime Video (broken for months in
   2024), Facebook file downloads, Google Voice.
2. **Broken release left live for weeks** (Jan-Feb 2025, v1.26.x):
   copy-pasted dev reply while users churned; one user captcha-walled
   network-wide by the rewrite loop.
3. **No practical allowlist/exceptions** ("manipulating the rules file").
4. **Doesn't clean what users share** (share-button/clipboard copies
   stay dirty; users conclude "does nothing").
5. **Opaque rules.**

Why our architecture dodges each, for the comparison page:
1. Per-site cleanup rewrites the ADDRESS BAR after load — the site
   always receives its own params, so the Sheets/OAuth/3DS/SAML class
   is structurally impossible. Request-touching layers are opt-in,
   curated-denylist-only (no generic names, ever), main_frame only,
   protection wrappers provably unmatchable.
2. 225 test files + wiring auditor + pre-commit + 25-check live matrix
   per release; idempotent rewrites + Navigation-API transition guards
   kill the flicker-loop class.
3. 266 per-site toggles, skip domains, keep params, one-click site
   exclusion, per-tab pause, per-site gear options.
4. Copy clean URL everywhere (link/page/selection), bulk cleaner with
   file drop, Clean links on this page; v1.14 adds per-site auto-clean.
5. Removed-params chips, per-tab badge, names-only local history.

Defensive note from their AI Overview breakage: our google.js strips
ved/ei in the address bar only (post-load), so we cannot break it the
way they did — but watch that family if Google ever makes those params
load-bearing on navigation.
