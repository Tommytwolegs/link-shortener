// tiktok.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning TikTok share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /@<user>/video/<id>           → strip query + fragment
//   /@<user>/photo/<id>           → photo posts
//   /t/<short>                    → tiktok.com/t short links
//   vm.tiktok.com/<short>         → mobile share short links
//   vt.tiktok.com/<short>         → another short-link variant
//
// Hosts: tiktok.com, m.tiktok.com, www.tiktok.com, vm.tiktok.com, vt.tiktok.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TIKTOK_HOST_REGEX = /(?:^|\.)tiktok\.com$/i;

  function isTiktokHost(hostname) {
    if (!hostname) return false;
    return TIKTOK_HOST_REGEX.test(hostname);
  }

  // Hosts that exist purely to issue short share URLs — anything that's a
  // single non-trivial path segment counts.
  const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
  const SHORT_PATH = /^\/[^/?#]+\/?$/;

  const POST_PATTERNS = [
    /^\/@[^/]+\/video\/\d+\/?$/,
    /^\/@[^/]+\/photo\/\d+\/?$/,
    /^\/t\/[^/?#]+\/?$/,
  ];

  function isPostPath(hostname, pathname) {
    if (SHORT_HOSTS.has(hostname.toLowerCase())) {
      return SHORT_PATH.test(pathname);
    }
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTiktokHost(url.hostname)) return false;
    return isPostPath(url.hostname, url.pathname);
  }

  function shortenTiktokUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isTiktokHost(url.hostname)) return null;
    if (!isPostPath(url.hostname, url.pathname)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTiktokHost(url.hostname)) return false;
    const cleaned = shortenTiktokUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTiktokHost,
    isPostUrl,
    shortenTiktokUrl,
    shortenUrl: shortenTiktokUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTiktok',
    TIKTOK_HOST_REGEX,
    POST_PATTERNS,
  };
  global.TiktokLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
