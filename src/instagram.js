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
// utm_campaign, taken-by, hl, etc. — only the carousel slide selector
// `img_index` is preserved. Without it, a shared "slide 3 of 7" link snaps
// back to slide 1 the moment our cleanup pass runs.
//
// The URL hash is preserved — Instagram doesn't use hashes for tracking.
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

  // Carousel slide selector. Used on /p/ and /reel/ multi-photo posts —
  // Instagram adds ?img_index=N when the user navigates to slide N, and the
  // viewer initializes at that slide on page load. Without preserving it,
  // someone sharing "slide 3 of 7" loses the slide context the moment our
  // cleanup pass strips the param.
  const KEEP_PARAMS = new Set(['img_index']);

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
    const params = new URLSearchParams();
    for (const k of KEEP_PARAMS) {
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
    KEEP_PARAMS,
  };

  global.InstagramLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
