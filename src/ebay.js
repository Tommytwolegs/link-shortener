// ebay.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning eBay item URLs. Address-bar-only.
//
// Recognized forms — both canonicalize to /itm/<numeric id>:
//
//   /itm/<numeric id>                                    → bare canonical
//   /itm/<title-slug>/<numeric id>                       → with title slug
//
// Tracking parameters stripped: _trkparms, _trksid, epid, hash, mkcid,
// mkevt, mkrid, siteid, campid, customid, toolid, eep, etc.
//
// The `?var=<id>` query param IS preserved — it's the item-variation
// selector (different color/size of the same listing). A `var=0` value
// is intentionally dropped (means "no specific variation"). Param-name
// matching is case-insensitive so `?VAR=` and `?Var=` work too.
//
// The URL hash is preserved.
//
// Hosts: ebay.<regional-tld>. The path-based slug form folds away so the
// canonical URL is a short item identifier regardless of how the user
// landed on the page.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Match any ebay.<regional-tld>. Covers the major active markets. Defunct
  // markets like ebay.in and ebay.com.ph are intentionally left out — they
  // currently redirect and listing URLs on them don't exist.
  const EBAY_HOST_REGEX =
    /(?:^|\.)ebay\.(?:com|co\.uk|de|fr|it|es|nl|ca|com\.au|ie|com\.hk|com\.my|com\.sg|com\.tw|at|be|ch|pl|com\.tr)$/i;

  function isEbayHost(hostname) {
    if (!hostname) return false;
    return EBAY_HOST_REGEX.test(hostname);
  }

  // /itm/<id> or /itm/<title>/<id> — both canonicalize to /itm/<id>.
  const ITEM_PATH_REGEX = /^\/itm\/(?:[^/]+\/)?(\d+)\/?$/;

  function extractItemId(pathname) {
    if (!pathname) return null;
    const m = ITEM_PATH_REGEX.exec(pathname);
    return m ? m[1] : null;
  }

  function isItemPath(pathname) {
    return ITEM_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isEbayHost(url.hostname)) return false;
    return isItemPath(url.pathname);
  }

  // Allowlist of query params worth preserving on item pages. Names are
  // lowercase and matched case-insensitively against the URL's actual
  // param names so /itm/...?VAR=123 works too.
  //   var — variation selector (e.g. ?var=123456789 picks a specific
  //         color/size combination on a listing with variations).
  const KEEP_PARAMS = new Set(['var']);

  function shortenEbayUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isEbayHost(url.hostname)) return null;
    const id = extractItemId(url.pathname);
    if (!id) return null;

    const hash = url.hash || '';
    const params = new URLSearchParams();
    // Walk the actual param entries so case-insensitive matches still work
    // (URLSearchParams.get is case-sensitive, so we can't just look up by
    // lowercase key — we have to iterate and compare).
    for (const [name, value] of url.searchParams.entries()) {
      if (!KEEP_PARAMS.has(name.toLowerCase())) continue;
      // Drop empty AND drop the explicit "no variation" sentinel (var=0).
      if (value === '' || value === '0') continue;
      // Normalize to the lowercase canonical param name so output is
      // consistent regardless of how the input was capitalized.
      params.set(name.toLowerCase(), value);
    }
    const s = params.toString();
    const query = s ? '?' + s : '';
    return `${url.protocol}//${url.host}/itm/${id}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isEbayHost(url.hostname)) return false;
    const cleaned = shortenEbayUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isEbayHost,
    isPostUrl,
    shortenEbayUrl,
    shortenUrl: shortenEbayUrl,
    needsShortening,
    STORAGE_KEY: 'enabledEbay',
    EBAY_HOST_REGEX,
    ITEM_PATH_REGEX,
    KEEP_PARAMS,
  };
  global.EbayLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
