// shopify.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Shopify storefront URLs. Address-bar-only.
// Covers stores on the default *.myshopify.com subdomain. Shopify the
// PLATFORM stamps identical junk on every store: the in-store search
// attribution set (_pos position, _sid search id, _ss source, _psq typed
// query -- another search-query leak) and the recommendation-widget
// family (pr_prod_strat, pr_rec_id, pr_rec_pid, pr_ref_pid, pr_seq),
// plus srsltid (Google Shopping click id). variant= and selling_plan=
// are FUNCTIONAL and survive by denylist design; checkout/cart tokens
// are never named, so they are untouchable by construction.
//
// Custom-domain Shopify stores (most big brands) cannot be host-scoped;
// the unambiguous platform params (pr_*, srsltid) also live in utm.js so
// the copy pipeline and the opt-in universal strip clean them anywhere.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const SHOPIFY_HOST_REGEX = /(?:^|\.)myshopify\.com$/i;

  function isShopifyHost(hostname) {
    if (!hostname) return false;
    return SHOPIFY_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    '_pos', '_sid', '_ss', '_psq', 'pr_prod_strat', 'pr_rec_id',
    'pr_rec_pid', 'pr_ref_pid', 'pr_seq', 'srsltid', 'gclid',
    'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid', 'mc_cid',
    'mc_eid', 'cjevent', 'cjdata', 'ranmid', 'raneaid', 'ransiteid',
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
    if (!isShopifyHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenShopifyUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isShopifyHost(url.hostname)) return null;

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
    if (!isShopifyHost(url.hostname)) return false;
    const cleaned = shortenShopifyUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isShopifyHost,
    isPostUrl,
    shortenShopifyUrl,
    shortenUrl: shortenShopifyUrl,
    needsShortening,
    STORAGE_KEY: 'enabledShopify',
    SHOPIFY_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.ShopifyLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
