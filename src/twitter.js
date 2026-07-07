// twitter.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Twitter/X share URLs. Address-bar-only.
//
// X.com and twitter.com are aliases (X kept the legacy domain). Both are
// matched as the same site. mobile.twitter.com is also covered.
//
// Recognized forms:
//
//   /<user>/status/<id>           → strip query, keep hash
//   /<user>/statuses/<id>         → legacy — strip
//   /i/web/status/<id>            → tweet-ID-only links
//   /i/spaces/<id>                → Spaces
//   /<user>/communities/<id>      → community pages
//   /i/lists/<id>                 → list pages
//
// Profile pages (/<user>) and search (/search?q=) are NOT recognized as
// post forms — but a host-scoped FALLBACK denylist still strips the share
// junk X appends everywhere (?s=21&t=<blob>, ref_src, ref_url, mx, cxt)
// while leaving functional params (?q=, ?f=live) untouched.
//
// The URL hash is preserved — Twitter doesn't use hashes for tracking.
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
    /^\/i\/lists\/\d+\/?$/,
    /^\/[^/]+\/communities\/\d+\/?$/,
    // Photo/video sub-pages: /<user>/status/<id>/photo/1, /video/1
    /^\/[^/]+\/status\/\d+\/(?:photo|video)\/\d+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  // Host-scoped share junk, stripped on ANY twitter/x path that isn't a
  // recognized post form. Lowercase; matched case-insensitively.
  const FALLBACK_STRIP = new Set(['s', 't', 'ref_src', 'ref_url', 'mx', 'cxt', 'fbclid', 'gclid']);

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
    if (isPostPath(url.pathname)) {
      const hash = url.hash || '';
      return `${url.protocol}//${url.host}${url.pathname}${hash}`;
    }
    // Unrecognized path — fallback denylist (clone; never mutate).
    const clone = new URL(url.href);
    for (const name of Array.from(clone.searchParams.keys())) {
      const lower = name.toLowerCase();
      if (FALLBACK_STRIP.has(lower) || lower.startsWith('utm_')) {
        clone.searchParams.delete(name);
      }
    }
    const hash = clone.hash || '';
    return `${clone.protocol}//${clone.host}${clone.pathname}${clone.search}${hash}`;
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
    FALLBACK_STRIP,
    TWITTER_HOST_REGEX,
    X_HOST_REGEX,
    POST_PATTERNS,
  };
  global.TwitterLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
