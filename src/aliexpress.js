// aliexpress.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning AliExpress item URLs. Address-bar-only.
//
// Recognized forms:
//
//   /item/<itemid>.html      → canonical item page
//   /i/<itemid>.html         → legacy short form
//
// Tracking parameters stripped: spm, srcSns, businessType, curPageLogUid,
// gatewayAdapt, _t, tt, utparam-url, aff_platform, aff_trace_key, af,
// pdp_npi, sk, algo_pvid, algo_exp_id, utm_* — everything; AliExpress keeps
// variant selection in in-page state, not the URL.
//
// The URL hash is preserved.
//
// Hosts: aliexpress.com and aliexpress.us (any subdomain: www, m, es, fr,
// pt, nl, ko, ja, th, vi, ar, tr, he, best, campaign excluded by path form).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const ALIEXPRESS_HOST_REGEX = /(?:^|\.)aliexpress\.(?:com|us)$/i;

  function isAliexpressHost(hostname) {
    if (!hostname) return false;
    return ALIEXPRESS_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/item\/\d+\.html\/?$/,
    /^\/i\/\d+\.html\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAliexpressHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenAliexpressUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isAliexpressHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isAliexpressHost(url.hostname)) return false;
    const cleaned = shortenAliexpressUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isAliexpressHost,
    isPostUrl,
    shortenAliexpressUrl,
    shortenUrl: shortenAliexpressUrl,
    needsShortening,
    STORAGE_KEY: 'enabledAliexpress',
    ALIEXPRESS_HOST_REGEX,
    POST_PATTERNS,
  };
  global.AliexpressLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
