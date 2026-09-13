# SPEC v1.13 — "Sees more, shows more, breaks nothing"

Drafted 2026-09-13. Companion to PLAN-v1.13.md; this is the build spec.
Everything in one release by decision. No new manifest permissions
anywhere in this version: every feature rides permissions already held
(v1.12's review cost bought us that headroom).

Contents:
  A. Universal denylist additions (mibextid, sfnsn + sweep)
  B. Stripped-count badge
  C. Local "what got stripped" history
  D. Per-site options layer
  E. Active redirect skip (DNR fast path)
  F. Clean all links on this page
  G. Self-healing report flow
  H. Per-tab pause
  I. Master-toggle keyboard shortcut
  J. Bulk cleaner file drop
  K. Locales it / nl / pl
  L. Firefox Android enablement + carried-over checks
  M. Storage schema summary, build order, test plan, risks
  (Website /trackers/ glossary is a parallel track — separate repo,
  specced at the end as N.)

---

## A. Universal denylist additions

**What.** Promote Facebook mobile-share trackers to utm.js's universal
denylist: `mibextid`, `sfnsn`. Both are appended to links shared OUT
through Facebook/Messenger mobile, so they appear on arbitrary
third-party sites; today only facebook.js strips them (own-domain
FALLBACK_STRIP). Names are globally unambiguous — no known site uses
either functionally.

**Sweep.** One pass over AdGuard's URL Tracking filter and the ClearURLs
rules catalog for other universal-safe candidates we lack. Bar for
inclusion, unchanged: the name must be unambiguous across the entire
web (a `ref` or `src` never qualifies), and the source must document it
as pure tracking. Expected yield is small (single digits); record
rejected candidates in utm.js comments the way `trk` is recorded.

**Files.** src/utm.js (denylist + head comment), src/dnr.js
(PREFIX_EXPANSIONS untouched — these are exact names, they flow through
buildRemoveParams automatically from the utm.js list), tests/utm.test.js
+ tests/dnr.test.js parity guards, CHANGELOG.

**Tests.** Exact-name strip on a third-party URL; facebook.js behavior
unchanged; dnr parity test asserting the new names appear in the built
rule's removeParams.

---

## B. Stripped-count badge

**What.** `chrome.action` badge on the toolbar icon showing, for the
CURRENT tab, how many params this extension removed: address-bar
rewrites + active-strip blocks + redirect skips (counted as 1 each).
Resets on every top-level navigation.

**Mechanics.**
- background.js keeps a per-tab counter map `tabCounts` (module global,
  session-lifetime; rebuilt lazily after SW restart from 0 — losing a
  badge count on idle-kill is acceptable, it's ephemeral UI).
- Increment sources: the existing rewrite-report message from content
  scripts (address-bar cleanups), the active-block attribution site
  (diffRemovedParams result), handleRedirectSkip (+1).
- `chrome.webNavigation.onCommitted` (frameId 0, non-history) zeroes the
  tab's count EXCEPT when the commit is the active-strip redirect itself
  (the attribution pairing already identifies that case — zero first,
  then credit).
- Render: `action.setBadgeText({tabId, text})`, empty string when 0.
  `setBadgeBackgroundColor` once at startup (brand orange #F8990F,
  white text).
- Toggle: `showBadge` (default **true** — the feature exists to be
  seen; users who find it noisy have the switch). Lives in the popup
  switch cluster. Gated on master `enabled`.

**Firefox.** `browser.action` badge works on desktop; on Android badges
are not rendered — harmless no-op, no gating needed.

**Files.** background.js, popup.html/popup.js (switch), options.js
(import sanitize accepts `showBadge`), locales (labelShowBadge,
tipShowBadge), CHANGELOG.

**Tests.** Pure-logic extraction: a `BadgeCount` helper module is
overkill — instead unit-test nothing and cover via the wiring checker
(switch present, flag in FEATURE_FLAGS `showBadge`… note: check-wiring
FEATURE_FLAGS set gains `showBadge`), plus manual matrix in HANDOFF.

---

## C. Local "what got stripped" history

**What.** Ring buffer of the last 50 cleanup events, viewable from the
options page (Stats card grows a "Recent activity" disclosure). Each
entry: timestamp, hostname, kind (`rewrite` | `active` | `skip` |
`copy` | `bulk`), params removed (names only, MAX 8 then "+N more"),
chars saved.

**Privacy stance (this is the selling point, state it in the UI):**
stored in `chrome.storage.local` ONLY (never sync), hostname + param
NAMES only — never full URLs, never param values. One-click "Clear
history". Off by default? No — ON by default with the above
minimization; full URLs are what would make it sensitive, and we don't
store them. `keepHistory` toggle (default true) beside the list.

**Mechanics.** background.js `recordHistory(entry)` alongside
recordStats, debounced write of a `history` array in storage.local
(cap 50, FIFO). All five increment sites already flow through
background messages or background-side code, so no new content-script
plumbing.

**Files.** background.js, options.html/options.js/options.css, locales
(histTitle, histHint, histClear, histEmpty, histKindRewrite/Active/
Skip/Copy/Bulk, labelKeepHistory), import sanitize (`keepHistory`
boolean; the history array itself is NOT importable/exportable —
device-local by definition), CHANGELOG, PRIVACY.md gains two sentences.

**Tests.** Pure helper `HistoryBuffer` (push/cap/serialize) in a small
src/history.js loaded via importScripts, unit-tested in
tests/history.test.js (cap behavior, name-only invariant enforced by
the entry builder: it takes param names, there is no field for values).

---

## D. Per-site options layer

**What.** A `siteOpts` storage map giving each site module optional
per-site settings without minting new global toggles. v1.13 ships the
layer plus its first three consumers:
  1. `keepTitles` per-site override (global switch stays; per-site
     tri-state: default / always / never) — Amazon today, ready for
     the next title-capable module.
  2. `pause` (see H) uses the same UI affordance.
  3. Travel sites: per-site widget hide (today hideTravelPopup is
     all-or-nothing across the 7 travel sites).

**Storage shape.**
```
siteOpts: {
  <moduleId>: { keepTitles?: 'always'|'never', hideWidget?: true }
}
```
Only non-default values are stored; empty objects are pruned on write.
`<moduleId>` = the SITE_KEYS id already used for the on/off toggles.

**UI.** In the popup per-site list, each row gains a small gear that
appears on hover/focus for modules with any available option (a static
`SITE_OPTIONS` capability map in popup.js decides). Clicking expands an
inline row (same pattern as group expansion) with the option controls.
No new page; options page is NOT involved in v1.13 (keeps scope down).

**Read path.** Modules stay pure — they already take an options object
(keepTitles pattern). background.js/content scripts resolve
global-then-site-override before calling the module. One resolver
helper `resolveSiteOpts(moduleId, settings)` in a new src/siteopts.js
(pure, unit-testable, importScripts + CommonJS like the rest).

**Import/export.** Sanitizer accepts `siteOpts` with strict shape
validation (known module ids, known keys, known values only — drop
anything else silently, same policy as travelPopupPos).

**Files.** src/siteopts.js (new), popup.js/popup.html/popup.css,
background.js + content.js + site-toolbar.js read path, options.js
sanitize, check-wiring.js (new INFRA entry 'siteopts'; audit that every
SITE_OPTIONS key is a real module id), locales (optGear aria label,
siteOptDefault/siteOptAlways/siteOptNever, siteOptHideWidget), tests
(tests/siteopts.test.js), CHANGELOG, HANDOFF.

**Tests.** Resolver precedence (site override beats global; absent =
global), sanitize round-trip, wiring audit.

---

## E. Active redirect skip (DNR fast path)

**Goal.** Today handleRedirectSkip fires on onBeforeNavigate and
rewrites via tabs.update — the wrapper request still LEAVES the browser
(tracker logs the click) before the tab swerves. A DNR redirect rule
fires before the request is sent: the tracker never hears about the
click at all. That is the same privacy upgrade the Active strip made
for params.

**The constraint that shapes everything.** DNR `regexSubstitution`
cannot URL-decode. Wrapper targets are usually percent-encoded, and a
substituted `https%3A%2F%2F…` or an inner `%3Fx%3D1` produces a WRONG
URL. Therefore:

**Design rule: a DNR skip rule may only match when the embedded target
is provably byte-identical to the real destination.** Concretely the
capture group is `(https?://[^&%#]+)` — target must start with an
UNencoded scheme and contain NO percent-escapes and no fragment. If the
rule doesn't match, nothing happens and the existing webNavigation skip
catches it exactly as today. Fast path + universal fallback; zero new
correctness risk by construction.

**Families in scope (raw or often-raw targets, from the
REDIRECT_SKIP_FILTERS list):**
- google.com//www.google.com `/url` with `q=` or `url=` raw
- l.facebook.com|lm.|l.messenger.com `/l.php` `u=` raw
- l.instagram.com `u=` raw
- out.reddit.com `url=` raw
- youtube.com|www|m `/redirect` `q=` raw
- steamcommunity.com `/linkfilter/` `u=` raw (link filter passes raw)
- t.umblr.com `/redirect` `z=` raw
- href.li — target is the ENTIRE raw query: regexFilter
  `^https?://(?:www\.)?href\.li/\?(https?://[^%#]+)$`
- go.redirectingat.com / go.skimresources.com `url=` raw
- slack-redir.net `/link` `url=` raw
- exit.sc `url=` raw
- vk.com `/away(.php)` `to=` raw
- pixiv.net `/jump.php` raw-query form
- deviantart.com `/users/outgoing?` raw-query form

**Explicitly OUT of DNR scope (stay tab-layer or copy-only):**
- Bing /ck/a (base64) — impossible in DNR.
- DuckDuckGo uddg= — always percent-encoded.
- AMP viewers/CDN — path surgery + junk-strip logic, not expressible.
- disq.us (hash suffix), t.me/iv, Proofpoint/Barracuda/SafeLinks
  (NEVER skipped, same as today — and their hosts get a DNR exclusion
  test proving no rule can match them).
- CJ/Awin/Partnerize/linksynergy — encoded and/or path-embedded;
  affiliate wrappers stay tab-layer.
- googleadservices aclk / bing aclick — copy-only today, unchanged
  (advertiser billing).

**Rules & mechanics.**
- New pure module surface in src/dnr.js: `buildSkipRules({skipDomains})`
  returning ~16 regexFilter rules, ids 900101…900199 (block reserved;
  ACTIVE_RULE_ID 900001 untouched). Each rule: `main_frame` only,
  `redirect.regexSubstitution: "\\1"`, `excludedRequestDomains` from
  the user's skip list.
- `isSkipRule(id)` helper so background can manage the two rule sets
  independently in updateDynamicRules.
- Toggle: `enabledActiveSkip` (default follows `enabledRedirectSkip`?
  No — its own switch, default OFF like the Active strip, NEW badge
  moves here). Gated on master AND on the same optional `*://*/*`
  grant as the Active strip (single permission story; many wrapper
  hosts are already static host_permissions, but one consistent gate
  is simpler to explain in the popup and to reviewers).
- Permission interlock update: hand back the optional grant only when
  Active strip AND Universal strip AND Active skip are ALL off.
- Attribution: the DNR redirect commits with the destination URL; the
  existing onBeforeNavigate/onCommitted pairing sees wrapper→target.
  Detect `RedirectUnwrapper.unwrapRedirects(started.url) ===
  details.url` → record `skips` stat + stashOriginal (chip parity with
  tab-layer skips) + badge/history. handleRedirectSkip stays untouched
  as the fallback; double-fire is impossible (if DNR redirected, the
  wrapper URL never reaches onBeforeNavigate as a committed nav — the
  pairing sees ONE navigation, same shape as active-strip blocks).
- Firefox: DNR + regexSubstitution supported in 140+ (our
  strict_min_version). Same code path.

**Store copy.** Chrome permission justification needs a one-line
addition (same permission, second use). Reviewer notes explain the
byte-identical guard — reviewers will ask about redirect rules.

**Files.** src/dnr.js, tests/dnr.test.js (every family: raw target →
redirected, encoded target → NO match, protection hosts → no rule
matches, skip-domain exclusion), src/background.js (sync/permission/
attribution), popup (switch + NEW badge move), options 3-way status
text stays but the copy generalizes ("network-layer features"),
locales (labelActiveSkip, tipActiveSkip, + optStrip* rewording),
check-wiring FEATURE_FLAGS + INFRA, STORE_LISTING, CHANGELOG,
SPEC-active-mode.md gets a pointer note.

---

## F. Clean all links on this page

**What.** Popup button (footer row, next to Bulk): rewrites the href of
every `<a>` in the page through the full pipeline (unwrap → site module
→ universal strip), one shot, user-initiated. Visible count feedback
("Cleaned 23 of 187 links"). No automatic/continuous rewriting — that
stays explicitly out (PLAN "not doing": silent rewriting).

**Mechanics.** VERIFIED 2026-09-13: `scripting` AND `activeTab` are
both already in manifest permissions — this works on EVERY site with
zero new permissions. Path: popup click grants activeTab →
`scripting.executeScript` injects a function that walks
`document.links` and sends hrefs in one batch message to background →
background maps them through cleanAnyUrl (the bulk pipeline) → content
side applies the mapping. Same-URL results are skipped;
javascript:/mailto:/# links untouched; shadow DOM ignored in v1.13
(note in HANDOFF).

**Files.** popup.html/js/css, background (batch handler reusing bulk
pipeline), locales (btnCleanPage, cleanPageDone($1,$2), cleanPageNone),
CHANGELOG. Stats: counts as `bulk` kind in stats/history.

**Tests.** The href-mapping is the existing bulk pipeline (already
tested); new unit tests only for the link-filter predicate (skip
mailto/js/#/same-URL), extracted pure into src/pagelinks.js.

---

## G. Self-healing report flow

**What.** Today reportCleanup opens a prefilled GitHub issue. Upgrade:
when the popup shows a cleaned/blocked state, "Report a problem"
expands three actions:
  1. **Undo on this site** — adds the hostname to skipDomains
     (universal/active layers) or flips the site toggle off (per-site
     module match), immediately; confirmation toast names exactly what
     it did.
  2. **Copy original URL** — from the existing stashOriginal store.
  3. **Report on GitHub** — the existing prefilled issue, now also
     carrying which layer acted (module id / universal / active /
     skip) and the param names removed — never the full URL unless the
     user pastes it themselves (privacy: issue body says "paste the
     link if you can share it").

**Files.** popup.html/js/css, background (layer info is already
derivable from stash + activeBlocks + last rewrite report; expose in
the existing per-tab info message), locales (fixMenuTitle, fixUndoSite,
fixUndoDone($1), fixCopyOriginal, fixReport), CHANGELOG.

**Tests.** Pure resolver "which layer acted" given the three info
sources → tests/fixflow.test.js.

---

## H. Per-tab pause

**What.** Popup quick action: "Pause on this tab" — suspends ALL
layers for that tab id until navigation away to a different origin, tab
close, or manual resume. For debugging sites and one-off workflows.
Session-only (tab ids die with the session; storage.session map
`pausedTabs`).

**Mechanics.** Content scripts ask background at document_start
(existing settings round-trip — piggyback the paused bit on it);
active strip/skip: DNR rules can't be per-tab → per-tab pause instead
adds the tab's CURRENT origin to a session-scoped exclusion that
rebuilds the dynamic rules' excludedRequestDomains union (user skip
list ∪ paused origins), removed on resume/close. handleRedirectSkip
and the badge check the map directly.

**Files.** background.js, popup (button + paused-state banner),
src/dnr.js (buildRules/buildSkipRules take extraExcludes), locales
(btnPauseTab, btnResumeTab, pausedBanner), tests (dnr extraExcludes
union/dedupe), CHANGELOG.

---

## I. Master-toggle keyboard shortcut

**What.** Second command in manifest `commands`: `toggle-master`
(no suggested_key by default — copy-clean keeps the prime binding;
users bind this one themselves, tipShortcutUnset pattern already
educates). Handler flips `enabled` in storage.sync; badge + a brief
action title change ("Rather's Link Shortener (off)") confirm state.

**Files.** manifest.json (commands block — NOT a permission), both
package scripts untouched (manifest is copied), background command
handler, locales (cmdToggleMaster description via manifest i18n
`__MSG_cmdToggleMaster__`), CHANGELOG.

---

## J. Bulk cleaner file drop

**What.** bulk.html accepts drag-and-drop (and a file picker button) of
.txt / .csv / .md / .html files; reads locally via FileReader, dumps
into the existing textarea pipeline. For .html, extract href values +
visible text URLs first (DOMParser, local). Size cap 5 MB with a
friendly error. Nothing uploaded anywhere — same page copy reinforces.

**Files.** bulk.html/js/css, locales (bulkDropHint, bulkPickFile,
bulkTooBig($1)), CHANGELOG.

**Tests.** href-extraction helper pure in bulk.js? — extract into
src/htmllinks.js (pure, DOMParser injected) if unit-testing is wanted;
otherwise manual. Decide at build; default: extract + test.

---

## K. Locales: it, nl, pl

Full messages.json for Italian, Dutch, Polish (13 locales total).
Written by the same process as the last batch: translate from en with
the de/es/fr files as register reference, native diacritics from the
start (the v1.12 fixdiacritics lesson), check-wiring orphan audit
enforces key parity. Store listings: translate the AMO summary line
only (store descriptions stay English for now — separate decision).

**Files.** _locales/it|nl|pl/messages.json, check-wiring locale count
10→13, package scripts untouched (glob copy), CHANGELOG, README badge
counts.

---

## L. Firefox Android + carried-over checks

- AMO listing: enable Android compatibility (gecko_android already in
  the built manifest since 1.11). USER step in the AMO dashboard.
- Physical test on a Firefox Android device/emulator: popup renders,
  address-bar rewrite works, travel widget auto-hide, active strip
  toggle grants permission properly.
- Expedia/Agoda modal click-through (5 minutes, close the item).
- Draggable travel widget hand-verification (shipped 1.12, never
  clicked by a human).
- Eventbrite ccTLDs: STILL parked (permission footprint rule).

---

## M. Cross-cutting

**New storage keys.** `showBadge` (sync, default true), `keepHistory`
(sync, default true), `history` (local, ring buffer), `siteOpts`
(sync, sparse map), `enabledActiveSkip` (sync, default false),
`pausedTabs` (session). Import sanitize: showBadge, keepHistory,
siteOpts (validated), enabledActiveSkip (enabled[A-Z] regex already
admits it); history and pausedTabs are never exported.

**check-wiring.js additions.** FEATURE_FLAGS += showBadge,
enabledActiveSkip; INFRA += siteopts, pagelinks, history (+ htmllinks
if built); locale count 13; SITE_OPTIONS-id audit.

**Build order (each step lands green before the next):**
 1. A — denylist (an hour, ships value immediately if 1.13 slips)
 2. src/siteopts.js + D storage/read path (no UI yet)
 3. B badge + C history (share the increment plumbing — build together)
 4. D popup UI (gear rows)
 5. E active skip (spec'd hardest — dnr.js rules + tests FIRST, then
    background wiring, then popup)
 6. H pause (depends on E's extraExcludes)
 7. F clean-page + G fix flow (popup-heavy pair)
 8. I shortcut, J bulk drop (independent, any time)
 9. K locales LAST (after every string exists in en)
10. Docs/store/promo pass, screenshots (badge + history are the
    photogenic ones), package, live test matrix, ship.

**Test plan.** Every new pure module gets a tests/*.test.js (dnr skip
rules the big one: ~40 new checks incl. the encoded-target NO-match
suite and protection-host immunity). Wiring checker green. Live
matrix in a real profile: google /url raw + encoded, l.facebook,
out.reddit, href.li, a Bing /ck/a (must fall back to tab-layer), a
SafeLinks link (must NOT skip), badge counts across all three layers,
history entries name-only, pause end-to-end, per-site keepTitles
override on Amazon, clean-page on a news article, bulk file drop,
master shortcut, the three new locales spot-checked.

**Risks / open decisions.**
 1. ~~F's injection path~~ RESOLVED: scripting + activeTab already
    held; universal scope, no new permissions.
 2. E rule count and regex length limits (2KB regexFilter cap) — 16
    short rules, comfortably inside; verified in tests via
    isRegexSupported at build time? (chrome.declarativeNetRequest.
    isRegexSupported check added to syncActiveSkip defensively.)
 3. Badge default-on could annoy — mitigation: it's one switch, and
    history explains what it counted.
 4. Chrome review: second use of the DNR permission with redirect
    rules may draw questions — reviewer-notes paragraph ready
    (byte-identical guard, no network, off by default).
 5. Scope: this is a big release. The build order is a priority
    order — if anything must drop, drop from the bottom of features
    (J, I), never from tests/docs.

---

## N. Parallel track: ratherlinks.com /trackers/ glossary

Not extension code; jimothylinks repo. Static generator (build-time
Python or hand-rolled) emitting one page per major param family —
what it is, who sets it, what breaks if removed (nothing), one-line
provenance, and the paste-a-link demo cleaner (existing client-side
JS) — fed from a small params.json derived from utm.js's comments.
15-20 pages initial batch: fbclid, gclid, igsh(id), mibextid, srsltid,
utm_* (one page), wbraid/gbraid, ttclid, msclkid, twclid, epik,
li_fat_id, mc_eid, _hsenc, sccid, rdt_cid, mkt_tok, vero_id. Index
page + nav link. sitemap.xml. No tracking on the pages themselves —
that IS the pitch. Ship independently of 1.13, first draft can land
this cycle.
