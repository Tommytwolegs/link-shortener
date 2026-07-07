// bandcamp.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Bandcamp URLs. Address-bar-only.
//
//   <artist>.bandcamp.com/album/<slug>   → album page
//   <artist>.bandcamp.com/track/<slug>   → track page
//
// Strips the search/discovery attribution Bandcamp appends (`from=`,
// `search_item_id`, `search_item_type`, `search_match_part`,
// `search_sig`, utm_*) — everything; identity is in host + path.
// Artist custom domains are out of scope (can't be matched by the
// manifest host list — same tradeoff as Substack/Medium).
// Hash preserved. Hosts: bandcamp.com (wildcard artist subdomains).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BANDCAMP_HOST_REGEX = /(?:^|\.)bandcamp\.com$/i;

  function isBandcampHost(hostname) {
    if (!hostname) return false;
    return BANDCAMP_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/album\/[^/?#]+\/?$/,
    /^\/track\/[^/?#]+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBandcampHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenBandcampUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isBandcampHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const query = '';
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${query}${hash}`;
  }


  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBandcampHost(url.hostname)) return false;
    const cleaned = shortenBandcampUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBandcampHost,
    isPostUrl,
    shortenBandcampUrl,
    shortenUrl: shortenBandcampUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBandcamp',
    BANDCAMP_HOST_REGEX,
    POST_PATTERNS,
  };
  global.BandcampLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
