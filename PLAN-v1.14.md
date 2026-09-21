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
