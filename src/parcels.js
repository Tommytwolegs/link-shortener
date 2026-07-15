// parcels.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning package-tracking URLs. Address-bar-only.
// ONE module, four carriers: UPS, FedEx, USPS, DHL (.com + .de). Tracking
// links forwarded from delivery emails carry campaign junk around a
// functional tracking number; the number (tracknum, trkNbr, tLabels,
// tracking-id — whatever the carrier calls it) survives by construction,
// the campaign junk (WT.mc_id + universal ad-click ids + utm_*) goes.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const PARCELS_HOST_REGEX = /(?:^|\.)(?:ups\.com|fedex\.com|usps\.com|dhl\.com|dhl\.de)$/i;

  function isParcelsHost(hostname) {
    if (!hostname) return false;
    return PARCELS_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'wt.mc_id', 'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid',
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
    if (!isParcelsHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenParcelsUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isParcelsHost(url.hostname)) return null;

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
    if (!isParcelsHost(url.hostname)) return false;
    const cleaned = shortenParcelsUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isParcelsHost,
    isPostUrl,
    shortenParcelsUrl,
    shortenUrl: shortenParcelsUrl,
    needsShortening,
    STORAGE_KEY: 'enabledParcels',
    PARCELS_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.ParcelsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
