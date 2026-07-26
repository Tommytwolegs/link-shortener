// kaggle.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Kaggle URLs. Address-bar-only.
//
// dataset / notebook / competition pages (identity in the path).
//
// DENYLIST strategy: keep the path + functional query, strip only click junk:
// utm_*, fbclid, gclid. The URL hash is preserved (line anchors etc.).
//
// Hosts: kaggle.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const KAGGLE_HOST_REGEX = /(?:^|\.)kaggle\.com$/i;

  function isKaggleHost(hostname) {
    if (!hostname) return false;
    return KAGGLE_HOST_REGEX.test(hostname);
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
    if (!isKaggleHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenKaggleUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isKaggleHost(url.hostname)) return null;
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
    if (!isKaggleHost(url.hostname)) return false;
    const cleaned = shortenKaggleUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isKaggleHost,
    isPostUrl,
    shortenKaggleUrl,
    shortenUrl: shortenKaggleUrl,
    needsShortening,
    STORAGE_KEY: 'enabledKaggle',
    KAGGLE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.KaggleLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
