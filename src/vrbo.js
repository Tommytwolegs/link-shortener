// vrbo.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Vrbo property URLs and building short share
// URLs. Three flavours, mirroring the other hotel modules:
//
//   shortPropertyUrl(url)   → origin + /<id>[ha] path only
//   shortUrlWithDates(url)  → adds arrival/departure dates, else null
//   shortUrlForBar(url)     → keeps dates + occupancy
//
// Vrbo property paths are a bare numeric id, optionally suffixed (e.g.
// /2318557 or /1234567ha). Vrbo runs on the Expedia platform; like
// Hotels.com, two date-param generations exist and BOTH are handled
// without renaming: modern chkin/chkout and legacy startDate/endDate.
// Occupancy: adults + children (modern), guests (legacy variants exist but
// are ambiguous — not preserved).
//
// NOTE: URL model from documentation/training, not live-verified (Expedia
// properties bot-wall automated browsers) — on the smoke-test list.
//
// The URL hash is preserved in the bar form.
//
// Hosts: vrbo.com (any subdomain — www). Sister brands on other domains
// (abritel.fr, fewo-direkt.de) are out of scope.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const VRBO_HOST_REGEX = /(?:^|\.)vrbo\.com$/i;
  const PROPERTY_PATH_REGEX = /^\/\d+(?:ha)?\/?$/i;

  function isVrboHost(hostname) {
    if (!hostname) return false;
    return VRBO_HOST_REGEX.test(hostname);
  }

  function toUrl(input) {
    try {
      return typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
  }

  function isPropertyPage(input) {
    const url = toUrl(input);
    if (!url) return false;
    if (!isVrboHost(url.hostname)) return false;
    return PROPERTY_PATH_REGEX.test(url.pathname);
  }

  function shortPropertyUrl(input) {
    const url = toUrl(input);
    if (!url || !isPropertyPage(url)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function datePair(url) {
    const gens = [
      ['chkin', 'chkout'],
      ['startDate', 'endDate'],
    ];
    for (const [inKey, outKey] of gens) {
      const inVal = url.searchParams.get(inKey);
      const outVal = url.searchParams.get(outKey);
      if (inVal && outVal && DATE_RE.test(inVal) && DATE_RE.test(outVal) && outVal > inVal) {
        return { inKey, outKey, inVal, outVal };
      }
    }
    return null;
  }

  function shortUrlWithDates(input) {
    const url = toUrl(input);
    if (!url || !isPropertyPage(url)) return null;
    const pair = datePair(url);
    if (!pair) return null;
    const qs = new URLSearchParams();
    qs.set(pair.inKey, pair.inVal);
    qs.set(pair.outKey, pair.outVal);
    return `${url.protocol}//${url.host}${url.pathname}?${qs.toString()}`;
  }

  function hasDates(input) {
    return shortUrlWithDates(input) !== null;
  }

  const ADDRESS_BAR_KEEP = [
    'chkin', 'chkout', 'startDate', 'endDate', 'adults', 'children',
  ];

  function shortUrlForBar(input) {
    const url = toUrl(input);
    if (!url || !isPropertyPage(url)) return null;

    const qs = new URLSearchParams();
    for (const key of ADDRESS_BAR_KEEP) {
      const val = url.searchParams.get(key);
      if (val !== null && val !== '') qs.set(key, val);
    }

    const hash = url.hash || '';
    const search = qs.toString();
    return search
      ? `${url.protocol}//${url.host}${url.pathname}?${search}${hash}`
      : `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  const api = {
    isVrboHost,
    isPropertyPage,
    // Alias for naming consistency with the other travel modules.
    isHotelPage: isPropertyPage,
    shortPropertyUrl,
    shortUrlWithDates,
    shortUrlForBar,
    hasDates,
    VRBO_HOST_REGEX,
    PROPERTY_PATH_REGEX,
  };
  global.VrboLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
