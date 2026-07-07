// marktplaats.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Marktplaats ad URLs. Address-bar-only.
//
//   /v/<category>/<subcategory>/m<id>-<slug>   → ad page
//
// Strips correlationId, casData, previousPage, utm_* — everything;
// identity is in the path. Hash preserved. Host: marktplaats.nl.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const MARKTPLAATS_HOST_REGEX = /(?:^|\.)marktplaats\.nl$/i;

  function isMarktplaatsHost(hostname) {
    if (!hostname) return false;
    return MARKTPLAATS_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/v\/[^/]+\/[^/]+\/m\d+-[^/?#]*\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMarktplaatsHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenMarktplaatsUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isMarktplaatsHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isMarktplaatsHost(url.hostname)) return false;
    const cleaned = shortenMarktplaatsUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isMarktplaatsHost,
    isPostUrl,
    shortenMarktplaatsUrl,
    shortenUrl: shortenMarktplaatsUrl,
    needsShortening,
    STORAGE_KEY: 'enabledMarktplaats',
    MARKTPLAATS_HOST_REGEX,
    POST_PATTERNS,
  };
  global.MarktplaatsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
