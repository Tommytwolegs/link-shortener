// hotelscom.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Hotels.com property URLs and building short
// share URLs. Three flavours, mirroring the other hotel modules:
//
//   shortPropertyUrl(url)   → origin + /ho<id>[/<slug>] path only
//   shortUrlWithDates(url)  → adds check-in/check-out, else null
//   shortUrlForBar(url)     → keeps dates + occupancy
//
// Hotels.com runs on the Expedia platform; property paths look like
// /ho<digits>/ or /ho<digits>/<slug>/. Two query-param generations exist in
// the wild and BOTH are handled:
//   modern (Expedia-style):  chkin / chkout / rm1=a2 / rm2=a2:c5 ...
//   legacy:                  q-check-in / q-check-out /
//                            q-room-0-adults / q-room-0-children ...
// Cleanup preserves whichever generation the URL uses (no renaming — the
// site's own parser should see exactly the names it produced).
//
// NOTE: bot-walled during the 2026-06-12 research pass, so the param model
// is from documentation/training rather than live verification — on the
// smoke-test list before shipping v1.8.0.
//
// The URL hash is preserved in the bar form.
//
// Hosts: hotels.com (any subdomain — www, plus regional like uk./ca./au.).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const HOTELSCOM_HOST_REGEX = /(?:^|\.)hotels\.com$/i;
  const HOTEL_PATH_REGEX = /^\/ho\d+(?:\/[^/?#]*)?\/?$/i;

  // Modern per-room occupancy keys (rm1, rm2, ...) and legacy room keys
  // (q-room-0-adults, q-room-1-children, ...).
  const RM_KEY_REGEX = /^rm\d+$/i;
  const QROOM_KEY_REGEX = /^q-room-\d+-(?:adults|children)$/i;

  function isHotelscomHost(hostname) {
    if (!hostname) return false;
    return HOTELSCOM_HOST_REGEX.test(hostname);
  }

  function toUrl(input) {
    try {
      return typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
  }

  function isHotelPage(input) {
    const url = toUrl(input);
    if (!url) return false;
    if (!isHotelscomHost(url.hostname)) return false;
    return HOTEL_PATH_REGEX.test(url.pathname);
  }

  function shortPropertyUrl(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  // Returns {inKey, outKey, inVal, outVal} for whichever date-param
  // generation the URL carries, or null.
  function datePair(url) {
    const gens = [
      ['chkin', 'chkout'],
      ['q-check-in', 'q-check-out'],
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
    if (!url || !isHotelPage(url)) return null;
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

  function shortUrlForBar(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const qs = new URLSearchParams();
    for (const key of ['chkin', 'chkout', 'q-check-in', 'q-check-out']) {
      const val = url.searchParams.get(key);
      if (val !== null && val !== '') qs.append(key, val);
    }
    // Occupancy — both generations, original order, de-duped.
    const seen = new Set();
    for (const [key, value] of url.searchParams.entries()) {
      if (!RM_KEY_REGEX.test(key) && !QROOM_KEY_REGEX.test(key)) continue;
      if (seen.has(key.toLowerCase())) continue;
      if (value === '') continue;
      seen.add(key.toLowerCase());
      qs.append(key, value);
    }

    const hash = url.hash || '';
    const search = qs.toString();
    return search
      ? `${url.protocol}//${url.host}${url.pathname}?${search}${hash}`
      : `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  const api = {
    isHotelscomHost,
    isHotelPage,
    shortPropertyUrl,
    shortUrlWithDates,
    shortUrlForBar,
    hasDates,
    HOTELSCOM_HOST_REGEX,
    HOTEL_PATH_REGEX,
  };
  global.HotelscomLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
