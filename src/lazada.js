// lazada.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Lazada product URLs. Address-bar-only.
//
// Recognized forms (all end in i<itemid>[-s<skuid>].html):
//
//   /products/<slug>-i<itemid>.html
//   /products/<slug>-i<itemid>-s<skuid>.html   → sku kept in the PATH
//   /products/pdp-i<itemid>.html               → newer short form
//
// Tracking parameters stripped: spm, from, scm, pvid, clickTrackInfo,
// ad_src, laz_trackid, exlaz, utm_* — everything; the item and sku ids
// live in the path so no query param is functional.
//
// The URL hash is preserved.
//
// Hosts: lazada.sg, lazada.co.id, lazada.com.my, lazada.co.th,
// lazada.com.ph, lazada.vn, lazada.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const LAZADA_HOST_REGEX =
    /(?:^|\.)lazada\.(?:com|sg|co\.id|com\.my|co\.th|com\.ph|vn)$/i;

  function isLazadaHost(hostname) {
    if (!hostname) return false;
    return LAZADA_HOST_REGEX.test(hostname);
  }

  const PRODUCT_PATH_REGEX = /^\/products\/[^/?#]*i\d+(?:-s\d+)?\.html\/?$/i;

  function isProductPath(pathname) {
    return PRODUCT_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLazadaHost(url.hostname)) return false;
    return isProductPath(url.pathname);
  }

  function shortenLazadaUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isLazadaHost(url.hostname)) return null;
    if (!isProductPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLazadaHost(url.hostname)) return false;
    const cleaned = shortenLazadaUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isLazadaHost,
    isPostUrl,
    shortenLazadaUrl,
    shortenUrl: shortenLazadaUrl,
    needsShortening,
    STORAGE_KEY: 'enabledLazada',
    LAZADA_HOST_REGEX,
    PRODUCT_PATH_REGEX,
  };
  global.LazadaLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
