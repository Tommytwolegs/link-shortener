// rottentomatoes.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Rotten Tomatoes URLs. Address-bar-only.
//
// movie / TV pages (identity in the /m/ or /tv/ path).
//
// DENYLIST strategy: keep the path + functional query, strip only click junk:
// cmp, utm_*, fbclid, gclid.
//
// The URL hash is preserved.
//
// Hosts: rottentomatoes.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ROTTENTOMATOES_HOST_REGEX = /(?:^|\.)rottentomatoes\.com$/i;

  function isRottentomatoesHost(hostname) {
    if (!hostname) return false;
    return ROTTENTOMATOES_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['cmp', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isRottentomatoesHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenRottentomatoesUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isRottentomatoesHost(url.hostname)) return null;
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
    if (!isRottentomatoesHost(url.hostname)) return false;
    const cleaned = shortenRottentomatoesUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isRottentomatoesHost,
    isPostUrl,
    shortenRottentomatoesUrl,
    shortenUrl: shortenRottentomatoesUrl,
    needsShortening,
    STORAGE_KEY: 'enabledRottentomatoes',
    ROTTENTOMATOES_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.RottentomatoesLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
