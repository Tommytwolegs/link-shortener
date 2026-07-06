// imdb.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning IMDb URLs. Address-bar-only.
//
// Recognized forms:
//
//   /title/tt<digits>/    → film / show page
//   /name/nm<digits>/     → person page
//   /list/ls<digits>/     → list page
//
// Tracking stripped: ref_ (on virtually every internally-navigated link),
// pf_rd_m/pf_rd_p/pf_rd_r/pf_rd_s/pf_rd_t/pf_rd_i, ls_ref_, utm_* —
// everything; page identity is entirely in the path.
//
// The URL hash is preserved.
//
// Hosts: imdb.com (any subdomain — www, m).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const IMDB_HOST_REGEX = /(?:^|\.)imdb\.com$/i;

  function isImdbHost(hostname) {
    if (!hostname) return false;
    return IMDB_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/title\/tt\d+\/?$/,
    /^\/name\/nm\d+\/?$/,
    /^\/list\/ls\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isImdbHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenImdbUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isImdbHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isImdbHost(url.hostname)) return false;
    const cleaned = shortenImdbUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isImdbHost,
    isPostUrl,
    shortenImdbUrl,
    shortenUrl: shortenImdbUrl,
    needsShortening,
    STORAGE_KEY: 'enabledImdb',
    IMDB_HOST_REGEX,
    POST_PATTERNS,
  };
  global.ImdbLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
