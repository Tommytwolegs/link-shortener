# Spec: Active mode (network-layer tracking-param removal)

Status: **draft for review**. Target: v1.12.0, after v1.11.0 ships.

## Goal

Today the extension is reactive: the request goes out carrying `?utm_source=...`,
the server sees it, and *then* we clean the address bar. Active mode strips
tracking params **before the request leaves the browser**, so the destination
never receives them.

Shipped as a feature in the existing extension, not a separate app. Off by
default, opt-in, reusing the permission machinery that already exists.

## Why not in-page anchor rewriting

Rejected. `utm-content.js` already documents why (lines 29-33): anchor hrefs
carry session-specific state the host site uses for attribution, impressions,
and security tokens, so rewriting them in place risks breaking site behavior.
It also doesn't achieve the goal: SPAs re-render, and JS `onclick` handlers
navigate to the original URL regardless of what `href` says.

`declarativeNetRequest` (DNR) operates at the network layer and catches every
navigation type: anchor clicks, JS navigation, redirects, typed URLs. It's
declarative, so no JS runs per request. It is cheaper than a content script,
not more expensive.

## Architecture

### Permission model (already built)

No new install-time permission warning is expected. Reuse what exists:

- `optional_host_permissions: ["*://*/*"]` -- already in the manifest, already
  approved by both stores.
- `popup.js:734` already calls `chrome.permissions.request({origins:['*://*/*']})`.
- `background.js:687` already calls `chrome.permissions.remove` when the flag
  goes off.

Add `"declarativeNetRequestWithHostAccess"` to `permissions`. This variant only
acts on hosts where host permission was granted, which maps exactly onto the
optional-permission model.

**MUST VERIFY IN SPIKE:** that adding `declarativeNetRequestWithHostAccess`
introduces no new user-visible permission warning at install. If it does, the
whole "feature, not separate app" premise needs revisiting. (Plain
`declarativeNetRequest` is the variant to avoid.)

### Rules: dynamic, not static

The user can edit the skip/keep lists at runtime, so rules must be regenerated
on change. Use **dynamic rules**, not static rulesets.

Rule count is tiny: one rule can remove many params at once. Expect 1-3 rules
total, against a 30,000 dynamic-rule limit. Non-issue.

```js
{
  id: 1,
  priority: 1,
  action: {
    type: "redirect",
    redirect: { transform: { queryTransform: { removeParams: [ /* names */ ] } } }
  },
  condition: {
    resourceTypes: ["main_frame"],
    excludedRequestDomains: [ /* utmStripSkipDomains */ ]
  }
}
```

### The prefix problem (main design constraint)

`queryTransform.removeParams` takes **exact param names**. It does not support
prefix or wildcard matching. `utm.js` denylists 9 prefixes:

    utm_  pk_  piwik_  mtm_  matomo_  hsa_  _bsft_  iterable_  mailgun_

Resolution -- three layers:

1. **Exact names** (~90 entries in `TRACKING_PARAMS`: gclid, fbclid, msclkid,
   igshid, mc_cid, irclickid, ...) go straight into `removeParams`.
2. **Enumerated prefix expansions**: hardcode the concrete params that actually
   occur in the wild (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`,
   `utm_content`, `utm_id`, `utm_source_platform`, `utm_creative_format`,
   `utm_marketing_tactic`, and the equivalents for `pk_`/`mtm_`/`matomo_`).
   This covers effectively all real traffic.
3. **Long tail** (`utm_somethingunusual`): still caught by the existing
   `utm-content.js` address-bar pass, which stays enabled. Active mode is
   additive; it does not replace the passive path.

Do not attempt regex rules for prefixes in v1. Higher complexity, worse
failure modes, no meaningful coverage gain.

### Scope: `main_frame` only in v1

`resourceTypes: ["main_frame"]` only. Do not touch XHR/fetch/sub_frame.
Stripping params off an API call is how you break a site badly, and it buys
almost nothing -- the goal is about navigations. Revisit later if warranted.

### Honoring existing settings

Both existing user lists must be respected; this is reuse, not new UX:

- `utmStripSkipDomains` -> `condition.excludedRequestDomains`
- `utmStripKeepParams`  -> subtracted from the generated `removeParams` list

## Blast radius (the real risk)

This is a categorical change, and the spec should be honest about it.

Today an over-strip is cosmetic: the page loaded fine, the address bar is
merely wrong. Under DNR an over-strip **breaks the actual request**. The
`fromage` bug from the v1.11.0 audit would have been a broken Indeed search
page instead of a slightly-wrong URL.

Mitigations, in priority order:

1. **Narrower denylist than passive mode.** Active mode uses only the
   universal `utm.js` denylist. It does NOT apply the 216 per-site modules'
   allowlist/path-collapsing logic. Those keep running passively.
2. `main_frame` only (above).
3. Off by default, explicit opt-in, plain-language description.
4. Per-site pause, and the existing skip-domains list.
5. Ship with a visible affordance so a user who hits breakage can find the
   off switch fast.

Note on OAuth/checkout: collision risk is low by construction, since OAuth uses
`code`/`state`/`token` and none of those are on the denylist. But it is the
scenario to probe hardest during testing, because it is the worst failure.

## Testing strategy

DNR rules can't be unit tested with plain node the way pure functions can.
Preserve the zero-dependency model by splitting the logic:

- **Pure + testable:** a `buildRules(trackingParams, keepParams, skipDomains)`
  function returning rule objects. Unit test this like every other module --
  covers keep-list subtraction, skip-domain wiring, prefix expansion, dedupe.
- **Browser integration:** manual/driven checks that params are actually gone
  from the outbound request (verify via the network panel or a request-echo
  endpoint, not just the address bar -- the address bar looking clean proves
  nothing here, since passive mode also cleans it).
- **Redirect-loop check:** confirm a transformed URL doesn't re-trigger the
  rule. Chrome suppresses no-op redirects, but verify explicitly.

## UX

- New popup switch, sibling to "Universal tracking strip": working title
  **"Block trackers before they load"** (clearer than "Active mode" for a
  general audience).
- Requesting the same `*://*/*` optional permission on enable; hand it back on
  disable, matching current behavior.
- Wire into the existing stats counters so users can see it working.
- New i18n keys across all 10 locales (`labelActiveMode`, `tipActiveMode`).
- Honest copy: this stops **URL-borne** tracking reaching the destination. It
  does not stop analytics scripts, cookies, or fingerprinting. Overpromising
  on privacy is what draws reviewer scrutiny.

## Relationship to Copy Clean URL (it does NOT replace it)

Measured, not assumed: `utm.js` holds **92 exact params, and none of them are
per-site tracking params**. Checked and absent: `si`, `tag`, `linkCode`, `ref`,
`ref_`, `_trkparms`, `_trksid`, `trk`, `tt_content`, `from`, `tk`, `vjs`.

So active mode covers cross-site campaign/click IDs only. It will NOT strip
YouTube's `si`, Amazon's affiliate `tag`, eBay's `_trkparms`, or IMDb's `ref_`
from the outbound request. Those stay with the passive per-site modules.

What active mode does subsume: when a URL's only junk is `utm_`/`gclid`-class
params, the redirect leaves a clean address bar, so a plain Ctrl+L Ctrl+C gets
the same string the button would.

What the button keeps doing:

- Per-site params -- the bulk of what the 216 modules do.
- **Path collapsing.** `/Long-Slug/dp/ASIN/ref=sr_1_3` -> `/dp/ASIN` is a path
  transform; `queryTransform` structurally cannot express it.
- Redirect unwrapping.
- Copy formats: Markdown, HTML, title+URL, QR, Copy original.
- Bulk cleaner and the selection context menu -- text that was never a request.

The two features should stay separate because their **blast radius differs, so
their aggressiveness should differ**. Active mode must stay conservative (a
wrong strip breaks a page). The copy path can stay aggressive (a wrong strip is
a clipboard you re-copy). Active mode protects the user while browsing; the
button produces something to hand to someone else.

### Attribution in the popup (design in now, not later)

With active mode on, the popup will report "already clean" far more often,
because the params were removed before the page loaded. That reads to a user as
*the extension isn't doing anything*, which is exactly backwards and is how an
extension loses its perceived value and gets uninstalled.

Requirement: when active mode removed something from a navigation, the popup
must attribute it rather than falling through to the generic "already clean"
state. Wording along the lines of "Blocked before load" / "N trackers blocked
before this page loaded."

Implementation note: this needs the removal to be *observable*. DNR rule
matches are not reported to the extension by default, so decide during the
spike how to source the count. Options, cheapest first:

- Compare the pre-navigation URL to the committed URL via the existing
  `webNavigation` permission, and diff the params. No new permission needed.
- `getMatchedRules()` (requires the `declarativeNetRequestFeedback` permission,
  which may carry a warning -- verify before relying on it).

Prefer the `webNavigation` diff if it is sufficient; it reuses a permission
already held and keeps the install-time warning story unchanged. Feed the
result into the existing stats counters.

## Store review implications

- Chrome: expect added scrutiny for a network-modifying extension. The single-
  purpose statement should explicitly cover request modification.
- AMO: reviewer notes should state that rules are generated locally from a
  static denylist, that nothing is fetched, and that no request bodies or URLs
  are logged or transmitted.

## Spike (do this before committing to the feature)

Small, self-contained, doesn't touch v1.11.0:

1. Confirm `declarativeNetRequestWithHostAccess` adds no install-time warning.
2. Generate one dynamic rule from `utm.js` exact names, gated behind the
   existing optional permission.
3. Verify on a live URL that params are absent from the **outbound request**.
4. Confirm no redirect loop, and that the skip/keep lists take effect.
5. Determine how to source the "blocked before load" count for popup
   attribution -- try the `webNavigation` URL diff first, and only fall back to
   `getMatchedRules()`/`declarativeNetRequestFeedback` if that proves
   insufficient (check whether it adds a permission warning first).

If all five pass, the rest is mostly wiring and copy.

## Out of scope for v1

- Per-site module logic at the network layer (path collapsing, redirect
  unwrapping). Stays passive.
- Regex-based prefix matching.
- Non-`main_frame` resource types.
- Blocking whole tracker domains. That is an ad-blocker, a different product.
