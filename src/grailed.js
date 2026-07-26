// grailed.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Grailed listing URLs. Address-bar-only.
//
//   grailed.com/listings/<id>-<slug>   → the listing id is in the PATH and is
//                                        never touched.
//
// DENYLIST strategy: keep the path + functional query, strip click junk plus
// Grailed's Algolia click-analytics params: utm_*, fbclid, gclid, g_aidx,
// g_aci, g_acp.
//
// The URL hash is preserved.
//
// Hosts: grailed.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const GRAILED_HOST_REGEX = /(?:^|\.)grailed\.com$/i;

  function isGrailedHost(hostname) {
    if (!hostname) return false;
    return GRAILED_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['g_aidx', 'g_aci', 'g_acp', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isGrailedHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenGrailedUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isGrailedHost(url.hostname)) return null;
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
    if (!isGrailedHost(url.hostname)) return false;
    const cleaned = shortenGrailedUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isGrailedHost,
    isPostUrl,
    shortenGrailedUrl,
    shortenUrl: shortenGrailedUrl,
    needsShortening,
    STORAGE_KEY: 'enabledGrailed',
    GRAILED_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.GrailedLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
