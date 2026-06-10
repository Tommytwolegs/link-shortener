// walmart.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Walmart product URLs. Address-bar-only.
//
// Recognized forms (kept as-is; just strip tracking):
//
//   /ip/<numeric id>                               → bare canonical
//   /ip/<slug>/<numeric id>                        → slug + id (canonical)
//   /ip/<slug>/<numeric id>/                       → trailing slash tolerated
//
// Tracking parameters stripped: ath* (athcpid, athpgid, athcgid, athznid,
// athieid, athbdg, athstid, athsdetail), from, wmlspartner, selectedSellerId,
// adsRedirect, sourceid, sid, oid, veh, plus the universal utm_/fbclid/gclid
// family via the global UtmStripper (we don't depend on it here — the
// universal-strip toggle and the per-site strip both fire when both are
// enabled).
//
// Seller pages (/seller/<id>), search pages, and category browse pages are
// NOT recognized — they're navigational rather than shareable product
// permalinks.
//
// The URL hash is preserved.
//
// Hosts: walmart.com, walmart.ca.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const WALMART_HOST_REGEX = /(?:^|\.)walmart\.(?:com|ca)$/i;

  function isWalmartHost(hostname) {
    if (!hostname) return false;
    return WALMART_HOST_REGEX.test(hostname);
  }

  // /ip/<id> or /ip/<slug>/<id>. The numeric id must come last (other than
  // an optional trailing slash). Walmart product IDs are 6+ digit integers.
  const PRODUCT_PATH_REGEX = /^\/ip\/(?:[^/?#]+\/)?\d{4,}\/?$/i;

  function isProductPath(pathname) {
    return PRODUCT_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWalmartHost(url.hostname)) return false;
    return isProductPath(url.pathname);
  }

  // Tracking parameters specific to Walmart. The universal-strip module
  // catches utm_/gclid/fbclid/etc., so we just need the Walmart-specific
  // ones here. (Listed as exact-match — Walmart's "ath" prefix family is
  // small enough to enumerate and prefix-matching would risk false
  // positives on hypothetical functional params.)
  const TRACKING_PARAMS = new Set([
    'athcpid', 'athpgid', 'athcgid', 'athznid', 'athieid',
    'athbdg', 'athstid', 'athsdetail', 'athasid', 'athancid',
    'from', 'wmlspartner', 'selectedsellerid',
    'adsredirect', 'sourceid', 'sid', 'oid', 'veh',
    'irgwc', 'sharedid', 'clickid',
  ]);

  function shortenWalmartUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isWalmartHost(url.hostname)) return null;
    if (!isProductPath(url.pathname)) return null;
    // Strip Walmart-specific tracking params; leave anything else alone
    // (the universal-strip toggle handles utm_/gclid/etc.).
    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (TRACKING_PARAMS.has(name.toLowerCase())) {
        url.searchParams.delete(name);
      }
    }
    const hash = url.hash || '';
    const query = url.search; // includes the leading '?' if any params remain
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWalmartHost(url.hostname)) return false;
    const cleaned = shortenWalmartUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isWalmartHost,
    isPostUrl,
    shortenWalmartUrl,
    shortenUrl: shortenWalmartUrl,
    needsShortening,
    STORAGE_KEY: 'enabledWalmart',
    WALMART_HOST_REGEX,
    PRODUCT_PATH_REGEX,
    TRACKING_PARAMS,
  };
  global.WalmartLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
