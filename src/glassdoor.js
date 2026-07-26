// glassdoor.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Glassdoor URLs. Address-bar-only.
//
//   glassdoor.com/Overview/Working-at-<Company>-EI_IE<id>.htm  → company page
//   glassdoor.com/job-listing/<slug>-JV_...htm                 → job listing
//
// The identity lives in the PATH (EI_IE<id> / JV ids), never touched.
//
// DENYLIST strategy: keep the path + functional query, strip only click junk:
// utm_*, fbclid, gclid, src, srcTok, cb, jobListingId(when it duplicates the
// path).
//
// The URL hash is preserved.
//
// Hosts: glassdoor.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const GLASSDOOR_HOST_REGEX = /(?:^|\.)glassdoor\.com$/i;

  function isGlassdoorHost(hostname) {
    if (!hostname) return false;
    return GLASSDOOR_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['src', 'srctok', 'cb', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isGlassdoorHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenGlassdoorUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isGlassdoorHost(url.hostname)) return null;
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
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isGlassdoorHost(url.hostname)) return false;
    const cleaned = shortenGlassdoorUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isGlassdoorHost,
    isPostUrl,
    shortenGlassdoorUrl,
    shortenUrl: shortenGlassdoorUrl,
    needsShortening,
    STORAGE_KEY: 'enabledGlassdoor',
    GLASSDOOR_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.GlassdoorLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
