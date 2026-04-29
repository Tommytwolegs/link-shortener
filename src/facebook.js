// facebook.js
// ----------------------------------------------------------------------------
// Pure functions for detecting Facebook post URLs and cleaning them down to
// the minimum needed to share. Address-bar-only cleanup — no in-page link
// rewriting (FB links in feeds carry session-specific tracking that isn't
// useful to share).
//
// Recognized post forms and how each is cleaned:
//
//   /<user-or-page>/posts/<id>          → strip query + fragment
//   /share/p/<id>, /share/v/<id>, etc.  → strip query + fragment
//   /reel/<id>                          → strip query + fragment
//   /groups/<gid>/posts/<id>            → strip query + fragment
//   /watch                              → keep ?v=<id>, drop everything else
//   /photo.php                          → keep ?fbid=<id>&set=<set>
//   /permalink.php                      → keep ?story_fbid=<id>&id=<page-id>
//
// fb.watch short share URLs (`fb.watch/<code>/?...`) are also recognized;
// query/fragment is stripped.
//
// Loaded as:
//   * a classic content script (sets `window.FacebookLinkShortener`)
//   * a service-worker importScripts target (sets `self.FacebookLinkShortener`)
//   * a CommonJS module from Node-based unit tests (`module.exports`)
//
// Keep this file dependency-free so it can run in all three contexts.
// ----------------------------------------------------------------------------

(function (global) {
  'use strict';

  // Match any facebook.com host (incl. www., m., business., touch., mbasic.).
  // Also treat fb.watch (the short share-link host) as a Facebook host.
  const FACEBOOK_HOST_REGEX = /(?:^|\.)facebook\.com$/i;
  const FB_WATCH_HOST_REGEX = /^fb\.watch$/i;

  function isFacebookHost(hostname) {
    if (!hostname) return false;
    return FACEBOOK_HOST_REGEX.test(hostname) || FB_WATCH_HOST_REGEX.test(hostname);
  }

  // Each entry: {pattern, allowedParams}. The pattern decides whether we
  // recognize the URL as a "post-style" page worth cleaning. allowedParams is
  // the set of query parameters to KEEP — anything else is stripped.
  const POST_PATTERNS = [
    // /UserOrPage/posts/<id>  (incl. modern pfbid* IDs)
    { pattern: /^\/[^/]+\/posts\/[^/?#]+\/?$/, allowedParams: new Set() },
    // /share/p/ABC, /share/v/ABC, /share/r/ABC, /share/g/ABC, etc.
    { pattern: /^\/share\/[a-z]+\/[^/?#]+\/?$/i, allowedParams: new Set() },
    // /reel/<id>
    { pattern: /^\/reel\/[^/?#]+\/?$/, allowedParams: new Set() },
    // /groups/<gid>/posts/<id>
    { pattern: /^\/groups\/[^/]+\/posts\/[^/?#]+\/?$/, allowedParams: new Set() },
    // /watch — has the video ID in ?v=. We require v= to be present, so
    // /watch/ alone (the Watch feed homepage) isn't recognized as a post.
    { pattern: /^\/watch\/?$/, allowedParams: new Set(['v']), requiredParams: ['v'] },
    // /photo.php — has fbid (and sometimes set for album context)
    { pattern: /^\/photo\.php\/?$/, allowedParams: new Set(['fbid', 'set']), requiredParams: ['fbid'] },
    // /permalink.php — story-style URLs from older shares
    { pattern: /^\/permalink\.php\/?$/, allowedParams: new Set(['story_fbid', 'id']), requiredParams: ['story_fbid'] },
  ];

  // fb.watch URLs are essentially "/<short-code>" — match anything that's a
  // single non-trivial path segment.
  const FB_WATCH_PATH = /^\/[^/?#]+\/?$/;

  function postSpecFor(hostname, pathname, searchParams) {
    if (FB_WATCH_HOST_REGEX.test(hostname)) {
      if (FB_WATCH_PATH.test(pathname)) return { allowedParams: new Set() };
      return null;
    }
    for (const spec of POST_PATTERNS) {
      if (!spec.pattern.test(pathname)) continue;
      // If this spec needs specific query params to be a post URL (e.g.
      // /watch needs v=), bail out when they're missing.
      if (spec.requiredParams && searchParams) {
        const ok = spec.requiredParams.every((k) => searchParams.has(k) && searchParams.get(k));
        if (!ok) return null;
      }
      return spec;
    }
    return null;
  }

  // Returns true if the URL matches one of the recognized post forms.
  function isPostUrl(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (!isFacebookHost(url.hostname)) return false;
    return !!postSpecFor(url.hostname, url.pathname, url.searchParams);
  }

  // Build the clean form. Returns null if `input` isn't a Facebook post URL.
  function shortenFacebookUrl(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return null;
    }
    if (!isFacebookHost(url.hostname)) return null;
    const spec = postSpecFor(url.hostname, url.pathname, url.searchParams);
    if (!spec) return null;

    const allowed = spec.allowedParams;
    let newSearch = '';
    if (allowed.size > 0) {
      const orig = url.searchParams;
      const params = new URLSearchParams();
      for (const k of allowed) {
        const v = orig.get(k);
        if (v !== null && v !== '') params.set(k, v);
      }
      const s = params.toString();
      if (s) newSearch = '?' + s;
    }
    return `${url.protocol}//${url.host}${url.pathname}${newSearch}`;
  }

  // Returns true if `input` is a Facebook post URL whose canonical form
  // differs from `input`. Used to skip pointless replaceState calls.
  function needsShortening(input) {
    let url;
    try {
      url = typeof input === 'string' ? new URL(input) : input;
    } catch (_e) {
      return false;
    }
    if (!isFacebookHost(url.hostname)) return false;
    const cleaned = shortenFacebookUrl(input);
    if (!cleaned) return false;
    return cleaned !== url.href;
  }

  const api = {
    isFacebookHost,
    isPostUrl,
    shortenFacebookUrl,
    shortenUrl: shortenFacebookUrl, // uniform name for the dispatcher
    needsShortening,
    STORAGE_KEY: 'enabledSocial',
    FACEBOOK_HOST_REGEX,
    FB_WATCH_HOST_REGEX,
    POST_PATTERNS,
  };

  global.FacebookLinkShortener = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
