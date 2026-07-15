// kagi.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Kagi search URLs. Address-bar-only.
// Privacy-search pack. kagi.com/search?q=... — Kagi URLs are already
// nearly clean; this module strips only universal ad-click/campaign junk.
// Kagi's token= (public share links) and r= (region) are functional and
// survive by construction. DENYLIST strategy.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const KAGI_HOST_REGEX = /(?:^|\.)kagi\.com$/i;

  function isKagiHost(hostname) {
    if (!hostname) return false;
    return KAGI_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid',
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
    if (!isKagiHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenKagiUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isKagiHost(url.hostname)) return null;

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
    if (!isKagiHost(url.hostname)) return false;
    const cleaned = shortenKagiUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isKagiHost,
    isPostUrl,
    shortenKagiUrl,
    shortenUrl: shortenKagiUrl,
    needsShortening,
    STORAGE_KEY: 'enabledKagi',
    KAGI_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.KagiLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
