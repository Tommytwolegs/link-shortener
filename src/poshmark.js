// poshmark.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Poshmark listing URLs. Address-bar-only.
//
//   poshmark.com/listing/<slug>-<id>   → the listing id is in the PATH and is
//                                        never touched.
//
// DENYLIST strategy: keep the path + functional query, strip only click junk:
// utm_*, fbclid, gclid, campaign, source.
//
// The URL hash is preserved.
//
// Hosts: poshmark.com (any subdomain).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const POSHMARK_HOST_REGEX = /(?:^|\.)poshmark\.com$/i;

  function isPoshmarkHost(hostname) {
    if (!hostname) return false;
    return POSHMARK_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['campaign', 'source', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isPoshmarkHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenPoshmarkUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isPoshmarkHost(url.hostname)) return null;
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
    if (!isPoshmarkHost(url.hostname)) return false;
    const cleaned = shortenPoshmarkUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isPoshmarkHost,
    isPostUrl,
    shortenPoshmarkUrl,
    shortenUrl: shortenPoshmarkUrl,
    needsShortening,
    STORAGE_KEY: 'enabledPoshmark',
    POSHMARK_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.PoshmarkLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
