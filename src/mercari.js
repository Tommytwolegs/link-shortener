// mercari.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Mercari listing URLs. Address-bar-only.
//
// Recognized forms:
//
//   jp.mercari.com/item/m<digits>          → Japan listing
//   www.mercari.com/us/item/m<digits>/     → US listing
//   www.mercari.com/item/m<digits>/        → US listing (short form)
//   jp.mercari.com/shops/product/<id>      → Mercari Shops (business sellers)
//
// Tracking stripped: utm_* family, afid, source_location, ref — everything;
// listing identity is entirely in the path.
//
// The URL hash is preserved.
//
// Hosts: mercari.com (any subdomain — www, jp).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const MERCARI_HOST_REGEX = /(?:^|\.)mercari\.com$/i;

  function isMercariHost(hostname) {
    if (!hostname) return false;
    return MERCARI_HOST_REGEX.test(hostname);
  }

  const ITEM_PATH_REGEX = /^\/(?:us\/)?item\/m\d+\/?$/i;
  const SHOPS_PATH_REGEX = /^\/shops\/product\/[0-9a-z]+\/?$/i;

  function isItemPath(pathname) {
    return ITEM_PATH_REGEX.test(pathname) || SHOPS_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMercariHost(url.hostname)) return false;
    return isItemPath(url.pathname);
  }

  function shortenMercariUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isMercariHost(url.hostname)) return null;
    if (!isItemPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMercariHost(url.hostname)) return false;
    const cleaned = shortenMercariUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isMercariHost,
    isPostUrl,
    shortenMercariUrl,
    shortenUrl: shortenMercariUrl,
    needsShortening,
    STORAGE_KEY: 'enabledMercari',
    MERCARI_HOST_REGEX,
    ITEM_PATH_REGEX,
    SHOPS_PATH_REGEX,
  };
  global.MercariLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
