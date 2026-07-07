// bing.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Bing search result URLs. Address-bar-only.
//
//   www.bing.com/search?q=...          → web results
//   www.bing.com/images/search?q=...   → image results
//   www.bing.com/videos/search?q=...   → video results
//   www.bing.com/news/search?q=...     → news results
//
// DENYLIST strategy, deliberately conservative (same shape as google.js):
// the query state users share (q, first pagination, count, mkt/setlang
// locale, filters, qft news filters, safesearch) survives; only known
// per-session junk is stripped: form (entry-point attribution like
// FORM=QBLH), cvid (conversation id), pq/lq (typed-prefix telemetry),
// qs/sp/sc/sk (suggestion telemetry), ghsh/ghacc/ghpl/ghc (Github-style
// telemetry), pc (partner code), toWww/redig (www-redirect telemetry),
// ntref, plus the universal utm_* / fbclid / gclid click junk.
//
// Scope is the four search paths on bing.com / www.bing.com / cn.bing.com
// ONLY — maps, shopping, account pages and everything else are never
// touched.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BING_HOST_REGEX = /^(?:www\.|cn\.)?bing\.com$/i;

  function isBingHost(hostname) {
    if (!hostname) return false;
    return BING_HOST_REGEX.test(hostname);
  }

  const SEARCH_PATH_REGEX = /^\/(?:search|images\/search|videos\/search|news\/search)\/?$/i;

  // A search URL needs a search path AND a non-empty q=.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBingHost(url.hostname)) return false;
    if (!SEARCH_PATH_REGEX.test(url.pathname)) return false;
    const q = url.searchParams.get('q');
    return !!(q && q.length);
  }

  const TRACKING_PARAMS = new Set([
    'form', 'cvid', 'pq', 'lq', 'qs', 'sp', 'sc', 'sk',
    'ghsh', 'ghacc', 'ghpl', 'ghc', 'pc', 'towww', 'redig',
    'ntref', 'fbclid', 'gclid',
  ]);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function shortenBingUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isPostUrl(url)) return null;

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
    if (!isBingHost(url.hostname)) return false;
    const cleaned = shortenBingUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBingHost,
    isPostUrl,
    shortenBingUrl,
    shortenUrl: shortenBingUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBing',
    BING_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.BingLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
