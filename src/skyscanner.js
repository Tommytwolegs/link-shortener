// skyscanner.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Skyscanner flight search URLs.
// Address-bar-only.
//
// Skyscanner carries the itinerary in the PATH:
//   skyscanner.com/transport/flights/sfo/jfk/260801/
//     ?adultsv2=1&cabinclass=economy&rtn=0&ref=home&previousCultureSource=...
//
// IMPORTANT (verified 2026-07-15): adultsv2, childrenv2, cabinclass, rtn,
// preferdirects, oym, iym, market, locale, currency are FUNCTIONAL (they
// come straight from Skyscanner's own deeplink docs) and must survive.
// DENYLIST strategy: strip only the referral/tracking params (ref,
// previousCultureSource, redirectedFrom, associateid + universal ad-click
// junk), so functional params always survive by construction.
//
// The URL hash is preserved.
//
// Hosts: skyscanner.net (global) + the major regional TLDs. The regex
// accepts more TLDs than the manifest injects on — extras are reachable
// via the background copy pipeline (activeTab).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SKYSCANNER_HOST_REGEX =
    /(?:^|\.)skyscanner\.(?:net|com|co\.uk|de|fr|es|it|nl|ie|ca|com\.au|co\.in|co\.kr|com\.sg|com\.br|com\.mx|jp|pl|se|dk|no|ch|at|co\.nz)$/i;

  function isSkyscannerHost(hostname) {
    if (!hostname) return false;
    return SKYSCANNER_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'ref', 'previousculturesource', 'redirectedfrom', 'associateid',
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any Skyscanner URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSkyscannerHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenSkyscannerUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isSkyscannerHost(url.hostname)) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isSkyscannerHost(url.hostname)) return false;
    const cleaned = shortenSkyscannerUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isSkyscannerHost,
    isPostUrl,
    shortenSkyscannerUrl,
    shortenUrl: shortenSkyscannerUrl,
    needsShortening,
    STORAGE_KEY: 'enabledSkyscanner',
    SKYSCANNER_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.SkyscannerLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
