// tripadvisor.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Tripadvisor review-page URLs. Address-bar-only.
//
// Recognized forms:
//
//   /Hotel_Review-g<geo>-d<id>-Reviews-<slug>.html
//   /Restaurant_Review-g<geo>-d<id>-Reviews-<slug>.html
//   /Attraction_Review-g<geo>-d<id>-Reviews-<slug>.html
//
// IMPORTANT: review pagination and filters live IN THE PATH
// (…-Reviews-or10-<slug>.html is page 2), so the path is always kept
// verbatim. DENYLIST strategy on the query — only known junk is stripped
// (m = marketing attribution, supag, supai, taml, gclid, utm_*), anything
// unrecognized is left alone.
//
// The URL hash is preserved (#REVIEWS anchor navigation).
//
// Hosts: tripadvisor.com + major regional TLDs.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TRIPADVISOR_HOST_REGEX =
    /(?:^|\.)tripadvisor\.(?:com|co\.uk|ca|com\.au|fr|de|it|es|in|nl|ie|com\.sg|com\.my|com\.br|com\.mx)$/i;

  function isTripadvisorHost(hostname) {
    if (!hostname) return false;
    return TRIPADVISOR_HOST_REGEX.test(hostname);
  }

  const REVIEW_PATH_REGEX =
    /^\/(?:Hotel|Restaurant|Attraction)_Review-g\d+-d\d+-[^/?#]+\.html\/?$/;

  function isReviewPath(pathname) {
    return REVIEW_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTripadvisorHost(url.hostname)) return false;
    return isReviewPath(url.pathname);
  }

  const TRACKING_PARAMS = new Set(['m', 'supag', 'supai', 'taml', 'gclid', 'fid', 'spdid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function shortenTripadvisorUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isTripadvisorHost(url.hostname)) return null;
    if (!isReviewPath(url.pathname)) return null;

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
    if (!isTripadvisorHost(url.hostname)) return false;
    const cleaned = shortenTripadvisorUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTripadvisorHost,
    isPostUrl,
    shortenTripadvisorUrl,
    shortenUrl: shortenTripadvisorUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTripadvisor',
    TRIPADVISOR_HOST_REGEX,
    REVIEW_PATH_REGEX,
    TRACKING_PARAMS,
  };
  global.TripadvisorLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
