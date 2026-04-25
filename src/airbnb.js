// airbnb.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Airbnb listing URLs and building short share
// URLs from them. Three flavours, mirroring agoda.js / booking.js / expedia.js:
//
//   shortPropertyUrl(url)   → origin + path only (no query, no hash)
//   shortUrlWithDates(url)  → adds `?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD`
//                             if dates are present, else null
//   shortUrlForBar(url)     → keeps dates + occupancy. Used by the content
//                             script to clean the address bar in place.
//
// Airbnb listing URLs look like:
//   https://www.airbnb.com/rooms/<digits>
//     ?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&adults=2&children=0&infants=0
//     &pets=0&search_mode=…&source_impression_id=…&federated_search_id=…
//
// The defining feature is `/rooms/<digits>` (with optional subtype prefix
// like `/rooms/plus/`, `/rooms/luxury/`, `/rooms/hotel/`).
//
// Loaded as:
//   * a classic content script (sets `window.AirbnbLinkShortener`)
//   * a service-worker importScripts target (sets `self.AirbnbLinkShortener`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Airbnb has regional TLDs but they normally redirect to airbnb.com with a
  // locale param. Match the common ones.
  const AIRBNB_HOST_REGEX =
    /(?:^|\.)airbnb\.(?:com|co\.uk|ca|com\.au|de|fr|it|es|nl|com\.mx|com\.br|co\.jp|com\.sg|co\.in|ie|be|at|dk|fi|no|se|ch|com\.hk|co\.kr|com\.tw|co\.nz|com\.tr|ru|pl|cz|gr|pt)$/i;

  // Listing path: `/rooms/<digits>` with an optional subtype segment in the
  // middle (`/rooms/plus/<digits>`, `/rooms/luxury/<digits>`, …).
  const ROOM_PATH_REGEX = /^\/rooms(?:\/[a-z0-9_-]+)?\/\d+$/i;

  function isAirbnbHost(hostname) {
    if (!hostname) return false;
    return AIRBNB_HOST_REGEX.test(hostname);
  }

  function toUrl(input) {
    try {
      return typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
  }

  function isListingPage(input) {
    const url = toUrl(input);
    if (!url) return false;
    if (!isAirbnbHost(url.hostname)) return false;
    return ROOM_PATH_REGEX.test(url.pathname);
  }

  // Just the bare listing URL — origin + path, no query, no hash.
  function shortPropertyUrl(input) {
    const url = toUrl(input);
    if (!url || !isListingPage(url)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  // Listing URL with `check_in` and `check_out` preserved. Returns null if
  // either is missing or malformed, so the caller can disable the "With
  // Dates" button cleanly when the user hasn't picked dates yet.
  function shortUrlWithDates(input) {
    const url = toUrl(input);
    if (!url || !isListingPage(url)) return null;

    const checkIn = url.searchParams.get('check_in');
    const checkOut = url.searchParams.get('check_out');
    if (!checkIn || !checkOut) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return null;
    if (checkOut <= checkIn) return null;

    const qs = new URLSearchParams();
    qs.set('check_in', checkIn);
    qs.set('check_out', checkOut);
    return `${url.protocol}//${url.host}${url.pathname}?${qs.toString()}`;
  }

  function hasDates(input) {
    return shortUrlWithDates(input) !== null;
  }

  // Address-bar form. Strips Airbnb's tracking params (search_mode,
  // source_impression_id, previous_page_section_name, federated_search_id,
  // etc.) down to dates + occupancy.
  //
  // Kept params:
  //   check_in, check_out   — dates
  //   adults, children      — guest count
  //   infants, pets         — additional guest types
  //
  // Returns null on non-listing pages so the caller can no-op cleanly.
  const ADDRESS_BAR_KEEP = [
    'check_in',
    'check_out',
    'adults',
    'children',
    'infants',
    'pets',
  ];

  function shortUrlForBar(input) {
    const url = toUrl(input);
    if (!url || !isListingPage(url)) return null;

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
    isAirbnbHost,
    isListingPage,
    // Alias for naming consistency with the other modules.
    isHotelPage: isListingPage,
    shortPropertyUrl,
    shortUrlWithDates,
    shortUrlForBar,
    hasDates,
    AIRBNB_HOST_REGEX,
    ROOM_PATH_REGEX,
  };

  global.AirbnbLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
