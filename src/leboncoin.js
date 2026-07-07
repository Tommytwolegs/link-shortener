// leboncoin.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Leboncoin ad URLs. Address-bar-only.
//
//   /ad/<category>/<id>      → modern ad permalink
//   /<category>/<id>.htm     → legacy form (still resolves)
//
// (URL model verified 2026-06-12.) Strip-all; identity is in the path.
// Hash preserved. Host: leboncoin.fr.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const LEBONCOIN_HOST_REGEX = /(?:^|\.)leboncoin\.fr$/i;

  function isLeboncoinHost(hostname) {
    if (!hostname) return false;
    return LEBONCOIN_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/ad\/[^/]+\/\d+\/?$/,
    /^\/[a-z_]+\/\d+\.htm\/?$/i,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLeboncoinHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenLeboncoinUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isLeboncoinHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLeboncoinHost(url.hostname)) return false;
    const cleaned = shortenLeboncoinUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isLeboncoinHost,
    isPostUrl,
    shortenLeboncoinUrl,
    shortenUrl: shortenLeboncoinUrl,
    needsShortening,
    STORAGE_KEY: 'enabledLeboncoin',
    LEBONCOIN_HOST_REGEX,
    POST_PATTERNS,
  };
  global.LeboncoinLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
