// eventbrite.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Eventbrite URLs. Address-bar-only.
// aff= (and afu=) are Eventbrite's documented share/affiliate attribution
// on event links. Event identity lives in the /e/<slug>-<id> path.
// DELIBERATELY KEPT: discount= / promo codes (functional -- stripping
// them costs the attendee money), and everything else unrecognized.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const EVENTBRITE_HOST_REGEX = /(?:^|\.)eventbrite\.(?:com|co\.uk|ca|com\.au|de|fr|es|it|nl|ie)$/i;

  function isEventbriteHost(hostname) {
    if (!hostname) return false;
    return EVENTBRITE_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'aff', 'afu',
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
    if (!isEventbriteHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenEventbriteUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isEventbriteHost(url.hostname)) return null;

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
    if (!isEventbriteHost(url.hostname)) return false;
    const cleaned = shortenEventbriteUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isEventbriteHost,
    isPostUrl,
    shortenEventbriteUrl,
    shortenUrl: shortenEventbriteUrl,
    needsShortening,
    STORAGE_KEY: 'enabledEventbrite',
    EVENTBRITE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.EventbriteLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
