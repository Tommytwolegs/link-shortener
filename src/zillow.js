// zillow.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Zillow listing URLs. Address-bar-only.
//
//   zillow.com/homedetails/<slug>/<zpid>_zpid/   → the listing identity (zpid)
//                                                  lives in the PATH and is
//                                                  never touched.
//
// DENYLIST strategy: the path fully identifies the listing, so we keep it and
// every functional query param (search/filter state on /homes pages) and
// strip only cross-cutting click junk: utm_*, fbclid, gclid.
//
// The URL hash is preserved.
//
// Hosts: zillow.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ZILLOW_HOST_REGEX = /(?:^|\.)zillow\.com$/i;

  function isZillowHost(hostname) {
    if (!hostname) return false;
    return ZILLOW_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isZillowHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenZillowUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isZillowHost(url.hostname)) return null;
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
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isZillowHost(url.hostname)) return false;
    const cleaned = shortenZillowUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isZillowHost,
    isPostUrl,
    shortenZillowUrl,
    shortenUrl: shortenZillowUrl,
    needsShortening,
    STORAGE_KEY: 'enabledZillow',
    ZILLOW_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.ZillowLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
