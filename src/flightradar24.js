// flightradar24.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Flightradar24 URLs. Address-bar-only.
//
// FR24's paths are already clean and fully identifying:
//   flightradar24.com/UAL123/39a4c2f1     (selected flight)
//   flightradar24.com/data/flights/ua123  (flight data page)
//   fr24.com/UAL123                       (shortcut host, same site)
//
// The in-app share buttons and social embeds append campaign junk.
// DENYLIST strategy: strip only the universal ad-click/campaign junk on
// any path, so anything functional survives by construction.
//
// The URL hash is preserved (FR24 uses it for map state on some views).
//
// Hosts: flightradar24.com, fr24.com, and their subdomains.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const FLIGHTRADAR_HOST_REGEX = /(?:^|\.)(?:flightradar24\.com|fr24\.com)$/i;

  function isFlightradarHost(hostname) {
    if (!hostname) return false;
    return FLIGHTRADAR_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // "Post" here = any FR24 URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isFlightradarHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenFlightradarUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isFlightradarHost(url.hostname)) return null;

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
    if (!isFlightradarHost(url.hostname)) return false;
    const cleaned = shortenFlightradarUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isFlightradarHost,
    isPostUrl,
    shortenFlightradarUrl,
    shortenUrl: shortenFlightradarUrl,
    needsShortening,
    STORAGE_KEY: 'enabledFlightradar24',
    FLIGHTRADAR_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.FlightradarLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
