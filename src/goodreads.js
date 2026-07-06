// goodreads.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Goodreads URLs. Address-bar-only.
//
// Recognized forms:
//
//   /book/show/<id>[-.<slug>]     → book page
//   /author/show/<id>[-.<slug>]   → author page
//   /series/<id>[-<slug>]         → series page
//
// Tracking stripped: from_search, from_srp, qid, rank, ref, ac, utm_* —
// everything; page identity is entirely in the path.
//
// The URL hash is preserved.
//
// Hosts: goodreads.com (any subdomain — www).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const GOODREADS_HOST_REGEX = /(?:^|\.)goodreads\.com$/i;

  function isGoodreadsHost(hostname) {
    if (!hostname) return false;
    return GOODREADS_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/book\/show\/\d+[^/?#]*\/?$/,
    /^\/author\/show\/\d+[^/?#]*\/?$/,
    /^\/series\/\d+[^/?#]*\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isGoodreadsHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenGoodreadsUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isGoodreadsHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isGoodreadsHost(url.hostname)) return false;
    const cleaned = shortenGoodreadsUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isGoodreadsHost,
    isPostUrl,
    shortenGoodreadsUrl,
    shortenUrl: shortenGoodreadsUrl,
    needsShortening,
    STORAGE_KEY: 'enabledGoodreads',
    GOODREADS_HOST_REGEX,
    POST_PATTERNS,
  };
  global.GoodreadsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
