// utm.js
// ----------------------------------------------------------------------------
// Pure URL functions for stripping universal tracking parameters from any
// URL. This is what powers the "Universal tracking strip" toggle — a
// site-agnostic cleanup that runs on every page and removes the cross-cutting
// tracker params (utm_*, gclid, fbclid, mc_cid, etc.) regardless of host.
//
// The per-site modules (asin.js, youtube.js, etc.) still do their own
// cleanup with site-specific path rewrites and allowlists; this module is
// purely additive — it only removes params that match the universal
// tracking-param list. Anything it doesn't recognize is left alone.
//
// What gets stripped:
//
//   * The full `utm_*` family (utm_source, utm_medium, utm_campaign, utm_content,
//     utm_term, utm_id, utm_name, utm_brand, utm_*).
//   * Google Ads click identifiers: gclid, gclsrc, dclid, gbraid, wbraid,
//     gad_source, gad.
//   * Facebook click identifier: fbclid, _fbc, _fbp, fb_action_ids,
//     fb_action_types, fb_ref, fb_source.
//   * Instagram share identifiers: igshid, ig_rid, ig_share, igsh.
//   * Microsoft Ads / Bing Clarity: msclkid, msockid.
//   * TikTok Ads: ttclid.
//   * LinkedIn: li_fat_id, trkCampaign. (Bare `trk` is intentionally NOT
//     stripped universally — too generic a name for a host-agnostic
//     denylist; the LinkedIn per-site module strips it on linkedin.com.)
//   * Pinterest: epik.
//   * Snapchat Ads: ScCid.
//   * Reddit Ads: rdt_cid.
//   * Branch.io deep-link attribution: _branch_match_id, _branch_referrer.
//   * Yandex Metrica: yclid, ymclid.
//   * MailChimp: mc_cid, mc_eid.
//   * Marketo: mkt_tok.
//   * MailerLite: ml_subscriber, ml_subscriber_hash.
//   * HubSpot: _hsenc, _hsmi, __hssc, __hstc, __hsfp, hsCtaTracking,
//     and the hsa_* ad-attribution family.
//   * Klaviyo: _kx, _ke.
//   * Bronto/SFMC: _bta_tid, _bta_c, _bsft_* prefix.
//   * ConvertKit: ck_subscriber_id.
//   * Drip: __s.
//   * Iterable: iterable_* prefix.
//   * Mailgun: mailgun_* prefix.
//   * ExactTarget/Salesforce: et_cid, et_rid.
//   * Affiliate networks: sscid (ShareASale), awc (AWIN), rfsn (Refersion),
//     tduid (TradeDoubler), ranEAID/ranMID/ranSiteID (Rakuten).
//   * Wicked Reports: wickedid, wickedsource, wickedlocation.
//   * Omeda: oly_anon_id, oly_enc_id.
//   * Webtrends: WT.mc_id, WT.tsrc.
//   * Adobe Analytics/Target: s_kwcid, ef_id, at_medium, at_campaign.
//   * Vero: vero_id, vero_conv.
//   * Impact partner network: irclickid, irgwc.
//   * Piwik/Matomo: pk_*, piwik_*, mtm_*, matomo_*.
//   * Generic campaign identifiers: cmpid, cm_mmc.
//
// What is intentionally NOT stripped (too generic, too high false-positive rate):
//
//   * `s`, `q`, `id`, `page`, `tab`, `t`, `v`, `ref`, `source` — these have
//     too many functional uses to safely strip across all sites. Per-site
//     modules handle them where appropriate.
//
// The URL hash is preserved.
//
// Loaded as:
//   * a classic content script (sets `window.UtmStripper`)
//   * a service-worker importScripts target (sets `self.UtmStripper`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
//
// Keep this file dependency-free so it can run in all three contexts.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Exact-match tracking-param names. Lowercase comparison.
  const TRACKING_PARAMS = new Set([
    // Google Ads
    'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'gad_source', 'gad',
    // Facebook
    'fbclid', '_fbc', '_fbp',
    'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
    // Instagram
    'igshid', 'igsh', 'ig_rid', 'ig_share',
    // Microsoft Ads / Bing Clarity
    'msclkid', 'msockid',
    // TikTok Ads
    'ttclid',
    // LinkedIn
    'li_fat_id', 'trkcampaign',
    // Pinterest
    'epik',
    // Snapchat Ads
    'sccid',
    // Reddit Ads
    'rdt_cid',
    // Branch.io
    '_branch_match_id', '_branch_referrer',
    // Yandex
    'yclid', 'ymclid',
    // MailChimp
    'mc_cid', 'mc_eid',
    // Marketo
    'mkt_tok',
    // MailerLite
    'ml_subscriber', 'ml_subscriber_hash',
    // HubSpot
    '_hsenc', '_hsmi', '__hssc', '__hstc', '__hsfp', 'hsctatracking',
    // Klaviyo
    '_kx', '_ke',
    // Bronto
    '_bta_tid', '_bta_c',
    // ConvertKit
    'ck_subscriber_id',
    // Drip
    '__s',
    // ExactTarget / Salesforce Marketing Cloud
    'et_cid', 'et_rid',
    // Affiliate networks
    'sscid',                                  // ShareASale
    'awc',                                    // AWIN
    'rfsn',                                   // Refersion
    'tduid',                                  // TradeDoubler
    'raneaid', 'ranmid', 'ransiteid',         // Rakuten
    // Wicked Reports
    'wickedid', 'wickedsource', 'wickedlocation',
    // Omeda
    'oly_anon_id', 'oly_enc_id',
    // Webtrends (also covered by prefix below but exact-match is fine)
    'wt.mc_id', 'wt.tsrc',
    // Adobe
    's_kwcid', 'ef_id', 'at_medium', 'at_campaign',
    // Vero
    'vero_id', 'vero_conv',
    // Impact partner network
    'irclickid', 'irgwc',
    // Generic campaign identifiers
    'cmpid', 'cm_mmc',
  ]);

  // Prefix-match families. A param is stripped if its lowercased name
  // starts with any of these.
  const TRACKING_PARAM_PREFIXES = [
    'utm_',       // Google Analytics + everyone-who-copies-it
    'pk_',        // Matomo (fork of Piwik)
    'piwik_',     // Piwik (legacy)
    'mtm_',       // Matomo (modern)
    'matomo_',    // Matomo (alternative naming)
    'hsa_',       // HubSpot ad attribution
    '_bsft_',     // Blueshift / Salesforce Marketing Cloud
    'iterable_',  // Iterable email marketing
    'mailgun_',   // Mailgun
  ];

  function isTrackingParam(name, keepSet) {
    if (!name) return false;
    const lower = name.toLowerCase();
    if (keepSet && keepSet.has(lower)) return false;
    if (TRACKING_PARAMS.has(lower)) return true;
    for (const prefix of TRACKING_PARAM_PREFIXES) {
      if (lower.startsWith(prefix)) return true;
    }
    return false;
  }

  // Returns the URL with tracking params stripped. Preserves the hash and
  // any non-tracking params. Returns the original href unchanged if
  // nothing would be stripped (and on parse failures — defensive: never
  // produce a worse URL than the input).
  function stripTrackingParams(input, options) {
    let url;
    try {
      // Clone URL-object inputs so we never mutate the caller's object
      // (searchParams.delete below would otherwise modify it in place).
      url = new URL(typeof input === 'string' ? input : input.href);
    } catch (_e) {
      return typeof input === 'string' ? input : null;
    }
    // Only meaningful on http(s) URLs. Don't touch file://, about:, etc.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return url.href;
    }
    // Build the user's "always keep these params" set from options.
    // Case-insensitive: we lowercase everything.
    let keepSet = null;
    if (options && Array.isArray(options.keepParams) && options.keepParams.length) {
      keepSet = new Set(options.keepParams.map((s) => String(s).toLowerCase()));
    }
    let removed = false;
    // Walk a snapshot of the names so deletion-during-iteration is safe.
    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name, keepSet)) {
        url.searchParams.delete(name);
        removed = true;
      }
    }
    if (!removed) {
      // Return the original href to preserve byte-identical comparison.
      return typeof input === 'string' ? input : url.href;
    }
    // url.href is now the cleaned form. URL serialization may slightly
    // reformat (e.g. percent-encoding, trailing `?`) — we accept that.
    let cleaned = url.href;
    // If we stripped everything in the query, URL normally serializes with
    // no trailing `?`. Be defensive anyway — but only trim a dangling `?`
    // sitting at the end of the pre-hash part (i.e. one belonging to the
    // now-empty query). A `?` inside the hash must survive.
    if (!url.search) {
      const hashIdx = cleaned.indexOf('#');
      const head = hashIdx === -1 ? cleaned : cleaned.slice(0, hashIdx);
      if (head.endsWith('?')) {
        cleaned = head.slice(0, -1) + (hashIdx === -1 ? '' : cleaned.slice(hashIdx));
      }
    }
    return cleaned;
  }

  // Returns true if `input` has at least one tracking param that
  // stripTrackingParams would remove. Cheap pre-check.
  function needsStripping(input, options) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    let keepSet = null;
    if (options && Array.isArray(options.keepParams) && options.keepParams.length) {
      keepSet = new Set(options.keepParams.map((s) => String(s).toLowerCase()));
    }
    for (const name of url.searchParams.keys()) {
      if (isTrackingParam(name, keepSet)) return true;
    }
    return false;
  }

  const api = {
    isTrackingParam,
    stripTrackingParams,
    needsStripping,
    TRACKING_PARAMS,
    TRACKING_PARAM_PREFIXES,
  };

  global.UtmStripper = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
