// olx.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning OLX ad URLs. Address-bar-only.
//
//   /d/<word>/<slug>-ID<alnum>.html   → ad page (<word> is per-country:
//                                       oferta/obyavlenie/ad/anunt...)
//
// (URL model verified 2026-06-12: e.g. /d/oferta/<slug>-CID99-ID15G9aU.html
// with ?reason=seller_listing junk.) Strip-all; identity is in the path.
// Hash preserved. Hosts: olx.pl/.ro/.bg/.ua/.pt/.kz.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const OLX_HOST_REGEX = /(?:^|\.)olx\.(?:pl|ro|bg|ua|pt|kz)$/i;

  function isOlxHost(hostname) {
    if (!hostname) return false;
    return OLX_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/d\/[^/]+\/[^/?#]*ID[0-9a-zA-Z]+\.html\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isOlxHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenOlxUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isOlxHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isOlxHost(url.hostname)) return false;
    const cleaned = shortenOlxUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isOlxHost,
    isPostUrl,
    shortenOlxUrl,
    shortenUrl: shortenOlxUrl,
    needsShortening,
    STORAGE_KEY: 'enabledOlx',
    OLX_HOST_REGEX,
    POST_PATTERNS,
  };
  global.OlxLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
