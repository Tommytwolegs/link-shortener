// booking.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Booking.com hotel listing URLs and building
// short share URLs from them. Three flavours, mirroring agoda.js:
//
//   shortPropertyUrl(url)   → origin + path only (no query, no hash)
//   shortUrlWithDates(url)  → adds `?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`
//                             if dates are present, else null
//   shortUrlForBar(url)     → keeps dates + occupancy. Used by the content
//                             script to clean the address bar in place.
//
// Booking.com URLs look like:
//   https://www.booking.com/hotel/<cc>/<slug>.html?aid=…&checkin=YYYY-MM-DD
//     &checkout=YYYY-MM-DD&group_adults=2&group_children=0&no_rooms=1&…
//
// `<cc>` is a 2-letter country code (`th`, `gb`, `us`, …). The defining
// feature of a hotel listing URL is `/hotel/<cc>/<slug>.html`.
//
// Loaded as:
//   * a classic content script (sets `window.BookingLinkShortener`)
//   * a service-worker importScripts target (sets `self.BookingLinkShortener`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Booking.com is a single domain worldwide — no regional TLDs. Locale is
  // expressed via a `lang=` query param or path segment.
  const BOOKING_HOST_REGEX = /(?:^|\.)booking\.com$/i;

  // Hotel listing path: `/hotel/<2-letter-cc>/<slug>.html`.
  const HOTEL_PATH_REGEX = /^\/hotel\/[a-z]{2}\/[^/]+\.html$/i;

  function isBookingHost(hostname) {
    if (!hostname) return false;
    return BOOKING_HOST_REGEX.test(hostname);
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
    if (!isBookingHost(url.hostname)) return false;
    return HOTEL_PATH_REGEX.test(url.pathname);
  }

  // Just the bare hotel URL — origin + path, no query, no hash.
  function shortPropertyUrl(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  // Hotel URL with `checkin` and `checkout` preserved. Returns null if
  // either is missing or malformed, so the caller can disable the "With
  // Dates" button cleanly when the user hasn't picked dates yet.
  function shortUrlWithDates(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const checkin = url.searchParams.get('checkin');
    const checkout = url.searchParams.get('checkout');
    if (!checkin || !checkout) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkout)) return null;
    if (checkout <= checkin) return null;

    const qs = new URLSearchParams();
    qs.set('checkin', checkin);
    qs.set('checkout', checkout);
    return `${url.protocol}//${url.host}${url.pathname}?${qs.toString()}`;
  }

  function hasDates(input) {
    return shortUrlWithDates(input) !== null;
  }

  // Address-bar form. Strips Booking's enormous query string down to the
  // params that actually affect what the recipient sees: dates + occupancy.
  // Empty values are dropped.
  //
  // Kept params:
  //   checkin, checkout         — dates
  //   group_adults              — adult guest count
  //   group_children            — child guest count
  //   no_rooms                  — room count
  //   age                       — child ages (Booking encodes one per param;
  //                                rare but worth keeping when present)
  //
  // Returns null on non-hotel pages so the caller can no-op cleanly.
  const ADDRESS_BAR_KEEP = [
    'checkin',
    'checkout',
    'group_adults',
    'group_children',
    'no_rooms',
    'age',
  ];

  function shortUrlForBar(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const qs = new URLSearchParams();
    for (const key of ADDRESS_BAR_KEEP) {
      // `age` may appear multiple times (one per child); preserve all.
      const vals = url.searchParams.getAll(key);
      for (const v of vals) {
        if (v !== null && v !== '') qs.append(key, v);
      }
    }

    const search = qs.toString();
    return search
      ? `${url.protocol}//${url.host}${url.pathname}?${search}`
      : `${url.protocol}//${url.host}${url.pathname}`;
  }

  const api = {
    isBookingHost,
    isHotelPage,
    shortPropertyUrl,
    shortUrlWithDates,
    shortUrlForBar,
    hasDates,
    BOOKING_HOST_REGEX,
    HOTEL_PATH_REGEX,
  };

  global.BookingLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
