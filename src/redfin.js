// redfin.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Redfin listing URLs. Address-bar-only.
//
//   redfin.com/<STATE>/<City>/<address>/home/<id>  → the listing identity is
//                                                    in the PATH, never touched.
//
// DENYLIST strategy: keep the path + functional query (map/filter state),
// strip only click junk: utm_*, fbclid, gclid, riftinfo, src.
//
// The URL hash is preserved.
//
// Hosts: redfin.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const REDFIN_HOST_REGEX = /(?:^|\.)redfin\.com$/i;

  function isRedfinHost(hostname) {
    if (!hostname) return false;
    return REDFIN_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['riftinfo', 'src', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isRedfinHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenRedfinUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isRedfinHost(url.hostname)) return null;
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
    if (!isRedfinHost(url.hostname)) return false;
    const cleaned = shortenRedfinUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isRedfinHost,
    isPostUrl,
    shortenRedfinUrl,
    shortenUrl: shortenRedfinUrl,
    needsShortening,
    STORAGE_KEY: 'enabledRedfin',
    REDFIN_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.RedfinLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
