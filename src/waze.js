// waze.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Waze share URLs. Address-bar-only.
//
//   waze.com/ul?ll=<lat>,<lng>&navigate=yes   → "open location" share link
//   waze.com/live-map/directions?to=...        → directions
//
// DENYLIST strategy: Waze packs the whole destination into the query
// (ll = coordinates, to / from / q / place = destination, navigate, z / zoom),
// so those MUST survive. Only cross-cutting click junk is stripped:
// utm_*, fbclid, gclid, plus Waze's own ref/promo attribution.
//
// The URL hash is preserved.
//
// Hosts: waze.com (any subdomain: www, ul is a path not a host).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const WAZE_HOST_REGEX = /(?:^|\.)waze\.com$/i;

  function isWazeHost(hostname) {
    if (!hostname) return false;
    return WAZE_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['ref', 'promo', 'utm_referrer', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any waze URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isWazeHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenWazeUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isWazeHost(url.hostname)) return null;

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
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isWazeHost(url.hostname)) return false;
    const cleaned = shortenWazeUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isWazeHost,
    isPostUrl,
    shortenWazeUrl,
    shortenUrl: shortenWazeUrl,
    needsShortening,
    STORAGE_KEY: 'enabledWaze',
    WAZE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.WazeLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
