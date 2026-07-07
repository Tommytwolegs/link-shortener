// letterboxd.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Letterboxd URLs. Address-bar-only.
//
//   /film/<slug>/            → film page
//   /<user>/film/<slug>/     → a member's review of a film
//   /<user>/list/<slug>/     → a member's list
//
// Strips share junk (`shared`, `utm_*`) — everything; identity is in the
// path. Hash preserved. Hosts: letterboxd.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const LETTERBOXD_HOST_REGEX = /(?:^|\.)letterboxd\.com$/i;

  function isLetterboxdHost(hostname) {
    if (!hostname) return false;
    return LETTERBOXD_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/film\/[^/?#]+\/?$/,
    /^\/[^/?#]+\/film\/[^/?#]+\/?$/,
    /^\/[^/?#]+\/list\/[^/?#]+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLetterboxdHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenLetterboxdUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isLetterboxdHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLetterboxdHost(url.hostname)) return false;
    const cleaned = shortenLetterboxdUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isLetterboxdHost,
    isPostUrl,
    shortenLetterboxdUrl,
    shortenUrl: shortenLetterboxdUrl,
    needsShortening,
    STORAGE_KEY: 'enabledLetterboxd',
    LETTERBOXD_HOST_REGEX,
    POST_PATTERNS,
  };
  global.LetterboxdLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
