// wikipedia.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Wikipedia article URLs. Address-bar-only.
//
// Recognized form:
//
//   /wiki/<Article>      → article page (any language subdomain)
//
// DENYLIST strategy — only known-junk params are stripped, everything else
// is left alone. The big one is `wprov` (share-attribution appended by the
// Wikipedia mobile apps: ?wprov=sfti1 / sfla1); also utm_*. Functional
// /w/index.php params (oldid, diff, action) live on a different path and
// are never touched.
//
// The URL hash is ALWAYS preserved — section anchors are the whole point
// of many shared Wikipedia links.
//
// Hosts: wikipedia.org (any language/mobile subdomain: en., de., ja.,
// en.m., ...).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const WIKIPEDIA_HOST_REGEX = /(?:^|\.)wikipedia\.org$/i;

  function isWikipediaHost(hostname) {
    if (!hostname) return false;
    return WIKIPEDIA_HOST_REGEX.test(hostname);
  }

  const ARTICLE_PATH_REGEX = /^\/wiki\/[^?#]+$/;

  function isArticlePath(pathname) {
    return ARTICLE_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isWikipediaHost(url.hostname)) return false;
    return isArticlePath(url.pathname);
  }

  const TRACKING_PARAMS = new Set(['wprov']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function shortenWikipediaUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isWikipediaHost(url.hostname)) return null;
    if (!isArticlePath(url.pathname)) return null;

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
    if (!isWikipediaHost(url.hostname)) return false;
    const cleaned = shortenWikipediaUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isWikipediaHost,
    isPostUrl,
    shortenWikipediaUrl,
    shortenUrl: shortenWikipediaUrl,
    needsShortening,
    STORAGE_KEY: 'enabledWikipedia',
    WIKIPEDIA_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.WikipediaLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
