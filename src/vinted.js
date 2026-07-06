// vinted.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Vinted listing URLs. Address-bar-only.
//
// Recognized form:
//
//   /items/<id>[-<slug>]      → listing page
//
// Tracking stripped: referrer, homepage_session_id, utm_* — everything;
// listing identity is entirely in the path.
//
// The URL hash is preserved.
//
// Hosts: vinted.<regional-tld> — 19 markets.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const VINTED_HOST_REGEX =
    /(?:^|\.)vinted\.(?:com|fr|de|co\.uk|pl|it|es|nl|be|at|cz|sk|lt|pt|se|dk|fi|hu|ro)$/i;

  function isVintedHost(hostname) {
    if (!hostname) return false;
    return VINTED_HOST_REGEX.test(hostname);
  }

  const ITEM_PATH_REGEX = /^\/items\/\d+(?:-[^/?#]*)?\/?$/;

  function isItemPath(pathname) {
    return ITEM_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isVintedHost(url.hostname)) return false;
    return isItemPath(url.pathname);
  }

  function shortenVintedUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isVintedHost(url.hostname)) return null;
    if (!isItemPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isVintedHost(url.hostname)) return false;
    const cleaned = shortenVintedUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isVintedHost,
    isPostUrl,
    shortenVintedUrl,
    shortenUrl: shortenVintedUrl,
    needsShortening,
    STORAGE_KEY: 'enabledVinted',
    VINTED_HOST_REGEX,
    ITEM_PATH_REGEX,
  };
  global.VintedLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
