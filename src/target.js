// target.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Target product URLs. Address-bar-only.
//
// Recognized forms (kept as-is; just strip tracking):
//
//   /p/<slug>/-/A-<tcin>            → canonical product page
//   /p/-/A-<tcin>                   → no slug variant
//   /p/<slug>/-/A-<tcin>/           → trailing slash tolerated
//
// "tcin" is Target's product ID, e.g. A-89898989 (always digits after A-).
//
// Tracking parameters stripped: lnk, clkid, ref, linkId, searchTerm,
// afid, cpng, ci_src, ci_sku, plus generic ad-network params already in
// the universal strip list.
//
// `preselect` is PRESERVED — it carries the child TCIN of the size/color
// variant the user picked (Target's analog of Amazon's th/psc). Stripping
// it would snap shared links back to the default variant.
//
// Plus URLs (/+/<slug>) — collections, deal pages, category landings —
// are NOT recognized.
//
// The URL hash is preserved.
//
// Host: target.com (Target only sells in the US).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TARGET_HOST_REGEX = /(?:^|\.)target\.com$/i;

  function isTargetHost(hostname) {
    if (!hostname) return false;
    return TARGET_HOST_REGEX.test(hostname);
  }

  // /p/<slug>/-/A-<tcin> with optional trailing slash. Slug is optional.
  const PRODUCT_PATH_REGEX = /^\/p\/(?:[^/?#]+\/)?-\/A-\d+\/?$/i;

  function isProductPath(pathname) {
    return PRODUCT_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTargetHost(url.hostname)) return false;
    return isProductPath(url.pathname);
  }

  // Target-specific tracking parameters, plus universal click junk
  // (fbclid/gclid exact; utm_* by prefix) so default-config users get
  // clean URLs without the universal-strip toggle.
  const TRACKING_PARAMS = new Set([
    'lnk', 'clkid', 'ref', 'linkid',
    'searchterm', 'afid', 'cpng', 'ci_src', 'ci_sku',
    'lookup', 'pi', 'sgo',
    'fbclid', 'gclid',
  ]);

  const TRACKING_PREFIXES = ['utm_'];

  function shortenTargetUrl(input) {
    let url;
    // Clone URL-object inputs — searchParams.delete below would otherwise
    // mutate the caller's object (and break needsShortening's comparison).
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isTargetHost(url.hostname)) return null;
    if (!isProductPath(url.pathname)) {
      // Non-product paths get a REDUCED strip: searchTerm is attribution
      // junk on product pages but IS the query on /s search pages.
      const clone = new URL(url.href);
      for (const name of Array.from(clone.searchParams.keys())) {
        const lower = name.toLowerCase();
        if ((lower !== 'searchterm' && TRACKING_PARAMS.has(lower))
            || TRACKING_PREFIXES.some((p) => lower.startsWith(p))) {
          clone.searchParams.delete(name);
        }
      }
      const h2 = clone.hash || '';
      return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${h2}`;
    }

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      const lower = name.toLowerCase();
      if (TRACKING_PARAMS.has(lower) || TRACKING_PREFIXES.some((p) => lower.startsWith(p))) {
        url.searchParams.delete(name);
      }
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTargetHost(url.hostname)) return false;
    const cleaned = shortenTargetUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTargetHost,
    isPostUrl,
    shortenTargetUrl,
    shortenUrl: shortenTargetUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTarget',
    TARGET_HOST_REGEX,
    PRODUCT_PATH_REGEX,
    TRACKING_PARAMS,
  };
  global.TargetLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
