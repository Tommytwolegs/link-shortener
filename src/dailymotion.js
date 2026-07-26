// dailymotion.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Dailymotion share URLs. Address-bar-only.
//
// Recognized forms:
//
//   dailymotion.com/video/<id>   → video permalink. Keeps ?start= (the
//                                   share-at-timestamp param, in seconds) and
//                                   ?playlist= (playlist context); strips the
//                                   rest.
//   dai.ly/<id>                  → short share link (strip all query).
//
// Everything else (utm_*, from, foll, ...) is stripped. Non-video paths run
// through a host-scoped fallback denylist.
//
// The URL hash is preserved.
//
// Hosts: dailymotion.com (any subdomain), dai.ly.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const DAILYMOTION_HOST_REGEX = /(?:^|\.)dailymotion\.com$/i;
  const DAI_LY_HOST_REGEX = /^dai\.ly$/i;

  function isDailymotionHost(hostname) {
    if (!hostname) return false;
    return DAILYMOTION_HOST_REGEX.test(hostname) || DAI_LY_HOST_REGEX.test(hostname);
  }

  const VIDEO_PATH = /^\/video\/[^/?#]+\/?$/;
  const DAI_LY_PATH = /^\/[^/?#]+\/?$/;

  function formFor(hostname, pathname) {
    if (DAI_LY_HOST_REGEX.test(hostname)) {
      if (DAI_LY_PATH.test(pathname)) return { keepParams: [] };
      return null;
    }
    if (VIDEO_PATH.test(pathname)) return { keepParams: ['start', 'playlist'] };
    return null;
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isDailymotionHost(url.hostname)) return false;
    return !!formFor(url.hostname, url.pathname);
  }

  // Host-scoped tracking params, stripped on ANY dailymotion path that isn't a
  // recognized video form. Denylist: functional params survive.
  const FALLBACK_STRIP = new Set(['fbclid', 'gclid']);
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

  function shortenDailymotionUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return null; }
    if (!isDailymotionHost(url.hostname)) return null;
    const form = formFor(url.hostname, url.pathname);
    if (!form) return fallbackClean(url);

    const params = new URLSearchParams();
    for (const k of form.keepParams) {
      const v = url.searchParams.get(k);
      if (v !== null && v !== '') params.set(k, v);
    }
    const q = params.toString();
    const query = q ? '?' + q : '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : (input || {}); } catch (_e) { return false; }
    if (!isDailymotionHost(url.hostname)) return false;
    const cleaned = shortenDailymotionUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isDailymotionHost,
    isPostUrl,
    shortenDailymotionUrl,
    shortenUrl: shortenDailymotionUrl,
    needsShortening,
    STORAGE_KEY: 'enabledDailymotion',
    DAILYMOTION_HOST_REGEX,
    DAI_LY_HOST_REGEX,
    FALLBACK_STRIP,
  };
  global.DailymotionLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
