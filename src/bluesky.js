// bluesky.js
// ----------------------------------------------------------------------------
// Pure functions for cleaning Bluesky share URLs. Address-bar-only.
//
// Recognized forms:
//
//   /profile/<handle>/post/<rkey>      → post permalink
//   /profile/<handle>/feed/<rkey>      → custom feed page
//   /starter-pack/<handle>/<rkey>      → starter pack share page
//
// <handle> may be a domain handle (user.bsky.social, example.com) or a DID
// (did:plc:abc...), so the segment match is permissive.
//
// Tracking parameters stripped: ref_src, ref_url (embed/share referrers) —
// everything; no query param on these forms carries reader-facing state.
//
// Profile pages (/profile/<handle>) are intentionally NOT recognized —
// landing pages get shared with various intent and we don't second-guess it.
//
// The URL hash is preserved.
//
// Hosts: bsky.app only (the canonical web client).
//
// Loaded as classic content script, service-worker importScripts target, and
// CommonJS module from Node-based unit tests.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  const BLUESKY_HOST_REGEX = /^bsky\.app$/i;

  function isBlueskyHost(hostname) {
    if (!hostname) return false;
    return BLUESKY_HOST_REGEX.test(hostname);
  }

  const POST_PATTERNS = [
    /^\/profile\/[^/]+\/post\/[^/?#]+\/?$/,
    /^\/profile\/[^/]+\/feed\/[^/?#]+\/?$/,
    /^\/starter-pack\/[^/]+\/[^/?#]+\/?$/,
  ];

  function isPostPath(pathname) {
    return POST_PATTERNS.some((p) => p.test(pathname));
  }

  function isPostUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBlueskyHost(url.hostname)) return false;
    return isPostPath(url.pathname);
  }

  function shortenBlueskyUrl(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return null; }
    if (!isBlueskyHost(url.hostname)) return null;
    if (!isPostPath(url.pathname)) return null;
    const hash = url.hash || '';
    return `${url.protocol}//${url.host}${url.pathname}${hash}`;
  }

  function needsShortening(input) {
    let url;
    try { url = typeof input === 'string' ? new URL(input) : input; } catch (_e) { return false; }
    if (!isBlueskyHost(url.hostname)) return false;
    const cleaned = shortenBlueskyUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isBlueskyHost,
    isPostUrl,
    shortenBlueskyUrl,
    shortenUrl: shortenBlueskyUrl,
    needsShortening,
    STORAGE_KEY: 'enabledBluesky',
    BLUESKY_HOST_REGEX,
    POST_PATTERNS,
  };
  global.BlueskyLinkShortener = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
