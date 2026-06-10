// etsy.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Etsy listing URLs. Address-bar-only.
//
// Recognized forms (canonicalize to /listing/<id>/<slug>):
//
//   /listing/<numeric id>                           → bare canonical
//   /listing/<numeric id>/<slug>                    → with title slug
//   /<locale>/listing/<numeric id>[/<slug>]         → locale-prefixed
//
// Tracking parameters stripped: ref, frs, pro, crt, sts, epik, plkrid,
// content_source, organic_search_click, hp_recent_listings, click_key, etc.
//
// Shop pages (/shop/<name>/), search pages (/search?q=...), and category
// pages aren't recognized — they're navigational rather than shareable
// permalinks.
//
// The URL hash is preserved.
//
// Hosts: etsy.<regional-tld>.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Etsy ships per regional TLD. Match the major markets.
  const ETSY_HOST_REGEX =
    /(?:^|\.)etsy\.(?:com|de|fr|it|es|nl|co\.uk|com\.au|ca|jp|pl|in|com\.br|com\.mx|ie|com\.hk|com\.sg)$/i;

  function isEtsyHost(hostname) {
    if (!hostname) return false;
    return ETSY_HOST_REGEX.test(hostname);
  }

  // /listing/<id>[/<slug>] with optional /<locale>/ prefix.
  const LISTING_PATH_REGEX =
    /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/listing\/(\d+)(?:\/[^/?#]+)?\/?$/i;

  function isListingPath(pathname) {
    return LISTING_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isEtsyHost(url.hostname)) return false;
    return isListingPath(url.pathname);
  }

  function shortenEtsyUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isEtsyHost(url.hostname)) return null;
    if (!isListingPath(url.pathname)) return null;
    // The path itself (with optional locale prefix and slug) is canonical;
    // we just strip the query and keep the hash. We don't reorder /locale/
    // out because Etsy renders that locale's translation by default and
    // we shouldn't second-guess the user's region preference.
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isEtsyHost(url.hostname)) return false;
    const cleaned = shortenEtsyUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isEtsyHost,
    isPostUrl,
    shortenEtsyUrl,
    shortenUrl: shortenEtsyUrl,
    needsShortening,
    STORAGE_KEY: 'enabledEtsy',
    ETSY_HOST_REGEX,
    LISTING_PATH_REGEX,
  };
  global.EtsyLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
