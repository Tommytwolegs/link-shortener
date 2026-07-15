// loom.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Loom video share URLs. Address-bar-only.
// Work-tools pack.
//
// Loom share links are loom.com/share/<32hex> plus sid=, a share-session
// tracking id appended by the "copy link" button:
//
//   loom.com/share/abc123...?sid=f9a81b2c-...
//
// The video plays identically without sid. DENYLIST strategy, but sid is
// stripped ONLY on /share/ paths — elsewhere on loom.com the name is not
// verified to be junk. Universal ad-click junk is stripped host-wide.
// KEEP t= (timestamp deep-link, e.g. t=42 jumps to 0:42) — functional.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const LOOM_HOST_REGEX = /(?:^|\.)loom\.com$/i;
  const SHARE_PATH_REGEX = /^\/share\//i;

  function isLoomHost(hostname) {
    if (!hostname) return false;
    return LOOM_HOST_REGEX.test(hostname);
  }

  const UNIVERSAL_PARAMS = new Set([
    'gclid', 'dclid', 'fbclid', 'msclkid',
    'mc_cid', 'mc_eid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];
  const SHARE_ONLY_PARAMS = new Set(['sid']);

  function isTrackingParam(name, pathname) {
    const lower = name.toLowerCase();
    if (UNIVERSAL_PARAMS.has(lower)) return true;
    if (TRACKING_PREFIXES.some((p) => lower.startsWith(p))) return true;
    if (SHARE_PATH_REGEX.test(pathname || '') && SHARE_ONLY_PARAMS.has(lower)) return true;
    return false;
  }

  // "Post" here = any Loom URL carrying at least one strippable param.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLoomHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys())
      .some((n) => isTrackingParam(n, url.pathname));
  }

  function shortenLoomUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isLoomHost(url.hostname)) return null;

    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name, url.pathname)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isLoomHost(url.hostname)) return false;
    const cleaned = shortenLoomUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isLoomHost,
    isPostUrl,
    shortenLoomUrl,
    shortenUrl: shortenLoomUrl,
    needsShortening,
    STORAGE_KEY: 'enabledLoom',
    LOOM_HOST_REGEX,
    UNIVERSAL_PARAMS,
  };
  global.LoomLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
