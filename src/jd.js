// jd.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning JD.com product URLs. Address-bar-only.
//
//   item.jd.com/<sku>.html   → product page
//
// Strips utm_*, jd_pop, abt, cu, and affiliate junk — everything;
// identity is in the path. Hash preserved.
// Host: item.jd.com only (other jd.com subdomains have different shapes).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const JD_HOST_REGEX = /^item\.jd\.com$/i;

  function isJdHost(hostname) {
    if (!hostname) return false;
    return JD_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/\d+\.html\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isJdHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenJdUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isJdHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isJdHost(url.hostname)) return false;
    const cleaned = shortenJdUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isJdHost,
    isPostUrl,
    shortenJdUrl,
    shortenUrl: shortenJdUrl,
    needsShortening,
    STORAGE_KEY: 'enabledJd',
    JD_HOST_REGEX,
    POST_PATTERNS,
  };
  global.JdLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
