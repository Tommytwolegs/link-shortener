// yelp.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Yelp URLs. Address-bar-only.
// yelp.com/biz/<slug> — the business lives in the path. osq= (the search
// query you typed to find the business — leaks intent, same disease as
// NetSuite siaQ) and universal campaign junk are stripped. hrid= (deep
// link that highlights a specific review) is functional and KEPT.
// DENYLIST strategy.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const YELP_HOST_REGEX = /(?:^|\.)yelp\.(?:com|ca|co\.uk|de|fr|it|es|ie|com\.au)$/i;

  function isYelpHost(hostname) {
    if (!hostname) return false;
    return YELP_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'osq', 'gclid', 'dclid', 'fbclid', 'msclkid', 'mc_cid',
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
    if (!isYelpHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenYelpUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isYelpHost(url.hostname)) return null;

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
    if (!isYelpHost(url.hostname)) return false;
    const cleaned = shortenYelpUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isYelpHost,
    isPostUrl,
    shortenYelpUrl,
    shortenUrl: shortenYelpUrl,
    needsShortening,
    STORAGE_KEY: 'enabledYelp',
    YELP_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.YelpLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
