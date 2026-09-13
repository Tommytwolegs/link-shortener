// dnr.js
// ----------------------------------------------------------------------------
// Pure builder for the Active-strip declarativeNetRequest dynamic rules, plus
// the URL-diff helper the attribution path uses. No chrome.* calls here — the
// background owns the rule lifecycle; this file only computes values, so the
// whole thing is unit-testable in plain Node like every other module.
//
// Why this exists (see SPEC-active-mode.md):
//   queryTransform.removeParams is EXACT-MATCH ONLY. utm.js expresses nine
//   tracker families as prefixes (utm_, pk_, mtm_, ...); a DNR rule cannot.
//   PREFIX_EXPANSIONS enumerates the concrete names those families actually
//   use in the wild. The long tail (utm_somethingweird) is still caught by
//   the passive utm-content.js address-bar pass, which stays enabled — the
//   active strip is additive, not a replacement.
//
// Blast-radius note: an over-strip here breaks the REQUEST, not just the
// address bar. Only the universal utm.js denylist feeds this rule — never
// per-site params — and the rule is main_frame only by construction.
//
// Loaded via background importScripts (Chrome) / background.scripts (Firefox)
// and as a CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // High, stable id — the extension has no static rulesets, but keeping the
  // dynamic id out of low ranges costs nothing and avoids future collisions.
  const ACTIVE_RULE_ID = 900001;

  // Concrete param names for each prefix family in utm.js. A unit test
  // asserts every utm.js TRACKING_PARAM_PREFIXES entry has a row here, so
  // adding a prefix to utm.js without teaching the active strip about it
  // fails the suite instead of silently narrowing coverage.
  const PREFIX_EXPANSIONS = {
    'utm_': [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'utm_id', 'utm_source_platform', 'utm_creative_format',
      'utm_marketing_tactic', 'utm_name', 'utm_referrer',
    ],
    'pk_': ['pk_campaign', 'pk_kwd', 'pk_source', 'pk_medium', 'pk_content', 'pk_cid'],
    'piwik_': ['piwik_campaign', 'piwik_kwd'],
    'mtm_': [
      'mtm_campaign', 'mtm_keyword', 'mtm_source', 'mtm_medium',
      'mtm_content', 'mtm_cid', 'mtm_group', 'mtm_placement',
    ],
    'matomo_': ['matomo_campaign', 'matomo_kwd'],
    'hsa_': [
      'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src',
      'hsa_tgt', 'hsa_kw', 'hsa_mt', 'hsa_net', 'hsa_ver',
    ],
    '_bsft_': ['_bsft_aaid', '_bsft_eid', '_bsft_mime_type', '_bsft_link_id', '_bsft_tv'],
    'iterable_': ['iterable_campaign', 'iterable_template'],
    'mailgun_': ['mailgun_cid', 'mailgun_mid'],
  };

  // Hostname entries from the user's skip list, normalized for DNR's
  // excludedRequestDomains (lowercase, no leading dot; DNR itself matches
  // the domain and all subdomains, which mirrors the utm-content.js
  // suffix-match semantics). Invalid entries are dropped, not fatal.
  const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  function normalizeSkipDomains(skipDomains) {
    const out = [];
    const seen = new Set();
    for (const raw of Array.isArray(skipDomains) ? skipDomains : []) {
      if (typeof raw !== 'string') continue;
      const d = raw.trim().toLowerCase().replace(/^\.+/, '');
      if (!d || !DOMAIN_RE.test(d) || seen.has(d)) continue;
      seen.add(d);
      out.push(d);
    }
    return out;
  }

  // Exact names + prefix expansions, minus the user's keep list. Lowercase
  // throughout: real-world tracker params are lowercase, and DNR removeParams
  // is case-sensitive — documented limitation, not worth 4x-ing the list.
  function buildRemoveParams(params, keepParams) {
    const keep = new Set();
    for (const k of Array.isArray(keepParams) ? keepParams : []) {
      if (typeof k === 'string' && k.trim()) keep.add(k.trim().toLowerCase());
    }
    const out = [];
    const seen = new Set();
    const push = (name) => {
      const n = String(name).toLowerCase();
      if (!n || seen.has(n) || keep.has(n)) return;
      seen.add(n);
      out.push(n);
    };
    for (const p of params || []) push(p);
    for (const family of Object.keys(PREFIX_EXPANSIONS)) {
      for (const p of PREFIX_EXPANSIONS[family]) push(p);
    }
    return out;
  }

  // The dynamic rule set for the active strip: one redirect-transform rule,
  // main_frame only. Returns [] when nothing survives the keep list, so the
  // caller can skip addRules entirely.
  function buildRules(opts) {
    const o = opts || {};
    const removeParams = buildRemoveParams(o.params, o.keepParams);
    if (removeParams.length === 0) return [];
    const rule = {
      id: ACTIVE_RULE_ID,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { transform: { queryTransform: { removeParams } } },
      },
      condition: {
        resourceTypes: ['main_frame'],
      },
    };
    const excluded = normalizeSkipDomains(o.skipDomains);
    if (excluded.length > 0) rule.condition.excludedRequestDomains = excluded;
    return [rule];
  }

  // Attribution helper: does `afterHref` equal `beforeHref` minus only params
  // from `removeSet`? Returns the number of removed occurrences, or -1 when
  // the pair is not a pure removal (different page, params added, values
  // changed, or a removed param that is not ours). The background diffs
  // consecutive webNavigation events through this, so a site's own redirect
  // never gets miscounted as an active block.
  function diffRemovedParams(beforeHref, afterHref, removeSet) {
    let before;
    let after;
    try {
      before = new URL(beforeHref);
      after = new URL(afterHref);
    } catch (_e) {
      return -1;
    }
    if (before.origin !== after.origin) return -1;
    if (before.pathname !== after.pathname) return -1;
    if (before.hash !== after.hash) return -1;

    const remaining = [];
    for (const [k, v] of after.searchParams) remaining.push(k + '=' + v);

    // Every param kept in `after` must have been present in `before` with the
    // same value (multiset containment); everything missing must be ours.
    const pool = new Map();
    for (const [k, v] of before.searchParams) {
      const key = k + '=' + v;
      pool.set(key, (pool.get(key) || 0) + 1);
    }
    for (const key of remaining) {
      const n = pool.get(key) || 0;
      if (n === 0) return -1; // param added or value changed — not a removal
      if (n === 1) pool.delete(key);
      else pool.set(key, n - 1);
    }
    let removed = 0;
    for (const [key, n] of pool) {
      const name = key.slice(0, key.indexOf('=')).toLowerCase();
      const ours = removeSet && (typeof removeSet.has === 'function'
        ? removeSet.has(name)
        : Array.prototype.includes.call(removeSet, name));
      if (!ours) return -1; // something else removed this — not our rule
      removed += n;
    }
    return removed;
  }

  // ---------------------------------------------------------------------------
  // Active redirect skip (v1.13): DNR redirect rules that jump straight to a
  // wrapper's embedded destination BEFORE the request to the wrapper is sent,
  // so the click tracker never hears about the click at all.
  //
  // THE design rule: a skip rule may only match when the embedded target is
  // provably BYTE-IDENTICAL to the real destination. regexSubstitution cannot
  // URL-decode, so every capture group requires an UNencoded scheme and
  // forbids '%' outright — any percent-encoded target simply doesn't match
  // and falls through to the existing tab-layer skip (webNavigation +
  // tabs.update), which decodes properly. Fast path + universal fallback;
  // no correctness risk by construction.
  //
  // For ?param=target families the capture also stops at '&' — exactly where
  // the wrapper's own server-side parser stops, so truncation behavior is
  // byte-identical to the wrapper too. Raw-query families (href.li,
  // DeviantArt outgoing) take the WHOLE query as the target, '&' included,
  // matching their servers.
  //
  // Deliberately ABSENT here (tab-layer or copy-only, as before):
  //   * Bing /ck/a (base64) and DuckDuckGo uddg= (always encoded) — cannot
  //     or will never match byte-identical.
  //   * AMP viewers/CDN — path surgery + junk stripping, not expressible.
  //   * disq.us (hash suffix), t.me/iv, YouTube attribution_link (relative
  //     targets).
  //   * Enterprise protection wrappers (SafeLinks, Proofpoint, Barracuda) —
  //     NEVER skipped anywhere; a test asserts no rule can match them.
  //   * Affiliate wrappers (CJ, Awin, Partnerize, linksynergy) and ad-click
  //     wrappers — unchanged policy from the tab-layer list.
  // ---------------------------------------------------------------------------

  // Param-style capture: unencoded scheme, no %, stops at & / # / end.
  const CAP = '(https?://[^&%#]+)';
  // Raw-query capture: the whole remaining query is the target; & allowed.
  const CAP_RAW = '(https?://[^%#]+)';
  const TAIL = '(?:[&#].*)?$';

  function qsPattern(hosts, path, params) {
    return '^https?://(?:' + hosts + ')' + path + '\\?(?:[^#]*&)?(?:' + params + ')=' + CAP + TAIL;
  }

  // [id, regexFilter] — ids are stable API: never renumber, only append.
  const SKIP_RULE_DEFS = [
    [900101, qsPattern('(?:www\\.)?google\\.com', '/url', 'q|url')],
    [900102, qsPattern('l\\.facebook\\.com|lm\\.facebook\\.com|l\\.messenger\\.com', '/l\\.php', 'u')],
    [900103, qsPattern('l\\.instagram\\.com', '/', 'u')],
    [900104, qsPattern('out\\.reddit\\.com', '/', 'url')],
    [900105, qsPattern('(?:www\\.|m\\.)?youtube\\.com', '/redirect', 'q')],
    [900106, qsPattern('(?:www\\.)?steamcommunity\\.com', '/linkfilter/', 'u|url')],
    [900107, qsPattern('t\\.umblr\\.com', '/redirect', 'z')],
    [900108, '^https?://(?:www\\.)?href\\.li/\\?' + CAP_RAW + '$'],
    [900109, qsPattern('go\\.redirectingat\\.com|go\\.skimresources\\.com', '/[^?#]*', 'url')],
    [900110, qsPattern('(?:www\\.)?slack-redir\\.net', '/link', 'url')],
    [900111, qsPattern('(?:www\\.)?exit\\.sc', '/[^?#]*', 'url')],
    [900112, qsPattern('(?:www\\.|m\\.)?vk\\.com', '/away(?:\\.php)?', 'to')],
    [900113, qsPattern('(?:www\\.)?pixiv\\.net', '/jump\\.php', 'url')],
    [900114, '^https?://(?:www\\.)?pixiv\\.net/jump\\.php\\?' + CAP + '$'],
    [900115, '^https?://(?:www\\.)?deviantart\\.com/users/outgoing\\?' + CAP_RAW + '$'],
  ];

  const SKIP_RULE_IDS = SKIP_RULE_DEFS.map((d) => d[0]);

  // The dynamic rule set for the active skip. skipDomains excludes wrapper
  // REQUEST domains, mirroring the active strip's semantics.
  function buildSkipRules(opts) {
    const o = opts || {};
    const excluded = normalizeSkipDomains(o.skipDomains);
    return SKIP_RULE_DEFS.map(([id, regexFilter]) => {
      const rule = {
        id,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { regexSubstitution: '\\1' },
        },
        condition: {
          regexFilter,
          resourceTypes: ['main_frame'],
        },
      };
      if (excluded.length > 0) rule.condition.excludedRequestDomains = excluded;
      return rule;
    });
  }

  // The same regexes as JS RegExp objects ('i' mirrors DNR's default
  // case-insensitive matching). The background's tab-layer skip handler
  // uses this to stand down when the DNR fast path will handle a URL —
  // and the unit tests use it to pin the patterns' behavior.
  const SKIP_RES = SKIP_RULE_DEFS.map(([, p]) => new RegExp(p, 'i'));
  function skipRuleWouldMatch(url) {
    if (typeof url !== 'string') return false;
    for (const re of SKIP_RES) {
      if (re.test(url)) return true;
    }
    return false;
  }

  // What a matching rule redirects to, computed with the same regexes.
  // Returns null when no rule matches. Tests compare this against the
  // tab-layer unwrapper to prove byte-identical behavior on the fast path.
  function skipRuleTarget(url) {
    if (typeof url !== 'string') return null;
    for (const re of SKIP_RES) {
      const m = re.exec(url);
      if (m) return m[1];
    }
    return null;
  }

  // Per-tab pause (v1.13): one high-priority SESSION-scoped allow rule
  // covering the paused tabs. Allow beats redirect at higher priority, so
  // both the active strip and the active skip stand down on those tabs.
  // tabIds conditions are only legal in session rules — the background
  // must install this via updateSessionRules, never updateDynamicRules.
  const PAUSE_RULE_ID = 920001;
  function buildPauseRules(tabIds) {
    const ids = [];
    for (const t of Array.isArray(tabIds) ? tabIds : []) {
      if (typeof t === 'number' && t >= 0 && ids.indexOf(t) === -1) ids.push(t);
    }
    if (ids.length === 0) return [];
    return [{
      id: PAUSE_RULE_ID,
      priority: 99,
      action: { type: 'allow' },
      condition: { resourceTypes: ['main_frame'], tabIds: ids },
    }];
  }

  const api = {
    ACTIVE_RULE_ID,
    PREFIX_EXPANSIONS,
    normalizeSkipDomains,
    buildRemoveParams,
    buildRules,
    diffRemovedParams,
    SKIP_RULE_IDS,
    buildSkipRules,
    skipRuleWouldMatch,
    skipRuleTarget,
    PAUSE_RULE_ID,
    buildPauseRules,
  };
  global.DnrRules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
