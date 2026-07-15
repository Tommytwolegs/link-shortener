// startpage.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Startpage search URLs. Address-bar-only.
// Privacy-search pack. startpage.com/sp/search?query=... — query, cat, and
// everything unrecognized survive (including sc=, an anti-abuse token we
// deliberately leave alone); partner attribution (sourceid, segment, abp)
// and universal ad-click junk are stripped. DENYLIST strategy.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const STARTPAGE_HOST_REGEX = /(?:^|\.)startpage\.com$/i;

  function isStartpageHost(hostname) {
    if (!hostname) return false;
    return STARTPAGE_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'sourceid', 'segment', 'abp', 'gclid', 'dclid', 'fbclid',
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
    if (!isStartpageHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenStartpageUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isStartpageHost(url.hostname)) return null;

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
    if (!isStartpageHost(url.hostname)) return false;
    const cleaned = shortenStartpageUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isStartpageHost,
    isPostUrl,
    shortenStartpageUrl,
    shortenUrl: shortenStartpageUrl,
    needsShortening,
    STORAGE_KEY: 'enabledStartpage',
    STARTPAGE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.StartpageLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
