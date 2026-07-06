// flipkart.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Flipkart product URLs. Address-bar-only.
//
// Recognized form:
//
//   /<slug>/p/itm<alphanum>      → product page
//
// One param PRESERVED: `pid` — the product id that pins the exact variant
// (color/storage); Flipkart resolves the itm path to a default variant
// without it.
//
// Tracking stripped: lid, marketplace, store, srno, otracker, otracker1,
// fm, iid, ppt, ppn, ssid, cmpid, qH, affid, affExtParam1/2 — everything
// except pid.
//
// The URL hash is preserved.
//
// Hosts: flipkart.com (any subdomain — www; the dl.flipkart.com deeplink
// redirector has a different shape and is out of scope).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const FLIPKART_HOST_REGEX = /(?:^|\.)flipkart\.com$/i;

  function isFlipkartHost(hostname) {
    if (!hostname) return false;
    return FLIPKART_HOST_REGEX.test(hostname);
  }

  const PRODUCT_PATH_REGEX = /^\/[^/]+\/p\/itm[0-9a-z]+\/?$/i;

  function isProductPath(pathname) {
    return PRODUCT_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isFlipkartHost(url.hostname)) return false;
    return isProductPath(url.pathname);
  }

  const KEEP_PARAMS = ['pid'];

  function shortenFlipkartUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isFlipkartHost(url.hostname)) return null;
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
    if (!isFlipkartHost(url.hostname)) return false;
    const cleaned = shortenFlipkartUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isFlipkartHost,
    isPostUrl,
    shortenFlipkartUrl,
    shortenUrl: shortenFlipkartUrl,
    needsShortening,
    STORAGE_KEY: 'enabledFlipkart',
    FLIPKART_HOST_REGEX,
    PRODUCT_PATH_REGEX,
    KEEP_PARAMS,
  };
  global.FlipkartLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
