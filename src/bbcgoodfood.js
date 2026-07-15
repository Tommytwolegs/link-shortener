// bbcgoodfood.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning bbcgoodfood.com URLs. Address-bar-only.
// Recipes pack: recipe identity lives in the path; share buttons and
// newsletters add utm_/ad-click junk. Universal denylist only.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BBCGOODFOOD_HOST_REGEX = /(?:^|\.)bbcgoodfood\.com$/i;

  function isBbcgoodfoodHost(hostname) {
    if (!hostname) return false;
    return BBCGOODFOOD_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent', 'cjdata', 'ranmid', 'raneaid',
    'ransiteid',
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
    if (!isBbcgoodfoodHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenBbcgoodfoodUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isBbcgoodfoodHost(url.hostname)) return null;

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
    if (!isBbcgoodfoodHost(url.hostname)) return false;
    const cleaned = shortenBbcgoodfoodUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBbcgoodfoodHost,
    isPostUrl,
    shortenBbcgoodfoodUrl,
    shortenUrl: shortenBbcgoodfoodUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBbcgoodfood',
    BBCGOODFOOD_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.BbcgoodfoodLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
