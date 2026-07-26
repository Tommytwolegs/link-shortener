// realtor.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Realtor.com listing URLs. Address-bar-only.
//
//   realtor.com/realestateandhomes-detail/<slug>_M<id>  → the listing identity
//                                                          is in the PATH,
//                                                          never touched.
//
// DENYLIST strategy: keep the path + functional query, strip only click junk:
// utm_*, fbclid, gclid, identityID, cid.
//
// The URL hash is preserved.
//
// Hosts: realtor.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const REALTOR_HOST_REGEX = /(?:^|\.)realtor\.com$/i;

  function isRealtorHost(hostname) {
    if (!hostname) return false;
    return REALTOR_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['identityid', 'cid', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isRealtorHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenRealtorUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isRealtorHost(url.hostname)) return null;
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
    if (!isRealtorHost(url.hostname)) return false;
    const cleaned = shortenRealtorUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isRealtorHost,
    isPostUrl,
    shortenRealtorUrl,
    shortenUrl: shortenRealtorUrl,
    needsShortening,
    STORAGE_KEY: 'enabledRealtor',
    REALTOR_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.RealtorLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
