// threads.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Threads share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /@<user>/post/<id>             → canonical post permalink
//
// Tracking parameters stripped: xmt, igshid, hl, etc.
//
// FALLBACK: on non-post paths (profiles /@<user>, explore, search...), a
// host-scoped denylist still strips Threads' own share junk (xmt, igshid,
// igsh, ig_rid) + utm_*, leaving functional query state alone. xmt in
// particular is NOT in the universal strip list, so without this a shared
// profile link would leak it. Same pattern as the other social modules.
//
// The URL hash is preserved.
//
// Hosts: threads.net, threads.com (the latter is Meta's newer alias).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const THREADS_HOST_REGEX = /(?:^|\.)threads\.(?:net|com)$/i;

  function isThreadsHost(hostname) {
    if (!hostname) return false;
    return THREADS_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/@[^/]+\/post\/[^/?#]+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isThreadsHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  // Host-scoped tracking params, stripped on ANY threads path that isn't a
  // recognized post form. Denylist: functional params always survive.
  const FALLBACK_STRIP = new Set(['xmt', 'igshid', 'igsh', 'ig_rid', 'fbclid', 'gclid']);
  const FALLBACK_PREFIXES = ['utm_'];

  function fallbackClean(url) {
    const clone = new URL(url.href);
    for (const name of Array.from(clone.searchParams.keys())) {
      const lower = name.toLowerCase();
      if (FALLBACK_STRIP.has(lower) || FALLBACK_PREFIXES.some((p) => lower.startsWith(p))) {
        clone.searchParams.delete(name);
      }
    }
    const hash = clone.hash || '';
    return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${hash}`;
  }

  function shortenThreadsUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return null; }
    if (!isThreadsHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return fallbackClean(url);
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isThreadsHost(url.hostname)) return false;
    const cleaned = shortenThreadsUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isThreadsHost,
    isPostUrl,
    shortenThreadsUrl,
    shortenUrl: shortenThreadsUrl,
    needsShortening,
    STORAGE_KEY: 'enabledThreads',
    THREADS_HOST_REGEX,
    POST_PATTERNS,
    FALLBACK_STRIP,
  };
  global.ThreadsLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
