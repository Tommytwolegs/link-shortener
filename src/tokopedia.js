// tokopedia.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Tokopedia product URLs. Address-bar-only.
//
// Recognized form:
//
//   /<shop-slug>/<product-slug>      → product page (two path segments)
//
// Because the product form is just two generic segments, a blocklist keeps
// navigational first segments (help, discovery, cart, search, ...) from
// being treated as shops. This module also uses the DENYLIST strategy
// (strip known-bad params, leave the rest) rather than an allowlist, so an
// unrecognized page matched by accident only ever loses known tracking
// params — never functional state.
//
// Tracking stripped: extParam, src, refined, whid, trkid, utm_* prefix.
//
// The URL hash is preserved.
//
// Hosts: tokopedia.com (any subdomain — www).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TOKOPEDIA_HOST_REGEX = /(?:^|\.)tokopedia\.com$/i;

  function isTokopediaHost(hostname) {
    if (!hostname) return false;
    return TOKOPEDIA_HOST_REGEX.test(hostname);
  }

  const SHOP_BLOCKLIST = new Set([
    'help', 'discovery', 'about', 'about-us', 'blog', 'play', 'find',
    'p', 'cart', 'search', 'promo', 'now', 'edu', 's', 'mall', 'category',
    'hot', 'user', 'shop', 'login', 'register', 'wishlist', 'order-list',
    'chat', 'notification', 'settings', 'events', 'deals', 'ta', 'b2b2c',
  ]);

  const PRODUCT_PATH_REGEX = /^\/([^/?#]+)\/[^/?#]+\/?$/;

  function isProductPath(pathname) {
    const m = PRODUCT_PATH_REGEX.exec(pathname);
    if (!m) return false;
    return !SHOP_BLOCKLIST.has(m[1].toLowerCase());
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTokopediaHost(url.hostname)) return false;
    return isProductPath(url.pathname);
  }

  const TRACKING_PARAMS = new Set([
    'extparam', 'src', 'refined', 'whid', 'trkid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function shortenTokopediaUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isTokopediaHost(url.hostname)) return null;
    if (!isProductPath(url.pathname)) return null;

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
    if (!isTokopediaHost(url.hostname)) return false;
    const cleaned = shortenTokopediaUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTokopediaHost,
    isPostUrl,
    shortenTokopediaUrl,
    shortenUrl: shortenTokopediaUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTokopedia',
    TOKOPEDIA_HOST_REGEX,
    SHOP_BLOCKLIST,
    TRACKING_PARAMS,
  };
  global.TokopediaLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
