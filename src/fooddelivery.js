// fooddelivery.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning food-delivery links. Address-bar-only.
// ONE module covering 4 US delivery services (news.js-style host table),
// each with its OWN toggle key (storageKeyFor), shown in the popup under
// a "Food delivery" category with a group switch. v1.14.
//
// SCOPE NOTE (deliberate): a MARKETING-JUNK denylist. "Order with me"
// store links shared from these apps arrive wrapped in campaign
// attribution; the store slug and id live in the path and are never
// touched. FUNCTIONAL params survive by construction because a denylist
// never touches what it doesn't name — notably:
//   ubereats:  diningMode (delivery vs pickup), mod/modctx (modal state),
//              promotionUuid (promo redemption)
//   doordash:  pickup (mode switch), cursor (pagination)
//   instacart: retailer selection lives in the path
// None of those appear in any denylist below.
//
// Per-site extras, attested junk on that site only:
//   doordash: event_type (search/autocomplete attribution breadcrumb)
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // host regex -> per-site toggle key + extra junk params (lowercase)
  const DELIVERY_SITES = [
    { host: /(?:^|\.)doordash\.com$/i, key: 'enabledDoordash', extra: ['event_type'] },
    { host: /(?:^|\.)ubereats\.com$/i, key: 'enabledUbereats', extra: [] },
    { host: /(?:^|\.)grubhub\.com$/i, key: 'enabledGrubhub', extra: [] },
    { host: /(?:^|\.)instacart\.com$/i, key: 'enabledInstacart', extra: [] },
  ];

  const UNIVERSAL_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid', 'cjevent', 'wt.mc_id',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function siteFor(hostname) {
    if (!hostname) return null;
    for (const s of DELIVERY_SITES) {
      if (s.host.test(hostname)) return s;
    }
    return null;
  }

  function isFooddeliveryHost(hostname) {
    return siteFor(hostname) !== null;
  }

  // Per-site toggle key for the dispatcher (news-pack pattern).
  function storageKeyFor(hostname) {
    const s = siteFor(hostname);
    return s ? s.key : null;
  }

  function isTrackingParam(name, site) {
    const lower = name.toLowerCase();
    if (UNIVERSAL_PARAMS.has(lower)) return true;
    if (TRACKING_PREFIXES.some((p) => lower.startsWith(p))) return true;
    return site.extra.indexOf(lower) !== -1;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    const site = siteFor(url.hostname);
    if (!site) return false;
    return Array.from(url.searchParams.keys())
      .some((n) => isTrackingParam(n, site));
  }

  function shortenFooddeliveryUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    const site = siteFor(url.hostname);
    if (!site) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name, site)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isFooddeliveryHost(url.hostname)) return false;
    const cleaned = shortenFooddeliveryUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isFooddeliveryHost,
    isPostUrl,
    storageKeyFor,
    shortenFooddeliveryUrl,
    shortenUrl: shortenFooddeliveryUrl,
    needsShortening,
    DELIVERY_SITES,
    UNIVERSAL_PARAMS,
  };
  global.FooddeliveryLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
