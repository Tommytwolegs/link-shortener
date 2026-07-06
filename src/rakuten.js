// rakuten.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Rakuten Ichiba item URLs. Address-bar-only.
//
// Recognized form:
//
//   item.rakuten.co.jp/<shop>/<item-code>/     → item page
//
// One param is PRESERVED: `variantId` — Rakuten's SKU selector on item pages
// with variations.
//
// Tracking parameters stripped: rafcid (affiliate click id), s-id, scid,
// icm_agid, icm_cid, iasid, utm_* — everything except variantId.
//
// The URL hash is preserved.
//
// Host: item.rakuten.co.jp only — other rakuten.co.jp subdomains (books,
// travel, search) have different URL shapes and are out of scope, as are
// the hb.afl.rakuten.co.jp affiliate redirectors.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const RAKUTEN_HOST_REGEX = /^item\.rakuten\.co\.jp$/i;

  function isRakutenHost(hostname) {
    if (!hostname) return false;
    return RAKUTEN_HOST_REGEX.test(hostname);
  }

  // /<shop>/<item-code>/ — exactly two non-empty segments.
  const ITEM_PATH_REGEX = /^\/[^/?#]+\/[^/?#]+\/?$/;

  function isItemPath(pathname) {
    return ITEM_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isRakutenHost(url.hostname)) return false;
    return isItemPath(url.pathname);
  }

  const KEEP_PARAMS = ['variantId'];

  function shortenRakutenUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isRakutenHost(url.hostname)) return null;
    if (!isItemPath(url.pathname)) return null;

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
    if (!isRakutenHost(url.hostname)) return false;
    const cleaned = shortenRakutenUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isRakutenHost,
    isPostUrl,
    shortenRakutenUrl,
    shortenUrl: shortenRakutenUrl,
    needsShortening,
    STORAGE_KEY: 'enabledRakuten',
    RAKUTEN_HOST_REGEX,
    ITEM_PATH_REGEX,
    KEEP_PARAMS,
  };
  global.RakutenLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
