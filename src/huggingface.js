// huggingface.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Hugging Face URLs. Address-bar-only.
//
// model / dataset / space pages (identity in the path).
//
// DENYLIST strategy: keep the path + functional query, strip only click junk:
// utm_*, fbclid, gclid. The URL hash is preserved (line anchors etc.).
//
// Hosts: huggingface.co.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const HUGGINGFACE_HOST_REGEX = /(?:^|\.)huggingface\.co$/i;

  function isHuggingfaceHost(hostname) {
    if (!hostname) return false;
    return HUGGINGFACE_HOST_REGEX.test(hostname);
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
    if (!isHuggingfaceHost(url.hostname)) return false;
    return Array.from(url.searchParams.keys()).some(isTrackingParam);
  }

  function shortenHuggingfaceUrl(input) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : (input && input.href)); } catch (_e) { return null; }
    if (!isHuggingfaceHost(url.hostname)) return null;
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
    if (!isHuggingfaceHost(url.hostname)) return false;
    const cleaned = shortenHuggingfaceUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isHuggingfaceHost,
    isPostUrl,
    shortenHuggingfaceUrl,
    shortenUrl: shortenHuggingfaceUrl,
    needsShortening,
    STORAGE_KEY: 'enabledHuggingface',
    HUGGINGFACE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.HuggingfaceLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
