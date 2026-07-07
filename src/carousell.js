// carousell.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Carousell listing URLs. Address-bar-only.
//
//   /p/<slug>-<id>/      → listing page (numeric id at slug tail)
//
// Strips `t-id`, `t-referrer_*` share/session attribution — everything;
// identity is in the path. Hash preserved.
// Hosts: carousell.com/.sg/.com.hk/.com.my/.ph/.tw.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const CAROUSELL_HOST_REGEX = /(?:^|\.)carousell\.(?:com|sg|com\.hk|com\.my|ph|tw)$/i;

  function isCarousellHost(hostname) {
    if (!hostname) return false;
    return CAROUSELL_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/p\/[^/?#]*\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isCarousellHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenCarousellUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isCarousellHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isCarousellHost(url.hostname)) return false;
    const cleaned = shortenCarousellUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isCarousellHost,
    isPostUrl,
    shortenCarousellUrl,
    shortenUrl: shortenCarousellUrl,
    needsShortening,
    STORAGE_KEY: 'enabledCarousell',
    CAROUSELL_HOST_REGEX,
    POST_PATTERNS,
  };
  global.CarousellLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
