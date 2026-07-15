// flightaware.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning FlightAware URLs. Address-bar-only.
//
// FlightAware's paths are already clean and fully identifying:
//   flightaware.com/live/flight/UAL123
//   flightaware.com/live/flight/AAL2613/history/20180524/1953Z/KOMA/KDFW
//
// "Which flight are you on?" links are shared constantly, and the share
// paths pick up campaign junk from emails/social embeds. DENYLIST strategy:
// strip only the universal ad-click/campaign junk on any path, so anything
// functional survives by construction.
//
// The URL hash is preserved.
//
// Hosts: flightaware.com and any subdomain.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const FLIGHTAWARE_HOST_REGEX = /(?:^|\.)flightaware\.com$/i;

  function isFlightawareHost(hostname) {
    if (!hostname) return false;
    return FLIGHTAWARE_HOST_REGEX.test(hostname);
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

  // "Post" here = any FlightAware URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isFlightawareHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenFlightawareUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isFlightawareHost(url.hostname)) return null;

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
    if (!isFlightawareHost(url.hostname)) return false;
    const cleaned = shortenFlightawareUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isFlightawareHost,
    isPostUrl,
    shortenFlightawareUrl,
    shortenUrl: shortenFlightawareUrl,
    needsShortening,
    STORAGE_KEY: 'enabledFlightaware',
    FLIGHTAWARE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.FlightawareLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
