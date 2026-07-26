// box.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Box URLs. Address-bar-only.
//
// shared-file pages (identity in the /s/ path). DENYLIST strategy: keep the path + functional query (access
// tokens live in the path), strip only click junk: utm_*, fbclid, gclid.
//
// The URL hash is preserved.
//
// Hosts: box.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BOX_HOST_REGEX = /(?:^|\.)box\.com$/i;

  function isBoxHost(hostname) {
    if (!hostname) return false;
    return BOX_HOST_REGEX.test(hostname);
  }

  const TRACKING_PARAMS = new Set(['fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isBoxHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenBoxUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isBoxHost(url.hostname)) return null;
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
    if (!isBoxHost(url.hostname)) return false;
    const cleaned = shortenBoxUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBoxHost,
    isPostUrl,
    shortenBoxUrl,
    shortenUrl: shortenBoxUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBox',
    BOX_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.BoxLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
