// expedia.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Expedia hotel listing URLs and building short
// share URLs from them. Three flavours, mirroring agoda.js / booking.js:
//
//   shortPropertyUrl(url)   → origin + path only (no query, no hash)
//   shortUrlWithDates(url)  → adds `?chkin=YYYY-MM-DD&chkout=YYYY-MM-DD`
//                             if dates are present, else null
//   shortUrlForBar(url)     → keeps dates + occupancy. Used by the content
//                             script to clean the address bar in place.
//
// Expedia hotel URLs look like:
//   https://www.expedia.com/<City>-Hotels-<Hotel-Name>.h<id>.Hotel-Information
//     ?chkin=YYYY-MM-DD&chkout=YYYY-MM-DD&rm1=a2&rm2=a2,c5_8&…
//
// The defining feature of a hotel listing URL is the `.h<digits>.Hotel-Information`
// suffix on the path. Occupancy is encoded per-room as `rm1`, `rm2`, … with
// adults/children flagged inside the value (`a2,c5_8`). We preserve all
// `rm<n>` params verbatim.
//
// Loaded as:
//   * a classic content script (sets `window.ExpediaLinkShortener`)
//   * a service-worker importScripts target (sets `self.ExpediaLinkShortener`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Expedia ships per regional TLD. Match the common ones — anything else
  // falls through and the user can ask us to add it.
  const EXPEDIA_HOST_REGEX =
    /(?:^|\.)expedia\.(?:com|co\.uk|ca|com\.au|de|fr|it|es|nl|com\.mx|com\.br|co\.jp|com\.sg|co\.in|ie|be|at|dk|fi|no|se|ch|com\.hk|co\.kr|com\.tw|co\.nz|co\.th|com\.my|com\.ph|com\.vn|com\.tr)$/i;

  // Hotel listing path: ends in `.h<digits>.Hotel-Information`.
  const HOTEL_PATH_REGEX = /^\/.+\.h\d+\.Hotel-Information$/i;

  // Per-room occupancy keys: `rm1`, `rm2`, `rm3`, …
  const RM_KEY_REGEX = /^rm\d+$/i;

  function isExpediaHost(hostname) {
    if (!hostname) return false;
    return EXPEDIA_HOST_REGEX.test(hostname);
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
    if (!isExpediaHost(url.hostname)) return false;
    return HOTEL_PATH_REGEX.test(url.pathname);
  }

  // Just the bare hotel URL — origin + path, no query, no hash.
  function shortPropertyUrl(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  // Hotel URL with `chkin` and `chkout` preserved. Returns null if either is
  // missing or malformed, so the caller can disable the "With Dates" button
  // cleanly when the user hasn't picked dates yet.
  function shortUrlWithDates(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const chkin = url.searchParams.get('chkin');
    const chkout = url.searchParams.get('chkout');
    if (!chkin || !chkout) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chkin)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chkout)) return null;
    if (chkout <= chkin) return null;

    const qs = new URLSearchParams();
    qs.set('chkin', chkin);
    qs.set('chkout', chkout);
    return `${url.protocol}//${url.host}${url.pathname}?${qs.toString()}`;
  }

  function hasDates(input) {
    return shortUrlWithDates(input) !== null;
  }

  // Address-bar form. Strips Expedia's enormous query string down to params
  // that actually affect what the recipient sees: dates + per-room occupancy.
  // Empty values are dropped.
  //
  // Kept params:
  //   chkin, chkout    — dates
  //   rm1, rm2, …      — per-room occupancy (any rmN key, in original order)
  //
  // Returns null on non-hotel pages so the caller can no-op cleanly.
  function shortUrlForBar(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const qs = new URLSearchParams();

    const chkin = url.searchParams.get('chkin');
    if (chkin !== null && chkin !== '') qs.append('chkin', chkin);
    const chkout = url.searchParams.get('chkout');
    if (chkout !== null && chkout !== '') qs.append('chkout', chkout);

    // Walk the original param order so rm1, rm2, … stay sorted naturally.
    // De-dupe in case a key shows up twice (Expedia normally won't).
    const seen = new Set();
    for (const [key, value] of url.searchParams.entries()) {
      if (!RM_KEY_REGEX.test(key)) continue;
      if (seen.has(key.toLowerCase())) continue;
      if (value === '') continue;
      seen.add(key.toLowerCase());
      qs.append(key, value);
    }

    const search = qs.toString();
    return search
      ? `${url.protocol}//${url.host}${url.pathname}?${search}`
      : `${url.protocol}//${url.host}${url.pathname}`;
  }

  const api = {
    isExpediaHost,
    isHotelPage,
    shortPropertyUrl,
    shortUrlWithDates,
    shortUrlForBar,
    hasDates,
    EXPEDIA_HOST_REGEX,
    HOTEL_PATH_REGEX,
  };

  global.ExpediaLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
