// noon.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Noon URLs. Address-bar-only.
// International pack (UAE/KSA). DENYLIST strategy: universal affiliate/ad-click
// junk + utm_ family; everything functional survives by construction.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const NOON_HOST_REGEX = /(?:^|\.)noon\.com$/i;

  function isNoonHost(hostname) {
    if (!hostname) return false;
    return NOON_HOST_REGEX.test(hostname);
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
    if (!isNoonHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenNoonUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isNoonHost(url.hostname)) return null;

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
    if (!isNoonHost(url.hostname)) return false;
    const cleaned = shortenNoonUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isNoonHost,
    isPostUrl,
    shortenNoonUrl,
    shortenUrl: shortenNoonUrl,
    needsShortening,
    STORAGE_KEY: 'enabledNoon',
    NOON_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.NoonLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
