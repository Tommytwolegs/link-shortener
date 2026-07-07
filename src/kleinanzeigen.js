// kleinanzeigen.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Kleinanzeigen ad URLs. Address-bar-only.
//
//   /s-anzeige/<slug>/<adid>-<catid>-<locid>   → ad page
//
// Strip-all; identity is in the path. Hash preserved.
// Host: kleinanzeigen.de (formerly eBay Kleinanzeigen).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const KLEINANZEIGEN_HOST_REGEX = /(?:^|\.)kleinanzeigen\.de$/i;

  function isKleinanzeigenHost(hostname) {
    if (!hostname) return false;
    return KLEINANZEIGEN_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/s-anzeige\/[^/]+\/\d+-\d+-\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isKleinanzeigenHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenKleinanzeigenUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isKleinanzeigenHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isKleinanzeigenHost(url.hostname)) return false;
    const cleaned = shortenKleinanzeigenUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isKleinanzeigenHost,
    isPostUrl,
    shortenKleinanzeigenUrl,
    shortenUrl: shortenKleinanzeigenUrl,
    needsShortening,
    STORAGE_KEY: 'enabledKleinanzeigen',
    KLEINANZEIGEN_HOST_REGEX,
    POST_PATTERNS,
  };
  global.KleinanzeigenLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
