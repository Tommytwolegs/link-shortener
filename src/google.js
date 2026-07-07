// google.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Google Search result URLs. Address-bar-only.
//
//   www.google.com/search?q=...    → search results
//
// DENYLIST strategy, deliberately conservative: Google search URLs mix the
// query state users share (q, tbm/udm mode, hl language, start pagination,
// tbs filters, num, safe, lr, as_*) with per-session click tracking. Only
// the known junk is stripped: ved, ei, sa, sxsrf, sca_esv, sca_upv, oq,
// aqs, sourceid, ie, uact, biw, bih, client, sclient, source, fbs, vet,
// dpr, gs_* prefix, utm_* prefix. Everything unrecognized stays.
//
// Scope is the /search path on www.google.com / google.com ONLY — no
// regional TLDs, no other Google properties (maps, accounts, mail are
// different hosts or paths and are never touched).
//
// The URL hash is preserved.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const GOOGLE_HOST_REGEX = /^(?:www\.)?google\.com$/i;

  function isGoogleHost(hostname) {
    if (!hostname) return false;
    return GOOGLE_HOST_REGEX.test(hostname);
  }

  const SEARCH_PATH_REGEX = /^\/search\/?$/;

  // A search URL needs the /search path AND a non-empty q=.
  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isGoogleHost(url.hostname)) return false;
    if (!SEARCH_PATH_REGEX.test(url.pathname)) return false;
    const q = url.searchParams.get('q');
    return !!(q && q.length);
  }

  const TRACKING_PARAMS = new Set([
    'ved', 'ei', 'sa', 'sxsrf', 'sca_esv', 'sca_upv', 'oq', 'aqs',
    'sourceid', 'ie', 'uact', 'biw', 'bih', 'client', 'sclient',
    'source', 'fbs', 'vet', 'dpr',
  ]);
  const TRACKING_PREFIXES = ['gs_', 'utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function shortenGoogleUrl(input) {
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
    if (!isGoogleHost(url.hostname)) return false;
    const cleaned = shortenGoogleUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isGoogleHost,
    isPostUrl,
    shortenGoogleUrl,
    shortenUrl: shortenGoogleUrl,
    needsShortening,
    STORAGE_KEY: 'enabledGoogle',
    GOOGLE_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.GoogleLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
