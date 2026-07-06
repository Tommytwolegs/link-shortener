// shopee.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Shopee product URLs. Address-bar-only.
//
// Recognized forms:
//
//   /<Product-Name>-i.<shopid>.<itemid>     → slug form (canonical, kept as-is)
//   /product/<shopid>/<itemid>              → bare form
//   shp.ee/<code>                           → short-link host
//
// Tracking parameters stripped: sp_atk, xptdk, publish_id, from_meta,
// smtt, utm_* — everything; variant selection is in-page state on Shopee,
// not URL state.
//
// The URL hash is preserved.
//
// Hosts: shopee.<regional-tld> (SG/ID/TH/MY/PH/VN/TW/BR/MX/CL/CO + .com),
// shp.ee.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SHOPEE_HOST_REGEX =
    /(?:^|\.)shopee\.(?:com|sg|co\.id|co\.th|com\.my|ph|vn|tw|com\.br|com\.mx|cl|com\.co)$/i;
  const SHP_EE_HOST_REGEX = /^shp\.ee$/i;

  function isShopeeHost(hostname) {
    if (!hostname) return false;
    return SHOPEE_HOST_REGEX.test(hostname) || SHP_EE_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    // slug form: /Product-Name-i.<shopid>.<itemid>
    /^\/[^/?#]+-i\.\d+\.\d+\/?$/,
    // bare form: /product/<shopid>/<itemid>
    /^\/product\/\d+\/\d+\/?$/,
  ];
  const SHORT_PATH = /^\/[^/?#]+\/?$/;

  function isPostPath(hostname, pathname) {
    if (SHP_EE_HOST_REGEX.test(hostname)) return SHORT_PATH.test(pathname);
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isShopeeHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }

  function shortenShopeeUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isShopeeHost(url.hostname)) return null;
    if (!isPostPath(url.hostname, url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isShopeeHost(url.hostname)) return false;
    const cleaned = shortenShopeeUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isShopeeHost,
    isPostUrl,
    shortenShopeeUrl,
    shortenUrl: shortenShopeeUrl,
    needsShortening,
    STORAGE_KEY: 'enabledShopee',
    SHOPEE_HOST_REGEX,
    SHP_EE_HOST_REGEX,
    POST_PATTERNS,
  };
  global.ShopeeLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
