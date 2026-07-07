// fandom.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Fandom wiki URLs. Address-bar-only.
//
//   <community>.fandom.com/wiki/<Article>          → article page
//   <community>.fandom.com/<lang>/wiki/<Article>   → language-prefixed
//
// Same design as the Wikipedia module: DENYLIST strategy — only known junk
// is stripped (`so` = search-origin attribution, `oldid`? NO — oldid is a
// permalink, never touched — plus utm_*). Everything unrecognized stays.
//
// The URL hash is ALWAYS preserved (section anchors).
//
// Hosts: fandom.com (wildcard community subdomains).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const FANDOM_HOST_REGEX = /(?:^|\.)fandom\.com$/i;

  function isFandomHost(hostname) {
    if (!hostname) return false;
    return FANDOM_HOST_REGEX.test(hostname);
  }

  const ARTICLE_PATH_REGEX = /^(?:\/[a-z]{2}(?:-[a-z]{2,4})?)?\/wiki\/[^?#]+$/i;

  function isArticlePath(pathname) {
    return ARTICLE_PATH_REGEX.test(pathname);
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isFandomHost(url.hostname)) return false;
    return isArticlePath(url.pathname);
  }

  const TRACKING_PARAMS = new Set(['so']);
  const TRACKING_PREFIXES = ['utm_'];

  function isTrackingParam(name) {
    const lower = name.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((p) => lower.startsWith(p));
  }

  function shortenFandomUrl(input) {
    let url;
    // Clone URL-object inputs — we delete params in place below.
    try { url = new URL(typeof input === 'string' ? input : input.href); } catch (_e) { return null; }
    if (!isFandomHost(url.hostname)) return null;
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
    if (!isFandomHost(url.hostname)) return false;
    const cleaned = shortenFandomUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isFandomHost,
    isPostUrl,
    shortenFandomUrl,
    shortenUrl: shortenFandomUrl,
    needsShortening,
    STORAGE_KEY: 'enabledFandom',
    FANDOM_HOST_REGEX,
    TRACKING_PARAMS,
  };
  global.FandomLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
