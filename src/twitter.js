// twitter.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Twitter/X share URLs. Address-bar-only.
//
// X.com and twitter.com are aliases (X kept the legacy domain). Both are
// matched as the same site. mobile.twitter.com is also covered.
//
// Recognized forms:
//
//   /<user>/status/<id>           → strip query + fragment
//   /<user>/statuses/<id>         → legacy — strip
//   /i/web/status/<id>            → tweet-ID-only links
//   /i/spaces/<id>                → Spaces
//   /<user>/communities/<id>      → community pages
//
// Profile pages (/<user>) and search (/search?q=) are intentionally NOT
// recognized — those URLs are usually shared with intent (e.g. ?f=live for
// search filters), and we'd risk stripping the user's intent.
//
// Hosts: twitter.com, x.com, mobile.twitter.com.
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const TWITTER_HOST_REGEX = /(?:^|\.)twitter\.com$/i;
  const X_HOST_REGEX = /(?:^|\.)x\.com$/i;

  function isTwitterHost(hostname) {
    if (!hostname) return false;
    return TWITTER_HOST_REGEX.test(hostname) || X_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/[^/]+\/status\/\d+\/?$/,
    /^\/[^/]+\/statuses\/\d+\/?$/,
    /^\/i\/web\/status\/\d+\/?$/,
    /^\/i\/status\/\d+\/?$/,
    /^\/i\/spaces\/[^/?#]+\/?$/,
    /^\/[^/]+\/communities\/\d+\/?$/,
    // Photo/video sub-pages: /<user>/status/<id>/photo/1, /video/1
    /^\/[^/]+\/status\/\d+\/(?:photo|video)\/\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTwitterHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenTwitterUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isTwitterHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isTwitterHost(url.hostname)) return false;
    const cleaned = shortenTwitterUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isTwitterHost,
    isPostUrl,
    shortenTwitterUrl,
    shortenUrl: shortenTwitterUrl,
    needsShortening,
    STORAGE_KEY: 'enabledTwitter',
    TWITTER_HOST_REGEX,
    X_HOST_REGEX,
    POST_PATTERNS,
  };
  global.TwitterLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
