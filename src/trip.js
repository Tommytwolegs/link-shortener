// trip.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Trip.com hotel detail URLs and building short
// share URLs. Three flavours, mirroring agoda.js / booking.js:
//
//   shortPropertyUrl(url)   → /hotels/detail/?hotelId=<id> only
//   shortUrlWithDates(url)  → adds checkIn/checkOut, else null
//   shortUrlForBar(url)     → keeps dates + occupancy + cityId
//
// Unlike the other hotel sites, Trip.com keeps the hotel identity in a QUERY
// param (hotelId), not the path — so even the canonical share form carries a
// query string. Verified live 2026-06-12: detail links carry hotelId,
// checkIn, checkOut, adult, children, ages, crn, cityId (functional) plus
// hoteluniquekey, masterhotelid_tracelogid, subStamp, detailFilters, isCT,
// isFirstEnterDetail, isRightClick, display, curr, barcurr, locale (junk).
//
// The URL hash is preserved in the bar form.
//
// Hosts: trip.com (any subdomain — www, us, hk, etc.).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TRIP_HOST_REGEX = /(?:^|\.)trip\.com$/i;
  const HOTEL_PATH_REGEX = /^\/hotels\/detail\/?$/i;

  function isTripHost(hostname) {
    if (!hostname) return false;
    return TRIP_HOST_REGEX.test(hostname);
  }

  function toUrl(input) {
    try {
      return typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
  }

  // A hotel page needs BOTH the /hotels/detail/ path AND a hotelId param.
  function isHotelPage(input) {
    const url = toUrl(input);
    if (!url) return false;
    if (!isTripHost(url.hostname)) return false;
    if (!HOTEL_PATH_REGEX.test(url.pathname)) return false;
    const id = url.searchParams.get('hotelId');
    return !!(id && /^\d+$/.test(id));
  }

  function shortPropertyUrl(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;
    const id = url.searchParams.get('hotelId');
    return `${url.protocol}//${url.host}${url.pathname}?hotelId=${id}`;
  }

  function shortUrlWithDates(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');
    if (!checkIn || !checkOut) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return null;
    if (checkOut <= checkIn) return null;

    const qs = new URLSearchParams();
    qs.set('hotelId', url.searchParams.get('hotelId'));
    qs.set('checkIn', checkIn);
    qs.set('checkOut', checkOut);
    return `${url.protocol}//${url.host}${url.pathname}?${qs.toString()}`;
  }

  function hasDates(input) {
    return shortUrlWithDates(input) !== null;
  }

  // Address-bar form: hotel identity + dates + occupancy + city context.
  const ADDRESS_BAR_KEEP = [
    'hotelId', 'checkIn', 'checkOut', 'adult', 'children', 'ages', 'crn', 'cityId',
  ];

  function shortUrlForBar(input) {
    const url = toUrl(input);
    if (!url || !isHotelPage(url)) return null;

    const qs = new URLSearchParams();
    for (const key of ADDRESS_BAR_KEEP) {
      const val = url.searchParams.get(key);
      if (val !== null && val !== '') qs.set(key, val);
    }

    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}?${qs.toString()}${hash}`;
  }

  const api = {
    isTripHost,
    isHotelPage,
    shortPropertyUrl,
    shortUrlWithDates,
    shortUrlForBar,
    hasDates,
    TRIP_HOST_REGEX,
    HOTEL_PATH_REGEX,
  };
  global.TripLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
