// primevideo.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Prime Video URLs. Address-bar-only.
//
// Amazon-family junk on a dedicated host. Title pages are
// primevideo.com/detail/<id>/ and share/browse actions append:
//
//   /ref=atv_hm_hom_...     — attribution as a PATH SUFFIX (amazon.js style)
//   ?ref_=...               — attribution as a query param
//   pf_rd_* / pd_rd_*       — placement tracking families
//   tag/linkCode/camp/creative/ascsubtag — Associates (affiliate) params
//
// Strategy: strip the trailing /ref=... path segment + a denylist of the
// documented Amazon junk families + universal ad-click junk. KEEP
// everything else (autoplay, t= resume timestamps, episode selectors).
//
// The URL hash is preserved.
//
// Hosts: primevideo.com and any subdomain.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const PRIMEVIDEO_HOST_REGEX = /(?:^|\.)primevideo\.com$/i;

  function isPrimevideoHost(hostname) {
    if (!hostname) return false;
    return PRIMEVIDEO_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set([
    'ref_', 'ref', 'tag', 'linkcode', 'camp', 'creative', 'creativeasin',
    'ascsubtag', 'linkid',
    'gclid', 'dclid', 'fbclid', 'msclkid', 'ttclid', 'twclid',
    'mc_cid', 'mc_eid',
  ]);
  const TRACKING_PREFIXES = ['utm_', 'pf_rd_', 'pd_rd_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  // Trailing "/ref=..." attribution path segment (never contains a slash).
  const REF_PATH_REGEX = /\/ref=[^/]*$/i;

  function stripRefPath(pathname) {
    return pathname.replace(REF_PATH_REGEX, '');
  }

  // "Post" here = any Prime Video URL carrying strippable junk.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isPrimevideoHost(url.hostname)) return false;
    if (REF_PATH_REGEX.test(url.pathname)) return true;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenPrimevideoUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isPrimevideoHost(url.hostname)) return null;

    const pathname = stripRefPath(url.pathname) || '/';
    const names = Array.from(url.searchParams.keys());
    for (const name of names) {
      if (isTrackingParam(name)) url.searchParams.delete(name);
    }
    const hash = url.hash || '';
    const query = url.search;
    return `${url.protocol}//${url.host}${pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isPrimevideoHost(url.hostname)) return false;
    const cleaned = shortenPrimevideoUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isPrimevideoHost,
    isPostUrl,
    shortenPrimevideoUrl,
    shortenUrl: shortenPrimevideoUrl,
    needsShortening,
    STORAGE_KEY: 'enabledPrimevideo',
    PRIMEVIDEO_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.PrimevideoLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
