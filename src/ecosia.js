// ecosia.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Ecosia search URLs. Address-bar-only.
// Privacy-search pack. ecosia.org/search?q=... — the query and everything
// unrecognized survive; the install/partner attribution (tt, tts, addon,
// plugin) and universal ad-click junk are stripped. DENYLIST strategy.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ECOSIA_HOST_REGEX = /(?:^|\.)ecosia\.org$/i;

  function isEcosiaHost(hostname) {
    if (!hostname) return false;
    return ECOSIA_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'tt', 'tts', 'addon', 'plugin', 'gclid', 'dclid', 'fbclid',
    'msclkid', 'mc_cid', 'mc_eid',
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
    if (!isEcosiaHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenEcosiaUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isEcosiaHost(url.hostname)) return null;

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
    if (!isEcosiaHost(url.hostname)) return false;
    const cleaned = shortenEcosiaUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isEcosiaHost,
    isPostUrl,
    shortenEcosiaUrl,
    shortenUrl: shortenEcosiaUrl,
    needsShortening,
    STORAGE_KEY: 'enabledEcosia',
    ECOSIA_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.EcosiaLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
