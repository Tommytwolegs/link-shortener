// coupang.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Coupang product URLs. Address-bar-only.
//
// Recognized form:
//
//   /vp/products/<productid>     → product page
//
// Params PRESERVED: itemId, vendorItemId — together with the path id they
// pin the exact option/seller variant the user was looking at; a Coupang
// product URL without them can land on a different option.
//
// Tracking stripped: src, spec, addtag, ctag, lptag, itemsCount, searchId,
// rank, isAddedCart, traceid, q, wPcid, wRef, wTime, redirect — everything
// except the two variant ids.
//
// The URL hash is preserved.
//
// Hosts: coupang.com (any subdomain — www, m).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const COUPANG_HOST_REGEX = /(?:^|\.)coupang\.com$/i;

  function isCoupangHost(hostname) {
    if (!hostname) return false;
    return COUPANG_HOST_REGEX.test(hostname);
  }

  const PRODUCT_PATH_REGEX = /^\/vp\/products\/\d+\/?$/;

  function isProductPath(pathname) {
    return PRODUCT_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isCoupangHost(url.hostname)) return false;
    return isProductPath(url.pathname);
  }

  const KEEP_PARAMS = ['itemId', 'vendorItemId'];

  function shortenCoupangUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isCoupangHost(url.hostname)) return null;
    if (!isProductPath(url.pathname)) return null;

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
    if (!isCoupangHost(url.hostname)) return false;
    const cleaned = shortenCoupangUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isCoupangHost,
    isPostUrl,
    shortenCoupangUrl,
    shortenUrl: shortenCoupangUrl,
    needsShortening,
    STORAGE_KEY: 'enabledCoupang',
    COUPANG_HOST_REGEX,
    PRODUCT_PATH_REGEX,
    KEEP_PARAMS,
  };
  global.CoupangLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
