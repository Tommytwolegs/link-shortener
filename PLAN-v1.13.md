# Plan: v1.13 and beyond

Drafted 2026-09-13, after v1.12.0 shipped to Chrome + AMO. Edge Web Store
submission is explicitly PARKED by decision (not interesting right now).

---

## Approved for the v1.13 cycle

### 1. Per-site options layer
When "Keep item titles in links" was generalized in v1.11, we noted the
natural next structure: a per-site preferences system, so future
site-specific choices (title style, param keeps, widget behavior) don't
each become a new global toggle. Needs a spec first: where it lives
(popup dropdown per site row vs. options page section), storage shape
(one `siteOpts` map keyed by module id), and how check-wiring audits it.

### 2. Stripped-count badge on the toolbar icon
Skipped twice as polish-vs-noise, but the Active strip changed the
calculus: we now have a real per-tab blocked count (`activeBlocks`) plus
the address-bar cleanups. Badge shows count for the current tab, clears
on navigation. Off by default or on by default - decide during build.
Uses `action.setBadgeText`, no new permissions.

### 3. Local-only "what got stripped" history
Small ring buffer (say 50 entries) in storage.session or storage.local:
time, site, params removed, chars saved. Rendered in the popup behind a
disclosure or on the options page next to stats. Never synced, never
leaves the device, one-click clear. Pairs with the badge: badge says
"something happened", history says "here is what".

### 4. Active redirect skip (network-layer, same permission)
The natural flagship. Redirect skip currently rewrites at the tab layer;
the known redirector patterns (Google /url, Facebook l.php, outlook
safelinks-style wrappers we already parse in redirect.js) could ALSO be
skipped pre-request with DNR `regexSubstitution` dynamic rules, riding
the same `declarativeNetRequestWithHostAccess` + optional host permission
the Active strip already holds. The redirect page never even loads.
Needs a spec like SPEC-active-mode.md: which redirector families are
expressible as safe regex substitutions, URL-decode limits of
regexSubstitution, rule count budget, and attribution (reuse the
onBeforeNavigate/onCommitted pairing).

### 5. Universal denylist additions: Facebook mobile-share trackers
`mibextid` and `sfnsn` are stripped only by facebook.js today, but they
are appended to OUTBOUND links shared through Facebook/Messenger mobile,
so they show up on every other site. Both names are unambiguous -
promote to utm.js universal denylist (+ dnr.js exact expansion + tests).
Cheap, real coverage win. While in there: sweep AdGuard's URL Tracking
filter and ClearURLs rules for any other universal-safe params we lack
(manual curation, still zero-network).

### 6. Small deferred fixes (carried forward)
- Eventbrite secondary-storefront ccTLDs leak `aff`/`afu` - only worth
  folding in if those hosts get added for other reasons (permission
  footprint).
- Expedia/Agoda modal manual click-through (URL-state check).
- Draggable travel widget live test on a booking site (shipped in 1.12,
  never hand-verified).
- Firefox Android: physically test the xpi; enable Android compatibility
  on the AMO listing (gecko_android is already in the manifest).

---

## New candidates from the 2026-09-13 research round

### Product
- **"Clean all links on this page" action.** One-shot popup button that
  rewrites every anchor href through the existing pipeline. Visible,
  user-initiated (no silent DOM rewriting like ClearURLs does), great
  demo. Content-script + existing cleanAnyUrl plumbing.
- **Self-healing report flow.** When a user hits a broken cleanup:
  one click in the popup = undo for that site + add to skip list +
  prefilled GitHub issue. Turns the #1 complaint about URL cleaners
  (over-stripping, see ClearURLs reviews) into a strength.
- **Per-tab pause.** "Pause on this tab" quick action for debugging or
  awkward sites; auto-expires. Cheap once per-site options exist.
- **Keyboard shortcut to toggle the master switch** (commands API);
  the copy-clean shortcut already exists.
- **Bulk cleaner: file drop.** Accept a dropped .txt/.html/.csv into the
  bulk page. Minor effort, differentiator nobody else has.

### Distribution and growth
- **ClearURLs is effectively unmaintained** (last update Feb 2025,
  GitHub issues restricted) - its users are actively shopping for
  alternatives. Position the listings and the site accordingly
  ("actively maintained", comparison page). No keyword spam in the
  Chrome description; the site can say what the store cannot.
- **ratherlinks.com /trackers/ glossary.** Competitors (linkclean.app,
  fbclid-igsh.com, prunethe.link) run SEO pages per tracker param
  ("what is igsh", "what is mibextid", "what is srsltid") feeding their
  install funnel. We already have better per-param knowledge in utm.js's
  comments - generate a static glossary page per major param + the
  paste-a-link cleaner demo. Biggest organic-discovery lever available.
- **More locales.** 10 now (de, en, es, fr, ja, ko, pt_BR, ru, tr,
  zh_CN); it, nl, pl are cheap adds with real store-search reach.
- **Safari port** - PARKED: requires Mac + Xcode + $99/yr Apple
  Developer membership; xcrun safari-web-extension-converter makes the
  code side tractable if that ever changes.

### Explicitly not doing
- Anything requiring network requests (rule downloads, link expansion
  services). Zero-network is the product's spine.
- Silent in-page href rewriting as default behavior (site breakage +
  review risk); the one-shot button above is the visible version.
- Edge Web Store (parked by decision, revisit whenever).

---

## Suggested shape for v1.13

Theme: "sees more, shows more, breaks nothing".
1. mibextid/sfnsn universal + denylist sweep (day one, low risk)
2. Badge + history (the visibility pair)
3. Per-site options spec, then build
4. Active redirect skip spec (build in 1.13 only if the spec comes out
   clean; otherwise it IS v1.14)
5. Firefox Android enablement + the small deferred checks
