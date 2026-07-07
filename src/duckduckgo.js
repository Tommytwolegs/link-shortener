// duckduckgo.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning DuckDuckGo search URLs. Address-bar-only.
//
//   duckduckgo.com/?q=...          → search results (search lives at the root)
//   html.duckduckgo.com/html?q=... → no-JS interface
//   lite.duckduckgo.com/lite?q=... → lite interface
//
// DENYLIST strategy, tiny by design: DDG URLs are already close to clean.
// Functional state survives — q, ia/iax/iar/iaf (results tab: web, images,
// videos...), kp (safe search), kl (region), df (date filter), and every
// k* settings param. Only two documented junk params are stripped:
//
//   t   — traffic source attribution (t=h_ header search, t=ffab Firefox
//         address bar, partner tags...) — DDG's own docs call it the
//         "traffic source" parameter
//   atb — install-cohort / A-B test token
//
// ...plus the universal utm_* / fbclid / gclid click junk.
//
// A URL with no q= is not a search and is never touched.
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const DDG_HOST_REGEX = /^(?:www\.|html\.|lite\.|start\.)?duckduckgo\.com$/i;

  function isDuckduckgoHost(hostname) {
    if (!hostname) return false;
    return DDG_HOST_REGEX.test(hostname);
  }

  // A search URL is any path on a DDG host with a non-empty q=.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isDuckduckgoHost(url.hostname)) return false;
    const q = url.searchParams.get('q');
    return !!(q && q.length);
  }

  const TRACKING_PARAMS = new Set(['t', 'atb', 'fbclid', 'gclid']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function shortenDuckduckgoUrl(input) {
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
    if (!isDuckduckgoHost(url.hostname)) return false;
    const cleaned = shortenDuckduckgoUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isDuckduckgoHost,
    isPostUrl,
    shortenDuckduckgoUrl,
    shortenUrl: shortenDuckduckgoUrl,
    needsShortening,
    STORAGE_KEY: 'enabledDuckduckgo',
    DDG_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.DuckduckgoLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
