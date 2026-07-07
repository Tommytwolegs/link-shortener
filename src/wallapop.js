// wallapop.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Wallapop item URLs. Address-bar-only.
//
//   /item/<slug>-<id>    → item page (numeric id at slug tail)
//
// Strip-all; identity is in the path. Hash preserved.
// Hosts: wallapop.com (es./it./pt. subdomains).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const WALLAPOP_HOST_REGEX = /(?:^|\.)wallapop\.com$/i;

  function isWallapopHost(hostname) {
    if (!hostname) return false;
    return WALLAPOP_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/item\/[^/?#]*\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWallapopHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenWallapopUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isWallapopHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWallapopHost(url.hostname)) return false;
    const cleaned = shortenWallapopUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isWallapopHost,
    isPostUrl,
    shortenWallapopUrl,
    shortenUrl: shortenWallapopUrl,
    needsShortening,
    STORAGE_KEY: 'enabledWallapop',
    WALLAPOP_HOST_REGEX,
    POST_PATTERNS,
  };
  global.WallapopLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
