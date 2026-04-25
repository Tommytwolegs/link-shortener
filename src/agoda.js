// agoda.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Agoda hotel listing URLs and building short
// share URLs from them. Three flavours:
//
//   shortPropertyUrl(url)   → origin + path only (no query, no hash)
//   shortUrlWithDates(url)  → adds `checkIn=YYYY-MM-DD&los=N` if dates are
//                             present on the current page, else null
//   shortUrlForBar(url)     → keeps dates + occupancy. Used by the content
//                             script to clean up the address bar in place.
//
// Loaded as:
//   * a classic content script (sets `window.AgodaLinkShortener`)
//   * a service-worker importScripts target (sets `self.AgodaLinkShortener`)
//   * a CommonJS module from the Node-based unit tests (`module.exports`)
//
// Keep this file dependency-free so it can run in all three contexts.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Agoda uses a single `agoda.com` domain worldwide — no regional TLDs.
  // Locale is expressed via a path prefix (`/en-us/`, `/fr-fr/`, etc.) or a
  // query param. We preserve whatever's in the path so the recipient sees the
  // listing in the same language the sender was viewing.
  const AGODA_HOST_REGEX = /(?:^|\.)agoda\.com$/i;

  // Hotel listing URL paths look like:
  //   /some-slug/hotel/city-xx.html
  //   /en-us/some-slug/hotel/city-xx.html  (locale prefix)
  // The defining feature is `/hotel/<file>.html`.
  const HOTEL_PATH_REGEX = /\/hotel\/[^/]+\.html$/i;

  function isAgodaHost(hostname) {
    if (!hostname) return false;
    return AGODA_HOST_REGEX.test(hostname);
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
    if (!isAgodaHost(url.hostname)) return false;
    return HOTEL_PATH_REGEX.test(url.pathname);
  }

  // Just the bare hotel URL — origin + path, no query, no hash.
  function shortPropertyUrl(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  // Hotel URL with `checkIn` and `los` preserved. Returns null if either is
  // missing or malformed, so the caller can disable the "With Dates" button
  // cleanly when the user hasn't picked dates yet.
  //
  // `los` = length of stay in nights — Agoda's own URL shape. Agoda derives
  // check-out from check-in + los, so that's all we need.
  function shortUrlWithDates(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const checkIn = url.searchParams.get('checkIn');
    const los = url.searchParams.get('los');
    if (!checkIn || !los) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) return null;
    if (!/^[1-9]\d*$/.test(los)) return null;

    const qs = new URLSearchParams();
    qs.set('checkIn', checkIn);
    qs.set('los', los);
    return `${url.protocol}//${url.host}${url.pathname}?${qs.toString()}`;
  }

  function hasDates(input) {
    return shortUrlWithDates(input) !== null;
  }

  // Address-bar form. Strips everything except the search inputs that
  // actually matter when the recipient lands on the page: dates and
  // occupancy. Empty values are dropped so we don't end up with
  // `&childAges=` noise.
  //
  // Kept params:
  //   checkIn, los          — dates (YYYY-MM-DD + nights)
  //   adults, children      — guest count
  //   rooms                 — room count
  //   childAges             — only meaningful when children > 0
  //
  // Returns null on non-hotel pages so the caller can no-op cleanly.
  const ADDRESS_BAR_KEEP = ['checkIn', 'los', 'adults', 'children', 'rooms', 'childAges'];

  function shortUrlForBar(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const qs = new URLSearchParams();
    for (const key of ADDRESS_BAR_KEEP) {
      const val = url.searchParams.get(key);
      if (val !== null && val !== '') qs.set(key, val);
    }

    const search = qs.toString();
    return search
      ? `${url.protocol}//${url.host}${url.pathname}?${search}`
      : `${url.protocol}//${url.host}${url.pathname}`;
  }

  const api = {
    isAgodaHost,
    isHotelPage,
    shortPropertyUrl,
    shortUrlWithDates,
    shortUrlForBar,
    hasDates,
    AGODA_HOST_REGEX,
    HOTEL_PATH_REGEX,
  };

  global.AgodaLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
