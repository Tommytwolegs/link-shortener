// netflix.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Netflix share URLs. Address-bar-only.
//
//   /title/<id>              → title page (what the Share button produces)
//   /<locale>/title/<id>     → locale-prefixed variant
//   /watch/<id>              → player page
//
// Strips trkid (the share-source tracker on every shared link), tctx, s,
// vlang, clip, preventIntent — everything; identity is in the path.
//
// The URL hash is preserved.
//
// Hosts: netflix.com (any subdomain — www).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const NETFLIX_HOST_REGEX = /(?:^|\.)netflix\.com$/i;

  function isNetflixHost(hostname) {
    if (!hostname) return false;
    return NETFLIX_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/(?:[a-z]{2}(?:-[a-z]{2,4})?\/)?title\/\d+\/?$/i,
    /^\/watch\/\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isNetflixHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenNetflixUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isNetflixHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isNetflixHost(url.hostname)) return false;
    const cleaned = shortenNetflixUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isNetflixHost,
    isPostUrl,
    shortenNetflixUrl,
    shortenUrl: shortenNetflixUrl,
    needsShortening,
    STORAGE_KEY: 'enabledNetflix',
    NETFLIX_HOST_REGEX,
    POST_PATTERNS,
  };
  global.NetflixLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
