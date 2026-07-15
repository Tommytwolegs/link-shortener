// kayak.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Kayak flight/hotel/car search URLs.
// Address-bar-only.
//
// Kayak carries the itinerary in the PATH:
//   kayak.com/flights/SFO-JFK/2026-08-01/2026-08-05?sort=bestflight_a&fs=stops=0
//
// IMPORTANT (verified 2026-07-15): sort= and fs= are FUNCTIONAL — they are
// the user's chosen sort order and filters (fs=stops=0 means "nonstop
// only") and must survive. DENYLIST strategy: strip only session/attribution
// junk (ucs session token + the universal ad-click set), so functional
// params always survive by construction. Momondo (same family) has
// different URL internals — NOT covered here.
//
// The URL hash is preserved.
//
// Hosts: kayak.com + the major regional ccTLDs. The regex accepts more
// TLDs than the manifest injects on — extras are reachable via the
// background copy pipeline (activeTab).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const KAYAK_HOST_REGEX =
    /(?:^|\.)kayak\.(?:com|co\.uk|de|fr|es|it|nl|ie|ca|com\.au|co\.in|com\.br|com\.mx|sg|com\.hk|pl|se|dk|no|ch|at|jp|co\.kr)$/i;

  function isKayakHost(hostname) {
    if (!hostname) return false;
    return KAYAK_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'ucs',
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any Kayak URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isKayakHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenKayakUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isKayakHost(url.hostname)) return null;

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
    if (!isKayakHost(url.hostname)) return false;
    const cleaned = shortenKayakUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isKayakHost,
    isPostUrl,
    shortenKayakUrl,
    shortenUrl: shortenKayakUrl,
    needsShortening,
    STORAGE_KEY: 'enabledKayak',
    KAYAK_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.KayakLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
