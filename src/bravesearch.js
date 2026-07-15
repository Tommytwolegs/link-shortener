// bravesearch.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Brave Search URLs. Address-bar-only.
// Privacy-search pack. search.brave.com/search?q=... — q, offset,
// spellcheck and everything unrecognized survive; entry-point attribution
// (source=web/desktop/...) and universal ad-click junk are stripped.
// Host is EXACTLY search.brave.com — brave.com the company site is not
// touched. DENYLIST strategy.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BRAVESEARCH_HOST_REGEX = /^search\.brave\.com$/i;

  function isBravesearchHost(hostname) {
    if (!hostname) return false;
    return BRAVESEARCH_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'source', 'gclid', 'dclid', 'fbclid', 'msclkid', 'mc_cid',
    'mc_eid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any covered URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBravesearchHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenBravesearchUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isBravesearchHost(url.hostname)) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBravesearchHost(url.hostname)) return false;
    const cleaned = shortenBravesearchUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBravesearchHost,
    isPostUrl,
    shortenBravesearchUrl,
    shortenUrl: shortenBravesearchUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBravesearch',
    BRAVESEARCH_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.BravesearchLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
