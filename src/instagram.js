// instagram.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Instagram post URLs and cleaning them down to
// the minimum needed to share. Address-bar-only cleanup — no in-page link
// rewriting.
//
// Recognized post forms (all just have the path preserved + everything else
// stripped):
//
//   /p/<shortcode>
//   /reel/<shortcode>
//   /reels/<shortcode>
//   /tv/<shortcode>
//   /stories/<username>/<story-id>
//
// Tracking parameters that get dropped: igsh, igshid, utm_source, utm_medium,
// utm_campaign, taken-by, hl, etc. — the allowlist is empty so anything in
// the query string is stripped. Carousel slide selector `img_index` is
// dropped too: shared links typically open at slide 0, which is what people
// expect when they paste a clean URL.
//
// Loaded as:
//   * a classic content script (sets `window.InstagramLinkShortener`)
//   * a service-worker importScripts target (sets `self.InstagramLinkShortener`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
//
// Keep this file dependency-free so it can run in all three contexts.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const INSTAGRAM_HOST_REGEX = /(?:^|\.)instagram\.com$/i;

  function isInstagramHost(hostname) {
    if (!hostname) return false;
    return INSTAGRAM_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/p\/[^/?#]+\/?$/,
    /^\/reel\/[^/?#]+\/?$/,
    /^\/reels\/[^/?#]+\/?$/,
    /^\/tv\/[^/?#]+\/?$/,
    /^\/stories\/[^/]+\/[^/?#]+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (!isInstagramHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  // Build the clean form. Returns null if `input` isn't an Instagram post URL.
  function shortenInstagramUrl(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
    if (!isInstagramHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    return `${url.protocol}//${url.host}${url.pathname}`;
  }

  function needsShortening(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (!isInstagramHost(url.hostname)) return false;
    const cleaned = shortenInstagramUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isInstagramHost,
    isPostUrl,
    shortenInstagramUrl,
    shortenUrl: shortenInstagramUrl, // uniform name for the dispatcher
    needsShortening,
    STORAGE_KEY: 'enabledSocial',
    INSTAGRAM_HOST_REGEX,
    POST_PATTERNS,
  };

  global.InstagramLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
