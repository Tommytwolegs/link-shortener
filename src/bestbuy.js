// bestbuy.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Best Buy product URLs. Address-bar-only.
//
//   /site/<slug>/<sku>.p     → product page
//
// KEEPS `intl` (nosplash — bypasses the country-picker splash; user
// intent). `skuId` duplicates the sku already in the path, so it and the
// rest (ref, loc, extStoreId, irclickid, utm_*) are stripped.
// Hash preserved. Hosts: bestbuy.com, bestbuy.ca.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BESTBUY_HOST_REGEX = /(?:^|\.)bestbuy\.(?:com|ca)$/i;

  function isBestbuyHost(hostname) {
    if (!hostname) return false;
    return BESTBUY_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/site\/[^/]+\/\d+\.p\/?$/i,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBestbuyHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  const KEEP_PARAMS = ['intl'];

  function shortenBestbuyUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isBestbuyHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const params = new URLSearchParams();
    for (const k of KEEP_PARAMS) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const q = params.toString();
    const query = q ? '?' + q : '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBestbuyHost(url.hostname)) return false;
    const cleaned = shortenBestbuyUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBestbuyHost,
    isPostUrl,
    shortenBestbuyUrl,
    shortenUrl: shortenBestbuyUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBestbuy',
    BESTBUY_HOST_REGEX,
    POST_PATTERNS,
    KEEP_PARAMS,
  };
  global.BestbuyLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
