// bol.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning bol.com URLs. Address-bar-only.
// International pack (Netherlands/Belgium). bltgh= is bol's affiliate
// click id; stripped along with universal junk.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BOL_HOST_REGEX = /(?:^|\.)bol\.com$/i;

  function isBolHost(hostname) {
    if (!hostname) return false;
    return BOL_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'bltgh', 'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid',
    'twclid', 'mc_cid', 'mc_eid', 'cjevent', 'cjdata', 'ranmid',
    'raneaid', 'ransiteid',
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
    if (!isBolHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenBolUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isBolHost(url.hostname)) return null;

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
    if (!isBolHost(url.hostname)) return false;
    const cleaned = shortenBolUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBolHost,
    isPostUrl,
    shortenBolUrl,
    shortenUrl: shortenBolUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBol',
    BOL_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.BolLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
