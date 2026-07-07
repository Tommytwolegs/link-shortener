// pinterest.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Pinterest pin URLs. Address-bar-only.
//
// Recognized forms (canonicalize to /pin/<id>/):
//
//   /pin/<numeric id>/                          → canonical pin permalink
//   /<locale>/pin/<numeric id>/                 → locale-prefixed (rare)
//   pin.it/<short-code>                         → short-link host
//
// Tracking parameters stripped: utm_source, utm_medium, utm_campaign, epik,
// rs, invite_code, sender, sfo, nic, etc.
//
// Board pages (/<user>/<board>/), profile pages (/<user>/), and search
// (/search/pins/?q=...) are intentionally NOT recognized — board and
// profile URLs are navigational, and search queries are user intent.
//
// The URL hash is preserved.
//
// Hosts: pinterest.<regional-tld>, pin.it.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Pinterest ships per regional TLD. Cover the common ones.
  const PINTEREST_HOST_REGEX =
    /(?:^|\.)pinterest\.(?:com|co\.uk|de|fr|it|es|ca|com\.au|com\.mx|jp|nz|ie|at|ch|dk|nl|se|ph|pt)$/i;
  const PIN_IT_HOST_REGEX = /^pin\.it$/i;

  function isPinterestHost(hostname) {
    if (!hostname) return false;
    return PINTEREST_HOST_REGEX.test(hostname) || PIN_IT_HOST_REGEX.test(hostname);
  }

  // /pin/<id>/ — optional /<locale>/ prefix. Non-capturing; we preserve
  // url.pathname directly rather than rebuilding from the captured id.
  const PIN_PATH_REGEX = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/pin\/\d+\/?$/i;
  // pin.it short codes: any single non-trivial path segment.
  const PIN_IT_PATH = /^\/[^/?#]+\/?$/;

  function isPinPath(hostname, pathname) {
    if (PIN_IT_HOST_REGEX.test(hostname)) {
      return PIN_IT_PATH.test(pathname);
    }
    return PIN_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isPinterestHost(url.hostname)) return false;
    return isPinPath(url.hostname, url.pathname);
  }


  // Host-scoped tracking params, stripped on ANY matched-host path that
  // doesn't fit a recognized form above (search pages, profiles, shop
  // pages...). Denylist: functional params always survive.
  const FALLBACK_STRIP = new Set(['invite_code', 'sender', 'sfo', 'nic', 'rs']);
  const FALLBACK_PREFIXES = [];

  function fallbackClean(url) {
    const clone = new URL(url.href);
    for (const name of Array.from(clone.searchParams.keys())) {
      const lower = name.toLowerCase();
      if (FALLBACK_STRIP.has(lower) || FALLBACK_PREFIXES.some((p) => lower.startsWith(p))) {
        clone.searchParams.delete(name);
      }
    }
    const hash = clone.hash || '';
    return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${hash}`;
  }

  function shortenPinterestUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isPinterestHost(url.hostname)) return null;
    if (!isPinPath(url.hostname, url.pathname)) return fallbackClean(url);
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isPinterestHost(url.hostname)) return false;
    const cleaned = shortenPinterestUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isPinterestHost,
    isPostUrl,
    shortenPinterestUrl,
    shortenUrl: shortenPinterestUrl,
    needsShortening,
    STORAGE_KEY: 'enabledPinterest',
    PINTEREST_HOST_REGEX,
    PIN_IT_HOST_REGEX,
    PIN_PATH_REGEX,
  };
  global.PinterestLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
